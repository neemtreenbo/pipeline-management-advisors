import { supabase } from './supabase'

export type ServiceRequestType =
    | 'BENEFICIARY_CHANGE'
    | 'ADDRESS_CHANGE'
    | 'POLICY_LOAN'
    | 'FUND_WITHDRAWAL'
    | 'PREMIUM_MODE_CHANGE'
    | 'REINSTATEMENT'
    | 'CLAIM'
    | 'POLICY_INQUIRY'
    | 'INQUIRY'
    | 'OTHERS'

export type ServiceRequestStatus =
    | 'New'
    | 'Pending Documents'
    | 'Ready to Submit'
    | 'Submitted'
    | 'In Progress'
    | 'Completed'
    | 'Rejected'

export type ServiceRequestPriority = 'low' | 'medium' | 'high' | 'urgent'

export const SERVICE_REQUEST_TYPES: { value: ServiceRequestType; label: string }[] = [
    { value: 'BENEFICIARY_CHANGE', label: 'Beneficiary Change' },
    { value: 'ADDRESS_CHANGE', label: 'Address Change' },
    { value: 'POLICY_LOAN', label: 'Policy Loan' },
    { value: 'FUND_WITHDRAWAL', label: 'Fund Withdrawal' },
    { value: 'PREMIUM_MODE_CHANGE', label: 'Premium Mode Change' },
    { value: 'REINSTATEMENT', label: 'Reinstatement' },
    { value: 'CLAIM', label: 'Claim' },
    { value: 'POLICY_INQUIRY', label: 'Policy Inquiry' },
    { value: 'INQUIRY', label: 'Inquiry' },
    { value: 'OTHERS', label: 'Others' },
]

export const SERVICE_REQUEST_STATUSES: ServiceRequestStatus[] = [
    'New',
    'Pending Documents',
    'Ready to Submit',
    'Submitted',
    'In Progress',
    'Completed',
    'Rejected',
]

/** Get human-readable label for a service request type */
export function getRequestTypeLabel(value: string): string {
    return SERVICE_REQUEST_TYPES.find(t => t.value === value)?.label ?? value
}

export const SERVICE_REQUEST_PRIORITIES: ServiceRequestPriority[] = [
    'low',
    'medium',
    'high',
    'urgent',
]

export interface ServiceRequest {
    id: string
    org_id: string
    owner_id: string
    client_id: string
    policy_id: string | null
    request_type: ServiceRequestType
    title: string
    description: string | null
    status: ServiceRequestStatus
    priority: ServiceRequestPriority
    requested_by: string | null
    assigned_to: string | null
    closed_at: string | null
    metadata: Record<string, unknown>
    created_at: string
    updated_at: string
    // joined
    client?: { id: string; name: string; email: string | null; profile_picture_url: string | null }
    policy?: { id: string; policy_number: string | null; product: string | null } | null
}

export interface ServiceRequestAttachment {
    id: string
    service_request_id: string
    org_id: string
    file_name: string
    storage_path: string
    mime_type: string | null
    size_bytes: number | null
    file_type: string | null
    uploaded_by: string
    created_at: string
}

export interface NewServiceRequestInput {
    org_id: string
    owner_id: string
    client_id: string
    policy_id?: string | null
    request_type: ServiceRequestType
    title: string
    description?: string
    priority?: ServiceRequestPriority
    requested_by?: string | null
    assigned_to?: string | null
}

/** Fetch all service requests for an org */
export async function fetchServiceRequests(
    orgId: string,
    filters?: { status?: ServiceRequestStatus; request_type?: ServiceRequestType; assigned_to?: string }
): Promise<ServiceRequest[]> {
    let query = supabase
        .from('service_requests')
        .select(`
            *,
            client:clients(id, name, email, profile_picture_url),
            policy:policies(id, policy_number, product)
        `)
        .eq('org_id', orgId)

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.request_type) query = query.eq('request_type', filters.request_type)
    if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to)

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as ServiceRequest[]
}

