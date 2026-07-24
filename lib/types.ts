// Database type definitions for Supabase
// This file defines the TypeScript types for your database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          uid: string
          name: string
          email: string
          role: 'EMPLOYEE' | 'LEAD' | 'C_LEVEL' | 'CEO'
          department: string
          status: 'active' | 'inactive' | 'suspended'
          email_verified: boolean
          avatar: string | null
          created_at: string
          last_active: string
        }
        Insert: {
          id?: string
          uid: string
          name: string
          email: string
          role: 'EMPLOYEE' | 'LEAD' | 'C_LEVEL' | 'CEO'
          department: string
          status?: 'active' | 'inactive' | 'suspended'
          email_verified?: boolean
          avatar?: string | null
          created_at?: string
          last_active?: string
        }
        Update: {}
          Relationships: any[]
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string
          status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
          progress: number
          start_date: string
          end_date: string | null
          lead_id: string
          lead_name: string | null
          team_members: string[]
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
          progress?: number
          start_date: string
          end_date?: string | null
          lead_id: string
          lead_name?: string | null
          team_members?: string[]
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {}
          Relationships: any[]
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string
          status: 'todo' | 'in_progress' | 'pending_review' | 'pending_completion_review' | 'completed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          progress: number
          due_date: string | null
          due_datetime: string | null
          start_date: string | null
          assignee_id: string | null
          assignee_name: string | null
          assignee_ids: string[] | null
          assignee_names: string[] | null
          viewer_ids: string[] | null
          viewer_names: string[] | null
          project_id: string | null
          project_name: string | null
          created_at: string
          updated_at: string
          created_by: string
          created_by_name: string
          assigned_by: string | null
          assigned_by_name: string | null
          submission_open: boolean
          submission_status: string
          submission_file_url: string | null
          submission_file_name: string | null
          submission_file_size: number | null
          approved_at: string | null
          approved_by: string | null
          notified: boolean
          is_phased: boolean
          review_notes: string | null
          review_assigner_notes: string | null
          review_progress: number | null
          review_assigner_file_url: string | null
          review_assigner_file_name: string | null
          review_assigner_file_size: number | null
        }
        Insert: {
          id?: string
          title: string
          description?: string
          status?: 'todo' | 'in_progress' | 'pending_review' | 'pending_completion_review' | 'completed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          progress?: number
          due_date?: string | null
          due_datetime?: string | null
          start_date?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          assignee_ids?: string[] | null
          assignee_names?: string[] | null
          viewer_ids?: string[] | null
          viewer_names?: string[] | null
          project_id?: string | null
          project_name?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          created_by_name?: string
          assigned_by?: string | null
          assigned_by_name?: string | null
          submission_open?: boolean
          submission_status?: string
          submission_file_url?: string | null
          submission_file_name?: string | null
          submission_file_size?: number | null
          approved_at?: string | null
          approved_by?: string | null
          notified?: boolean
          is_phased?: boolean
          review_notes?: string | null
          review_assigner_notes?: string | null
          review_progress?: number | null
        }
        Update: {}
          Relationships: any[]
      }
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          priority: 'low' | 'medium' | 'high'
          author_id: string
          author_name: string
          department: string | null
          read_by: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          priority?: 'low' | 'medium' | 'high'
          author_id: string
          author_name: string
          department?: string | null
          read_by?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {}
          Relationships: any[]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          type: string
          link_to: string | null
          related_item_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body: string
          type: string
          link_to?: string | null
          related_item_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {}
          Relationships: any[]
      }
      chat_messages: {
        Row: {
          id: string
          text: string
          sender_id: string
          sender_name: string | null
          sender_avatar: string | null
          recipient_id: string | null
          group_id: string | null
          is_read: boolean
          attachments: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          text: string
          sender_id: string
          sender_name?: string | null
          sender_avatar?: string | null
          recipient_id?: string | null
          group_id?: string | null
          is_read?: boolean
          attachments?: Json | null
          created_at?: string
        }
        Update: {}
          Relationships: any[]
      }
      chat_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          members: string[]
          created_by: string
          avatar: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          members: string[]
          created_by: string
          avatar?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {}
          Relationships: any[]
      }
      calendar_events: {
        Row: {
          id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          location: string | null
          event_type: 'event' | 'meeting'
          organizer_id: string
          organizer_name: string | null
          organizer_email: string | null
          attendees: string[]
          invited_member_ids: string[]
          send_calendar_invite: boolean
          send_email_reminder: boolean
          add_to_google_calendar: boolean
          notify_on_dashboard: boolean
          meeting_link: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          location?: string | null
          event_type: 'event' | 'meeting'
          organizer_id: string
          organizer_name?: string | null
          organizer_email?: string | null
          attendees?: string[]
          invited_member_ids?: string[]
          send_calendar_invite?: boolean
          send_email_reminder?: boolean
          add_to_google_calendar?: boolean
          notify_on_dashboard?: boolean
          meeting_link?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {}
          Relationships: any[]
      }
      warnings: {
        Row: {
          id: string
          user_id: string
          user_name: string
          issuer_id: string
          issuer_name: string
          title: string
          description: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          status: 'active' | 'resolved' | 'dismissed'
          department_id: string | null
          department_name: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_name: string
          issuer_id: string
          issuer_name: string
          title: string
          description: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          status?: 'active' | 'resolved' | 'dismissed'
          department_id?: string | null
          department_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {}
          Relationships: any[]
      }
      time_tracking: {
        Row: {
          id: string
          user_id: string
          user_name: string
          user_role: string
          start_time: string
          end_time: string | null
          duration: number
          is_active: boolean
          device: Json | null
          auto_ended: boolean | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          user_name: string
          user_role: string
          start_time?: string
          end_time?: string | null
          duration?: number
          is_active?: boolean
          device?: Json | null
          auto_ended?: boolean | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {}
          Relationships: any[]
      }
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          head_id: string | null
          head_name: string | null
          member_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          head_id?: string | null
          head_name?: string | null
          member_count?: number
          created_at?: string
        }
        Update: {}
          Relationships: any[]
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string
          department: string
          leader_id: string | null
          members: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          department: string
          leader_id?: string | null
          members?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {}
          Relationships: any[]
      }
      vault_items: {
        Row: {
          id: string
          title: string
          category: 'document' | 'api_key' | 'password' | 'other'
          description: string | null
          text_value: string | null
          file_url: string | null
          file_name: string | null
          file_size: number | null
          created_by: string
          created_by_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          category: 'document' | 'api_key' | 'password' | 'other'
          description?: string | null
          text_value?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          created_by: string
          created_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {}
          Relationships: any[]
      }
      task_milestones: {
        Row: {
          id: string
          task_id: string
          title: string
          description: string | null
          order_index: number
          weight: number
          status: 'not_started' | 'in_progress' | 'pending_review' | 'needs_revision' | 'approved'
            submission_open: boolean
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          title: string
          description?: string | null
          order_index: number
          weight?: number
          status?: 'not_started' | 'in_progress' | 'pending_review' | 'needs_revision' | 'approved'
            submission_open?: boolean
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {}
          Relationships: any[]
      }
      milestone_reviews: {
        Row: {
          id: string
          milestone_id: string
          comment: string | null
          decision: 'approved' | 'rejected' | null
          employee_file_url: string | null
          employee_file_name: string | null
          employee_file_size: number | null
          reviewer_file_url: string | null
          reviewer_file_name: string | null
          reviewer_file_size: number | null
          reviewer_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          milestone_id: string
          comment?: string | null
          decision?: 'approved' | 'rejected' | null
          employee_file_url?: string | null
          employee_file_name?: string | null
          employee_file_size?: number | null
          reviewer_file_url?: string | null
          reviewer_file_name?: string | null
          reviewer_file_size?: number | null
          reviewer_id?: string | null
          created_at?: string
        }
        Update: {}
          Relationships: any[]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
