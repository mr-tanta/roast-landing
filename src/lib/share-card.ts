import sharp from 'sharp'

export interface ShareCardOptions {
  url: string
  score: number
  roast: string
  screenshotBuffer: Buffer
}

export async function generateShareCard(options: ShareCardOptions): Promise<Buffer> {
  const { url, score, roast, screenshotBuffer } = options

  // Optimize and blur the background screenshot
  const backgroundImage = await sharp(screenshotBuffer)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .blur(8)
    .modulate({ brightness: 0.6 })
    .jpeg({ quality: 90 })
    .toBuffer()

  // Score color based on value
  const scoreColor = getScoreColor(score)

  // Create SVG overlay
  const svgOverlay = `
    <svg width="1200" height="630">
      <!-- Gradient overlay -->
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0.7);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.9);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#grad)" />

      <!-- Score badge -->
      <circle cx="600" cy="200" r="80" fill="${scoreColor}" stroke="white" stroke-width="6"/>
      <text x="600" y="230" font-family="Arial, sans-serif" font-size="80" font-weight="bold"
            fill="white" text-anchor="middle">${score}</text>
      <text x="600" y="260" font-family="Arial, sans-serif" font-size="24"
            fill="white" text-anchor="middle" opacity="0.9">/10</text>

      <!-- Roast text -->
      <text x="600" y="350" font-family="Arial, sans-serif" font-size="28" font-weight="600"
            fill="white" text-anchor="middle">
        ${wrapText(roast, 50).map((line, i) =>
          `<tspan x="600" dy="${i === 0 ? 0 : 35}">${escapeXml(line)}</tspan>`
        ).join('')}
      </text>

      <!-- URL -->
      <text x="600" y="520" font-family="Arial, sans-serif" font-size="20"
            fill="white" text-anchor="middle" opacity="0.7">${escapeXml(truncateUrl(url, 60))}</text>

      <!-- Branding -->
      <text x="600" y="580" font-family="Arial, sans-serif" font-size="24" font-weight="bold"
            fill="white" text-anchor="middle">RoastMyLanding.com</text>
      <text x="600" y="605" font-family="Arial, sans-serif" font-size="16"
            fill="white" text-anchor="middle" opacity="0.8">Get your landing page roasted</text>
    </svg>
  `

  // Composite the SVG overlay on top of the background
  const shareCard = await sharp(backgroundImage)
    .composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 95, progressive: true })
    .toBuffer()

  return shareCard
}

function getScoreColor(score: number): string {
  if (score >= 8) return '#10b981' // green
  if (score >= 6) return '#f59e0b' // yellow
  if (score >= 4) return '#f97316' // orange
  return '#ef4444' // red
}

function wrapText(text: string, maxLength: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine) lines.push(currentLine)

  // Limit to 3 lines
  return lines.slice(0, 3)
}

function truncateUrl(url: string, maxLength: number): string {
  try {
    const parsed = new URL(url)
    const display = parsed.hostname + parsed.pathname
    return display.length > maxLength ? display.substring(0, maxLength - 3) + '...' : display
  } catch {
    return url.substring(0, maxLength)
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}