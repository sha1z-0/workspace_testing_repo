import { supabase } from "./supabase"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/gif",
]
const MAX_SIZE = 10 * 1024 * 1024

export type UploadResult = { url: string; name: string; size: number }

export async function uploadFile(
  bucket: "uploads" | "vault",
  folder: string,
  entityId: string,
  file: File,
  userId: string
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPEG, GIF.")
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File too large. Max size: 10MB.")
  }

  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const filePath = `${folder}/${userId}/${entityId}/${timestamp}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { cacheControl: "3600", upsert: false })

  if (uploadError) {
    console.error("Storage upload error:", JSON.stringify(uploadError, Object.getOwnPropertyNames(uploadError)))
    throw new Error(`Failed to upload file to ${bucket} bucket.`)
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return { url: urlData?.publicUrl || filePath, name: file.name, size: file.size }
}

export async function getSignedFileUrl(fileUrl: string, bucket: "uploads" | "vault" = "uploads"): Promise<string | null> {
  try {
    const filePath = fileUrl.split(`/${bucket}/`).pop()
    if (!filePath) return fileUrl
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600)
    if (error) {
      console.error("Error generating signed URL:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
      return null
    }
    return data?.signedUrl || null
  } catch (error) {
    console.error("Error generating signed URL:", error)
    return null
  }
}

export async function downloadFile(fileUrl: string, fileName: string, bucket: "uploads" | "vault" = "uploads"): Promise<void> {
  try {
    const signedUrl = await getSignedFileUrl(fileUrl, bucket)
    if (!signedUrl) throw new Error("Failed to generate signed URL.")

    const response = await fetch(signedUrl)
    if (!response.ok) throw new Error(`Download failed: ${response.status}`)
    const blob = await response.blob()

    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = blobUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error("Download failed:", error)
    throw error
  }
}
