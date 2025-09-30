import { createHash, randomBytes, createCipher, createDecipher } from 'crypto';
import { promisify } from 'util';
import { resolve4 } from 'dns';

const dnsResolve = promisify(resolve4);

export class SecurityManager {
  // Content Security Policy
  static getCSP() {
    return {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", "https://js.stripe.com"],
        upgradeInsecureRequests: true
      }
    };
  }

  // Input sanitization
  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      
      // Block internal IPs and localhost
      const blockedPatterns = [
        /^localhost$/i,
        /^127\./,
        /^192\.168\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^0\./,
        /^169\.254\./,
        /^::1$/,
        /^fe80:/i,
        /^fc00:/i,
        /^fd00:/i
      ];
      
      if (blockedPatterns.some(pattern => pattern.test(parsed.hostname))) {
        throw new Error('Internal network URLs are not allowed');
      }
      
      // Only allow HTTP(S)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP(S) URLs are allowed');
      }
      
      // Block suspicious ports
      const blockedPorts = ['22', '23', '25', '53', '80', '110', '143', '993', '995'];
      if (parsed.port && blockedPorts.includes(parsed.port)) {
        // Allow common web ports
        if (!['80', '443', '8080', '8443'].includes(parsed.port)) {
          throw new Error('Port not allowed');
        }
      }
      
      // Remove tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', '_ga', '_gid', 'mc_cid', 'mc_eid'
      ];
      
      trackingParams.forEach(param => {
        parsed.searchParams.delete(param);
      });
      
      return parsed.toString();
    } catch (error) {
      throw new Error('Invalid URL provided');
    }
  }

  // HTML sanitization
  static sanitizeHTML(html: string): string {
    // Basic HTML sanitization - in production, use a proper library like DOMPurify
    const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br'];
    const allowedAttributes = ['href'];
    
    // Remove script tags and event handlers
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/javascript:/gi, '');
    
    // For production, use a proper HTML sanitizer
    return sanitized;
  }

  // SSRF protection
  static async validateExternalUrl(url: string): Promise<boolean> {
    try {
      const parsed = new URL(url);
      
      // DNS resolution check
      const addresses = await dnsResolve(parsed.hostname);
      
      // Check if any resolved IP is internal
      const internalRanges = [
        { start: this.ip2long('10.0.0.0'), end: this.ip2long('10.255.255.255') },
        { start: this.ip2long('172.16.0.0'), end: this.ip2long('172.31.255.255') },
        { start: this.ip2long('192.168.0.0'), end: this.ip2long('192.168.255.255') },
        { start: this.ip2long('127.0.0.0'), end: this.ip2long('127.255.255.255') },
        { start: this.ip2long('169.254.0.0'), end: this.ip2long('169.254.255.255') },
        { start: this.ip2long('0.0.0.0'), end: this.ip2long('0.255.255.255') }
      ];
      
      for (const address of addresses) {
        const longIp = this.ip2long(address);
        for (const range of internalRanges) {
          if (longIp >= range.start && longIp <= range.end) {
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('DNS validation failed:', error);
      return false;
    }
  }

  private static ip2long(ip: string): number {
    return ip.split('.').reduce((acc, octet) => acc * 256 + parseInt(octet), 0);
  }

  // Rate limiting key generation
  static getRateLimitKey(identifier: string, endpoint: string): string {
    return `rate_limit:${endpoint}:${createHash('sha256').update(identifier).digest('hex').substring(0, 16)}`;
  }

  // Input validation
  static validateRoastRequest(body: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!body) {
      errors.push('Request body is required');
      return { isValid: false, errors };
    }
    
    if (!body.url || typeof body.url !== 'string') {
      errors.push('URL is required and must be a string');
    } else {
      try {
        new URL(body.url);
      } catch {
        errors.push('URL must be valid');
      }
    }
    
    if (body.forceRefresh !== undefined && typeof body.forceRefresh !== 'boolean') {
      errors.push('forceRefresh must be a boolean');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Encryption utilities
  static encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = randomBytes(16);
    
    const cipher = createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
      
      const decipher = createDecipher(algorithm, key);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  // Generate secure tokens
  static generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  // Hash sensitive data
  static hashSensitiveData(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  // Validate JWT token structure (basic)
  static isValidJWTStructure(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  // Check if request is from allowed origin
  static isAllowedOrigin(origin: string): boolean {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  }

  // Generate request fingerprint for security monitoring
  static generateRequestFingerprint(event: any): string {
    const fingerprint = {
      ip: event.requestContext?.identity?.sourceIp,
      userAgent: event.headers?.['User-Agent'] || event.headers?.['user-agent'],
      timestamp: Date.now()
    };
    
    return createHash('sha256')
      .update(JSON.stringify(fingerprint))
      .digest('hex')
      .substring(0, 16);
  }

  // Check for suspicious patterns
  static detectSuspiciousActivity(body: any, headers: any): boolean {
    // Check for SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+set/i
    ];
    
    const bodyStr = JSON.stringify(body).toLowerCase();
    if (sqlPatterns.some(pattern => pattern.test(bodyStr))) {
      return true;
    }
    
    // Check for XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      /onload=/i
    ];
    
    if (xssPatterns.some(pattern => pattern.test(bodyStr))) {
      return true;
    }
    
    // Check for suspicious user agents
    const suspiciousAgents = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /hack/i,
      /exploit/i
    ];
    
    const userAgent = headers['User-Agent'] || headers['user-agent'] || '';
    if (suspiciousAgents.some(pattern => pattern.test(userAgent))) {
      return true;
    }
    
    return false;
  }

  // Validate file upload (for future use)
  static validateFileUpload(filename: string, mimetype: string, size: number): { isValid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(mimetype)) {
      return { isValid: false, error: 'File type not allowed' };
    }
    
    if (size > maxSize) {
      return { isValid: false, error: 'File too large' };
    }
    
    // Check for suspicious filenames
    const suspiciousPatterns = [
      /\.\./,
      /\//,
      /\\/,
      /\0/,
      /\.php$/i,
      /\.js$/i,
      /\.html$/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(filename))) {
      return { isValid: false, error: 'Invalid filename' };
    }
    
    return { isValid: true };
  }
}