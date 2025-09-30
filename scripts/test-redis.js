#!/usr/bin/env node

/**
 * Redis Connectivity Test Script for RoastMyLanding
 * Tests connection to the custom Redis server and basic cache operations
 */

require('dotenv').config({ path: '.env.local' })
const Redis = require('ioredis')

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || '50.19.30.7',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '4'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectionName: 'roastmylanding-test',
}

async function testRedisConnection() {
  console.log('🔧 Testing Redis Connection for RoastMyLanding...')
  console.log(`📍 Connecting to: ${REDIS_CONFIG.host}:${REDIS_CONFIG.port} (DB: ${REDIS_CONFIG.db})`)
  
  const redis = new Redis(REDIS_CONFIG)
  
  try {
    // Test 1: Basic connection
    console.log('\n1️⃣ Testing basic connection...')
    const start = Date.now()
    const pong = await redis.ping()
    const latency = Date.now() - start
    console.log(`✅ Connection successful! Response: ${pong} (${latency}ms)`)
    
    // Test 2: Set operation
    console.log('\n2️⃣ Testing SET operation...')
    const testKey = 'roastmylanding:test:' + Date.now()
    const testValue = { test: true, timestamp: Date.now() }
    await redis.setex(testKey, 60, JSON.stringify(testValue))
    console.log(`✅ SET successful for key: ${testKey}`)
    
    // Test 3: Get operation
    console.log('\n3️⃣ Testing GET operation...')
    const retrieved = await redis.get(testKey)
    const parsed = JSON.parse(retrieved)
    console.log(`✅ GET successful! Retrieved:`, parsed)
    
    // Test 4: Cache layers simulation
    console.log('\n4️⃣ Testing cache layers...')
    const hotKey = 'hot:test:' + Date.now()
    const warmKey = 'warm:test:' + Date.now()
    const coldKey = 'cold:test:' + Date.now()
    
    await redis.setex(hotKey, 300, JSON.stringify({ layer: 'hot', ttl: 300 }))
    await redis.setex(warmKey, 3600, JSON.stringify({ layer: 'warm', ttl: 3600 }))
    await redis.setex(coldKey, 86400, JSON.stringify({ layer: 'cold', ttl: 86400 }))
    
    console.log(`✅ Cache layers set successfully`)
    
    // Test 5: Keys pattern matching
    console.log('\n5️⃣ Testing pattern matching...')
    const keys = await redis.keys('*test*')
    console.log(`✅ Found ${keys.length} test keys`)
    
    // Test 6: Cleanup
    console.log('\n6️⃣ Cleaning up test data...')
    if (keys.length > 0) {
      await redis.del(...keys)
      console.log(`✅ Cleaned up ${keys.length} test keys`)
    }
    
    // Test 7: Database info
    console.log('\n7️⃣ Getting Redis info...')
    const info = await redis.info('memory')
    const memoryLines = info.split('\n').filter(line => 
      line.includes('used_memory_human') || 
      line.includes('used_memory_peak_human') ||
      line.includes('maxmemory_human')
    )
    console.log('📊 Memory usage:', memoryLines.join(' | '))
    
    console.log('\n🎉 All Redis tests passed successfully!')
    console.log('🔗 Redis server is ready for RoastMyLanding caching')
    
  } catch (error) {
    console.error('\n❌ Redis test failed:', error.message)
    console.error('🔧 Check your Redis configuration:')
    console.error('   - Host:', REDIS_CONFIG.host)
    console.error('   - Port:', REDIS_CONFIG.port)
    console.error('   - Database:', REDIS_CONFIG.db)
    console.error('   - Password: [CONFIGURED]')
    process.exit(1)
  } finally {
    await redis.disconnect()
    console.log('\n🔌 Redis connection closed')
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testRedisConnection().catch(error => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })
}

module.exports = { testRedisConnection, REDIS_CONFIG }