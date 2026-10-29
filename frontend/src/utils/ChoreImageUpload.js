import imageCompression from 'browser-image-compression'

import { apiClient } from './ApiClient'
import { resolvePhotoURL } from './Helpers'

// Compresses a picture and uploads it for a chore text. Without a saved entity
// yet, it goes up as a draft tied to draftId; the backend promotes drafts to
// the real entity when the chore is created. Returns { status } on failure,
// or { status, path, url } where path is the stable storage key and url a
// displayable signed URL.
export const uploadChoreImage = async (
  file,
  { draftId, entityId, entityType },
) => {
  const compressedFile = await imageCompression(file, {
    maxSizeMB: entityType === 'profile' ? 0.5 : 1,
    maxWidthOrHeight: entityType === 'profile' ? 320 : 1200,
    useWebWorker: true,
    fileType: 'image/jpeg',
  })
  // A .jpg name so it is treated as JPEG
  const compressedJpegFile = new File(
    [compressedFile],
    `${file.name.split('.')[0]}.jpg`,
    { type: 'image/jpeg' },
  )

  const formData = new FormData()
  formData.append('file', compressedJpegFile)
  if (entityId) {
    formData.append('entityId', String(entityId))
    formData.append('entityType', entityType)
  } else if (draftId) {
    formData.append('entityType', `${entityType}_draft`)
    formData.append('draftId', draftId)
  } else {
    formData.append('entityType', entityType)
  }

  const response = await apiClient.upload('/assets/chore', formData)
  if (!response.ok) return { status: response.status }
  const data = await response.json()
  return {
    status: response.status,
    path: data.path,
    url: resolvePhotoURL(data.sign || data.url),
  }
}

// Tells the person why an upload was refused.
export const showUploadError = (status, showError, t) => {
  const keys = {
    507: ['quotaTitle', 'quotaMessage'],
    413: ['tooLargeTitle', 'tooLargeMessage'],
    403: ['deniedTitle', 'deniedMessage'],
  }
  const [title, message] = keys[status] || ['failedTitle', 'failedMessage']
  showError({
    title: t(`common:upload.${title}`),
    message: t(`common:upload.${message}`),
  })
}

// Opens the picture picker (the camera on phones offers itself) and calls
// onFile with the chosen file. Must run from a tap, or browsers block it.
export const pickImage = onFile => {
  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.setAttribute('accept', 'image/*')
  input.onchange = () => {
    const file = input.files[0]
    if (file) onFile(file)
  }
  input.click()
}
