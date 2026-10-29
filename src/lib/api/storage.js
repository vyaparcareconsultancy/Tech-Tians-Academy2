import { supabase, isDemoMode } from '../supabase.js'

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB in bytes
export const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'pptx', 'zip', 'png', 'jpg', 'jpeg', 'webp']
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'image/webp',
]

/**
 * Validates file size (max 50 MB) and allowed file types.
 * @throws {Error} if invalid
 */
export function validateFile(file) {
  if (!file) {
    throw new Error('Please select a file to upload.')
  }
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    throw new Error(`File size (${sizeMB} MB) exceeds the 50 MB limit.`)
  }
  const nameParts = file.name ? file.name.split('.') : []
  const ext = nameParts.length > 1 ? nameParts.pop().toLowerCase() : ''
  const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext)
  const isMimeAllowed = file.type ? ALLOWED_MIME_TYPES.includes(file.type) : false

  if (!isExtAllowed && !isMimeAllowed) {
    throw new Error(`File type .${ext || 'unknown'} is not supported. Allowed formats: PDF, DOCX, PPTX, ZIP, PNG, JPG, WEBP.`)
  }
}

/**
 * Uploads a file to a Supabase Storage bucket.
 * In demo mode, validates and returns a mock path, simulating progress.
 *
 * @param {string} bucket - 'materials' | 'submissions' | 'avatars'
 * @param {string} path - storage object path (e.g. materials/<course_id>/<file>)
 * @param {File} file - Browser File instance
 * @param {(progress: number) => void} [onProgress] - Optional progress callback (0-100)
 * @returns {Promise<{ path: string, isMock?: boolean }>}
 */
export async function upload(bucket, path, file, onProgress) {
  validateFile(file)

  if (onProgress) onProgress(10)

  if (isDemoMode || !supabase) {
    if (onProgress) {
      onProgress(50)
      await new Promise((r) => setTimeout(r, 200))
      onProgress(100)
    }
    return { path, isMock: true }
  }

  let progressInterval = null
  if (onProgress) {
    let p = 20
    progressInterval = setInterval(() => {
      p = Math.min(p + 15, 90)
      onProgress(p)
    }, 150)
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })
    if (error) throw error
    if (onProgress) onProgress(100)
    return { path: data?.path || path, isMock: false }
  } finally {
    if (progressInterval) clearInterval(progressInterval)
  }
}

/**
 * Generates a signed URL for reading a private object.
 *
 * @param {string} bucket - bucket name ('materials' | 'submissions')
 * @param {string} path - storage path
 * @param {number} [expiresIn=3600] - lifetime in seconds (default: 1 hour)
 * @returns {Promise<string>}
 */
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  if (!path) return ''
  if (isDemoMode || !supabase) {
    return ''
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data?.signedUrl || ''
}

/**
 * Removes an object from a storage bucket.
 *
 * @param {string} bucket
 * @param {string | string[]} path
 */
export async function remove(bucket, path) {
  if (!path) return
  if (isDemoMode || !supabase) return

  const paths = Array.isArray(path) ? path : [path]
  const { error } = await supabase.storage.from(bucket).remove(paths)
  if (error) throw error
}

/**
 * Gets the public URL for objects in public buckets (e.g. avatars).
 *
 * @param {string} bucket
 * @param {string} path
 * @returns {string}
 */
export function getPublicUrl(bucket, path) {
  if (!path) return ''
  if (isDemoMode || !supabase) return ''

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl || ''
}

export const storageApi = {
  upload,
  getSignedUrl,
  remove,
  getPublicUrl,
  validateFile,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
}
