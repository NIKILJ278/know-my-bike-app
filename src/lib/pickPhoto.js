import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

/**
 * Opens the device's native "Take Photo / Choose from Gallery" prompt on
 * Android/iOS (requesting camera/photos permission the first time it's
 * used), and falls back to a plain <input type="file"> when running in a
 * regular browser (e.g. local dev, or the web preview).
 *
 * Resolves to a File object either way, so callers can upload it to
 * Supabase storage without caring which path was taken.
 */
export async function pickPhoto({ allowCamera = true } = {}) {
  if (Capacitor.isNativePlatform()) {
    const photo = await Camera.getPhoto({
      quality: 82,
      resultType: CameraResultType.Uri,
      source: allowCamera ? CameraSource.Prompt : CameraSource.Photos,
      promptLabelHeader: 'Add a photo',
      promptLabelPhoto: 'Choose from Gallery',
      promptLabelPicture: 'Take Photo',
    })
    const res = await fetch(photo.webPath)
    const blob = await res.blob()
    const ext = (photo.format || 'jpg').toLowerCase()
    return new File([blob], `photo-${Date.now()}.${ext}`, { type: blob.type || `image/${ext}` })
  }

  // Browser fallback — triggers the OS file picker via a hidden input.
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      file ? resolve(file) : reject(new Error('No photo selected'))
    }
    input.click()
  })
}
