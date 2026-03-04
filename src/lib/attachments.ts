import { supabase } from './supabase'

export type FileType = 'proposal' | 'supporting_document'

export interface DealAttachment {
    id: string
    deal_id: string
    org_id: string
    file_type: FileType
    file_name: string
    storage_path: string
    mime_type: string | null
    size_bytes: number | null
    uploaded_by: string
    created_at: string
}

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/** Validate a file before upload */
export function validateAttachmentFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return 'Only PDF, PNG, and JPG files are allowed.'
    }
    if (file.size > MAX_SIZE_BYTES) {
        return 'File size must be 10 MB or less.'
    }
    return null
}

/** Fetch all attachments for a deal, ordered newest first */
export async function fetchAttachmentsByDeal(dealId: string): Promise<DealAttachment[]> {
    const { data, error } = await supabase
        .from('deal_attachments')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as DealAttachment[]
}

/** Upload a file to Supabase Storage and insert a deal_attachments record */
export async function uploadDealAttachment(
    dealId: string,
    orgId: string,
    uploadedBy: string,
    file: File,
    fileType: FileType = 'proposal'
): Promise<DealAttachment> {
    // Build a unique storage path to avoid collisions
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${dealId}/${timestamp}_${sanitizedName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from('deal-files')
        .upload(storagePath, file, {
            contentType: file.type,
            upsert: false, // never overwrite — version history
        })

    if (uploadError) throw uploadError

    // Insert the metadata record
    const { data, error: insertError } = await supabase
        .from('deal_attachments')
        .insert({
            deal_id: dealId,
            org_id: orgId,
            file_type: fileType,
            file_name: file.name,
            storage_path: storagePath,
            mime_type: file.type,
            size_bytes: file.size,
            uploaded_by: uploadedBy,
        })
        .select()
        .single()

    if (insertError) {
        // Clean up the uploaded file if db insert fails
        await supabase.storage.from('deal-files').remove([storagePath])
        throw insertError
    }

    return data as DealAttachment
}

/** Generate a signed URL for viewing/downloading an attachment (60 min expiry) */
export async function getSignedUrl(storagePath: string, expiresInSecs = 3600): Promise<string> {
    const { data, error } = await supabase.storage
        .from('deal-files')
        .createSignedUrl(storagePath, expiresInSecs)

    if (error) throw error
    return data.signedUrl
}

/** Delete an attachment record and the file from storage */
export async function deleteAttachment(id: string, storagePath: string): Promise<void> {
    const { error: dbError } = await supabase
        .from('deal_attachments')
        .delete()
        .eq('id', id)

    if (dbError) throw dbError

    await supabase.storage.from('deal-files').remove([storagePath])
}

/** Get the latest proposal attachment for a deal (newest created_at) */
export async function getLatestProposal(dealId: string): Promise<DealAttachment | null> {
    const { data, error } = await supabase
        .from('deal_attachments')
        .select('*')
        .eq('deal_id', dealId)
        .eq('file_type', 'proposal')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) throw error
    return data as DealAttachment | null
}

/** Check if a deal has at least one proposal attachment */
export async function dealHasProposal(dealId: string): Promise<boolean> {
    const { count, error } = await supabase
        .from('deal_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('deal_id', dealId)
        .eq('file_type', 'proposal')

    if (error) throw error
    return (count ?? 0) > 0
}

/** Format file size for display */
export function formatFileSize(bytes: number | null): string {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
