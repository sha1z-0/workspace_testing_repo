// Legacy type mappings for backward compatibility
// These types map the old Firebase types to Supabase database types
import type { Database } from './types'

// Extract table types from Database
type Tables = Database['public']['Tables']

// User types
export type FirebaseUser = Tables['users']['Row'] & {
  uid: string // Alias for id
}

// Task types
export type FirebaseTask = Tables['tasks']['Row'] & {
  // CamelCase aliases set by API layer
  assigneeIds?: string[] | null
  assigneeNames?: string[] | null
  viewerIds?: string[] | null
  viewerNames?: string[] | null
  assigneeId?: string | null
  assigneeName?: string | null
  projectId?: string | null
  projectName?: string | null
  dueDate?: string | null
  dueDatetime?: string | null
  startDate?: string | null
  createdBy?: string
  createdByName?: string
  assignedBy?: string | null
  assignedByName?: string | null
  submissionStatus?: string
  submissionOpen?: boolean
  submissionFileUrl?: string | null
  submissionFileName?: string | null
  submissionFileSize?: number | null
  approvedAt?: string | null
  approvedBy?: string | null
  reviewNotes?: string | null
  reviewAssignerNotes?: string | null
  reviewProgress?: number | null
  reviewAssignerFileUrl?: string | null
  reviewAssignerFileName?: string | null
  reviewAssignerFileSize?: number | null
  isPhased?: boolean
  createdAt?: string
  updatedAt?: string
}

// Project types
export type FirebaseProject = Tables['projects']['Row']

// Announcement types
export type FirebaseAnnouncement = Tables['announcements']['Row']

// Notification types
export type FirebaseNotification = Tables['notifications']['Row']

// Warning types
export type FirebaseWarning = Tables['warnings']['Row']

// Chat message types
export type FirebaseChatMessage = Tables['chat_messages']['Row']

// Chat group types
export type FirebaseChatGroup = Tables['chat_groups']['Row']

// Calendar event types
export type FirebaseCalendarEvent = Tables['calendar_events']['Row']

// Department types
export type FirebaseDepartment = Tables['departments']['Row']

// Team types
export type FirebaseTeam = Tables['teams']['Row']

// Time tracking types
export type FirebaseTimeTracking = Tables['time_tracking']['Row']

// Helper type for items with id
export type WithId<T> = T & { id: string }

// Vault item types
export type VaultItem = Tables['vault_items']['Row'] & {
  createdByName?: string | null
}
