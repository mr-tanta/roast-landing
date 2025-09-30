import { put } from '@vercel/blob'

export async function uploadImage(buffer: Buffer, filename: string): Promise<string> {
  try {
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/jpeg',
    })

    return blob.url
  } catch (error) {
    console.error('Upload error:', error)
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