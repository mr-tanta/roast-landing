import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'

// Initialize AWS clients
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
})

const cloudFrontClient = new CloudFrontClient({
  region: process.env.AWS_REGION || 'us-east-1',
})

const S3_BUCKET = process.env.S3_BUCKET || 'roastmylanding-screenshots-prod'
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'd1234567890abc.cloudfront.net'
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID || 'E1SODPIQ8Y9GOM'

// Function to invalidate CloudFront cache for specific paths
async function invalidateCloudFrontCache(paths: string[]): Promise<void> {
  try {
    const command = new CreateInvalidationCommand({
      DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `roast-invalidation-${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    })

    const result = await cloudFrontClient.send(command)
    console.log('CloudFront cache invalidated:', result.Invalidation?.Id)
  } catch (error) {
    console.error('CloudFront invalidation error:', error)
    // Don't throw error - cache invalidation failure shouldn't break uploads
  }
}

export async function uploadImage(buffer: Buffer, filename: string): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: 'image/jpeg',
    })

    await s3Client.send(command)
    
    // Invalidate CloudFront cache for the new file
    await invalidateCloudFrontCache([`/${filename}`])
    
    // Return CloudFront URL for better performance
    return `https://${CLOUDFRONT_DOMAIN}/${filename}`
  } catch (error) {
    console.error('S3 upload error:', error)
    throw new Error('Failed to upload image')
  }
}

export async function uploadScreenshots(
  desktopBuffer: Buffer,
  mobileBuffer: Buffer,
  roastId: string
): Promise<{ desktop: string; mobile: string }> {
  const [desktopUrl, mobileUrl] = await Promise.all([
    uploadImage(desktopBuffer, `screenshots/${roastId}/desktop.jpg`),
    uploadImage(mobileBuffer, `screenshots/${roastId}/mobile.jpg`),
  ])

  return {
    desktop: desktopUrl,
    mobile: mobileUrl,
  }
}

export async function uploadShareCard(buffer: Buffer, roastId: string): Promise<string> {
  return uploadImage(buffer, `share-cards/${roastId}.jpg`)
}