/** Fetch service requests for a given client */
export async function fetchServiceRequestsByClient(clientId: string): Promise<ServiceRequest[]> {
    const { data, error } = await supabase
        .from('service_requests')
        .select(`
            *,
            client:clients(id, name, email, profile_picture_url),
            policy:policies(id, policy_number, product)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as ServiceRequest[]
}

/** Fetch service requests for a given policy */
export async function fetchServiceRequestsByPolicy(policyId: string): Promise<ServiceRequest[]> {
    const { data, error } = await supabase
        .from('service_requests')
        .select(`
            *,
            client:clients(id, name, email, profile_picture_url),
            policy:policies(id, policy_number, product)
        `)
        .eq('policy_id', policyId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as ServiceRequest[]
}

/** Fetch a single service request by ID */
export async function fetchServiceRequestById(id: string): Promise<ServiceRequest | null> {
    const { data, error } = await supabase
        .from('service_requests')
        .select(`
            *,
            client:clients(id, name, email, profile_picture_url),
            policy:policies(id, policy_number, product)
        `)
        .eq('id', id)
        .maybeSingle()

    if (error) throw error
    return data as ServiceRequest | null
}

/** Create a new service request */
export async function createServiceRequest(input: NewServiceRequestInput): Promise<ServiceRequest> {
    const { data, error } = await supabase
        .from('service_requests')
        .insert({
            org_id: input.org_id,
            owner_id: input.owner_id,
            client_id: input.client_id,
            policy_id: input.policy_id ?? null,
            request_type: input.request_type,
            title: input.title,
            description: input.description ?? null,
            priority: input.priority ?? 'medium',
            requested_by: input.requested_by ?? null,
            assigned_to: input.assigned_to ?? null,
        })
        .select(`
            *,
            client:clients(id, name, email, profile_picture_url),
            policy:policies(id, policy_number, product)
        `)
        .single()

    if (error) throw error
    return data as ServiceRequest
}

/** Update a service request. Auto-sets closed_at when status becomes Completed or Rejected. */
export async function updateServiceRequest(
    id: string,
    updates: Partial<Pick<ServiceRequest, 'client_id' | 'policy_id' | 'request_type' | 'title' | 'description' | 'status' | 'priority' | 'requested_by' | 'assigned_to' | 'metadata'>>
): Promise<void> {
    const patch: Record<string, unknown> = { ...updates }

    if (updates.status === 'Completed' || updates.status === 'Rejected') {
        patch.closed_at = new Date().toISOString()
    } else if (updates.status) {
        patch.closed_at = null
    }

    const { error } = await supabase
        .from('service_requests')
        .update(patch)
        .eq('id', id)

    if (error) throw error
}

/** Delete a service request and all related data (attachments, activities, links) */
export async function deleteServiceRequest(id: string, attachmentStoragePaths?: string[]): Promise<void> {
    // Clean up storage files
    if (attachmentStoragePaths && attachmentStoragePaths.length > 0) {
        await supabase.storage.from('service-request-files').remove(attachmentStoragePaths)
    }
    // Clean up related rows
    await supabase.from('activities').delete().eq('entity_id', id).eq('entity_type', 'service_request')
    await supabase.from('links').delete().or(`from_id.eq.${id},to_id.eq.${id}`)
    // Delete the service request itself
    const { error } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', id)

    if (error) throw error
}

/** Log an activity tied to a service request */
export async function logServiceRequestActivity(
    orgId: string,
    actorId: string,
    serviceRequestId: string,
    eventType: string,
    data: Record<string, unknown> = {}
): Promise<void> {
    await supabase.from('activities').insert({
        org_id: orgId,
        actor_id: actorId,
        entity_type: 'service_request',
        entity_id: serviceRequestId,
        event_type: eventType,
        data,
    })
}

/** Fetch all activities for a service request */
export async function fetchServiceRequestActivities(serviceRequestId: string) {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('entity_type', 'service_request')
        .eq('entity_id', serviceRequestId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
}

// ── Attachments ──────────────────────────────────────────────

const SR_ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
const SR_MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/** Validate a file before upload */
export function validateServiceRequestFile(file: File): string | null {
    if (!SR_ALLOWED_MIME_TYPES.includes(file.type)) {
        return 'Only PDF, PNG, and JPG files are allowed.'
    }
    if (file.size > SR_MAX_SIZE_BYTES) {
        return 'File size must be 10 MB or less.'
    }
    return null
}

/** Fetch all attachments for a service request */
export async function fetchServiceRequestAttachments(serviceRequestId: string): Promise<ServiceRequestAttachment[]> {
    const { data, error } = await supabase
        .from('service_request_attachments')
        .select('*')
        .eq('service_request_id', serviceRequestId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as ServiceRequestAttachment[]
}

/** Upload a file and insert an attachment record */
export async function uploadServiceRequestAttachment(
    serviceRequestId: string,
    orgId: string,
    uploadedBy: string,
    file: File,
    fileType?: string
): Promise<ServiceRequestAttachment> {
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${serviceRequestId}/${timestamp}_${sanitizedName}`

    const { error: uploadError } = await supabase.storage
        .from('service-request-files')
        .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
        })

    if (uploadError) throw uploadError

    const { data, error: insertError } = await supabase
        .from('service_request_attachments')
        .insert({
            service_request_id: serviceRequestId,
            org_id: orgId,
            file_name: file.name,
            storage_path: storagePath,
            mime_type: file.type,
            size_bytes: file.size,
            file_type: fileType ?? null,
            uploaded_by: uploadedBy,
        })
        .select()
        .single()

    if (insertError) {
        await supabase.storage.from('service-request-files').remove([storagePath])
        throw insertError
    }

    return data as ServiceRequestAttachment
}

/** Generate a signed URL for a service request attachment */
export async function getServiceRequestSignedUrl(storagePath: string, expiresInSecs = 3600): Promise<string> {
    const { data, error } = await supabase.storage
        .from('service-request-files')
        .createSignedUrl(storagePath, expiresInSecs)

    if (error) throw error
    return data.signedUrl
}

/** Delete a service request attachment and its file from storage */
export async function deleteServiceRequestAttachment(id: string, storagePath: string): Promise<void> {
    const { error: dbError } = await supabase
        .from('service_request_attachments')
        .delete()
        .eq('id', id)

    if (dbError) throw dbError

    await supabase.storage.from('service-request-files').remove([storagePath])
}
