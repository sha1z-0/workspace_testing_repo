// API for Finova Workspace using Supabase
import { supabase } from "./supabase"
import { uploadFile, getSignedFileUrl as getSignedUrl } from "./file-utils"
import type { Database } from "./types"

// Type helpers
type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Authentication API
export const authAPI = {
  // Login with email and password
  login: async (email: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("Login failed - no user returned")
      }

      // Get additional user data from database
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("uid", authData.user.id)
        .single()

      if (userError || !userData) {
        // User exists in Auth but not in database
        console.error("User not found in database:", userError)
        return {
          needsOnboarding: true,
          authUser: {
            uid: authData.user.id,
            email: authData.user.email,
          },
        }
      }

      console.log("Login successful - User data:", {
        id: userData.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      })

      return {
        user: {
          id: userData.uid,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          avatar: userData.avatar,
        },
      }
    } catch (error: any) {
      console.error("Login error:", error)
      throw new Error(error.message || "Login failed")
    }
  },

  // Check if user is logged in
  checkSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        return { authenticated: false }
      }

      // Get additional user data from database
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("uid", session.user.id)
        .single()

      if (userError || !userData) {
        return { authenticated: false }
      }

      return {
        authenticated: true,
        user: {
          id: userData.uid,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          avatar: userData.avatar,
        },
      }
    } catch (error) {
      console.error("Session check error:", error)
      return { authenticated: false }
    }
  },

  // Logout user
  logout: async () => {
    try {
      console.log("authAPI.logout: Starting signOut...")
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("authAPI.logout: signOut error:", error)
        throw error
      }
      console.log("authAPI.logout: signOut successful")
    } catch (error) {
      console.error("authAPI.logout: Exception during signOut:", error)
      throw error
    }
  },
}

// Users API
export const usersAPI = {
  // Get all users with optional filters
  getAll: async (filters?: { role?: string; department?: string; search?: string }): Promise<Tables<'users'>[]> => {
    try {
      let query = supabase.from("users").select("*")

      if (filters) {
        if (filters.role && filters.role !== "all") {
          query = query.eq("role", filters.role)
        }

        if (filters.department && filters.department !== "all") {
          query = query.eq("department", filters.department)
        }

        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error("Error getting users:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      return data || []
    } catch (error: any) {
      console.error("Error getting users:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      })
      throw error
    }
  },

  // Get user by ID
  getUser: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("uid", id)
        .single()

      if (error) throw error
      if (!data) throw new Error("User not found")

      return {
        id: data.id,
        ...data,
      }
    } catch (error) {
      console.error("Error getting user:", error)
      throw error
    }
  },

  // Find users by email addresses
  findUsersByEmails: async (emails: string[]) => {
    try {
      if (!emails || emails.length === 0) {
        return []
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, uid, email, name")
        .in("email", emails)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error finding users by email:", error)
      return []
    }
  },

  // Update user
  updateUser: async (id: string, data: {
    name?: string
    role?: string
    department?: string
    status?: string
  }) => {
    try {
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: id,
          ...data
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      const result = await response.json()
      return result.user
    } catch (error: any) {
      console.error("Error updating user:", error)
      throw error
    }
  },

  // Delete user
  deleteUser: async (id: string) => {
    try {
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }

      return true
    } catch (error: any) {
      console.error("Error deleting user:", error)
      throw error
    }
  },
}

// Projects API
export const projectsAPI = {
  getAll: async (filters?: { status?: string; leadId?: string; search?: string }) => {
    try {
      let query = supabase.from("projects").select("*").order("created_at", { ascending: false })

      if (filters) {
        if (filters.status) {
          query = query.eq("status", filters.status)
        }
        if (filters.leadId) {
          query = query.eq("lead_id", filters.leadId)
        }
        if (filters.search) {
          query = query.ilike("name", `%${filters.search}%`)
        }
      }

      const { data, error } = await query

      if (error) throw error
      
      // Map snake_case to camelCase for frontend
      const projects = (data || []).map(project => ({
        ...project,
        startDate: project.start_date,
        endDate: project.end_date,
        leadId: project.lead_id,
        leadName: project.lead_name,
        teamMembers: project.team_members,
        createdBy: project.created_by,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }))
      
      return projects
    } catch (error) {
      console.error("Error getting projects:", error)
      throw error
    }
  },

  create: async (data: {
    name: string
    description: string
    status: "not_started" | "in_progress" | "completed"
    startDate: Date
    endDate: Date
    teamId?: string
    createdBy: string
  }) => {
    try {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          name: data.name,
          description: data.description,
          status: data.status,
          progress: 0,
          start_date: data.startDate.toISOString(),
          end_date: data.endDate.toISOString(),
          lead_id: data.createdBy,
          team_members: [],
          created_by: data.createdBy,
        })
        .select()
        .single()

      if (error) throw error
      
      // Map snake_case to camelCase for frontend
      const mappedProject = {
        ...project,
        startDate: project.start_date,
        endDate: project.end_date,
        leadId: project.lead_id,
        leadName: project.lead_name,
        teamMembers: project.team_members,
        createdBy: project.created_by,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }
      
      return mappedProject
    } catch (error) {
      console.error("Error creating project:", error)
      throw error
    }
  },

  update: async (id: string, data: Partial<{
    name: string
    description: string
    status: "not_started" | "in_progress" | "completed"
    startDate: Date
    endDate: Date
    teamId: string
  }>) => {
    try {
      const updateData: any = {}
      
      if (data.name) updateData.name = data.name
      if (data.description) updateData.description = data.description
      if (data.status) updateData.status = data.status
      if (data.startDate) updateData.start_date = data.startDate.toISOString()
      if (data.endDate) updateData.end_date = data.endDate.toISOString()
      
      updateData.updated_at = new Date().toISOString()

      const { data: project, error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      
      // Map snake_case to camelCase for frontend
      const mappedProject = {
        ...project,
        startDate: project.start_date,
        endDate: project.end_date,
        leadId: project.lead_id,
        leadName: project.lead_name,
        teamMembers: project.team_members,
        createdBy: project.created_by,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }
      
      return mappedProject
    } catch (error) {
      console.error("Error updating project:", error)
      throw error
    }
  },

  delete: async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting project:", error)
      throw error
    }
  },

  // Alias for compatibility
  createProject: async (data: {
    name: string
    description: string
    status: string
    progress: number
    start_date: string
    end_date: string
    lead_id: string
    lead_name?: string
    team_members: string[]
    created_by: string
  }) => {
    try {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          name: data.name,
          description: data.description,
          status: data.status,
          progress: data.progress,
          start_date: data.start_date,
          end_date: data.end_date,
          lead_id: data.lead_id,
          lead_name: data.lead_name || '',
          team_members: data.team_members,
          created_by: data.created_by,
        })
        .select()
        .single()

      if (error) throw error
      return project
    } catch (error) {
      console.error("Error creating project:", error)
      throw error
    }
  },

  // Alias for compatibility
  updateProject: async (id: string, data: {
    name?: string
    description?: string
    status?: string
    progress?: number
    lead_id?: string
    team_members?: string[]
  }) => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.status !== undefined) updateData.status = data.status
      if (data.progress !== undefined) updateData.progress = data.progress
      if (data.lead_id !== undefined) updateData.lead_id = data.lead_id
      if (data.team_members !== undefined) updateData.team_members = data.team_members

      const { data: project, error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return project
    } catch (error) {
      console.error("Error updating project:", error)
      throw error
    }
  },

  // Alias for compatibility
  deleteProject: async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id)
      if (error) throw error
    } catch (error) {
      console.error("Error deleting project:", error)
      throw error
    }
  },
}

// Tasks API
export const tasksAPI = {
  getAll: async (filters?: { status?: string; assigneeId?: string; search?: string; userRole?: string; userId?: string }) => {
    try {
      let query = supabase.from("tasks").select("*")

      // Apply role-based visibility
      if (filters?.userRole && filters?.userId) {
        // CEO, C_LEVEL, and LEAD can see all tasks
        if (!['CEO', 'C_LEVEL', 'LEAD'].includes(filters.userRole)) {
          // Regular employees only see tasks assigned to them
          query = query.contains('assignee_ids', [filters.userId])
        }
      }

      if (filters) {
        if (filters.status && filters.status !== "all") {
          query = query.eq("status", filters.status)
        }

        if (filters.assigneeId) {
          query = query.contains('assignee_ids', [filters.assigneeId])
        }

        if (filters.search) {
          query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }
      }

      const { data, error } = await query

      if (error) throw error
      
      // Map snake_case to camelCase for frontend
      const tasks = (data || []).map(task => ({
        ...task,
        assigneeIds: task.assignee_ids || (task.assignee_id ? [task.assignee_id] : []),
        assigneeNames: task.assignee_names || (task.assignee_name ? [task.assignee_name] : []),
        viewerIds: task.viewer_ids || [],
        viewerNames: task.viewer_names || [],
        assigneeId: task.assignee_id || (task.assignee_ids && task.assignee_ids[0]) || null,
        assigneeName: task.assignee_name || (task.assignee_names && task.assignee_names[0]) || null,
        projectId: task.project_id,
        projectName: task.project_name,
        dueDate: task.due_date,
        dueDatetime: task.due_datetime,
        startDate: task.start_date,
        createdBy: task.created_by,
        createdByName: task.created_by_name,
        assignedBy: task.assigned_by,
        assignedByName: task.assigned_by_name,
        submissionStatus: task.submission_status,
        submissionOpen: task.submission_open,
        submissionFileUrl: task.submission_file_url,
        submissionFileName: task.submission_file_name,
        submissionFileSize: task.submission_file_size,
        approvedAt: task.approved_at,
        approvedBy: task.approved_by,
        reviewNotes: task.review_notes,
        reviewAssignerNotes: task.review_assigner_notes,
        reviewProgress: task.review_progress,
        reviewAssignerFileUrl: task.review_assigner_file_url,
        reviewAssignerFileName: task.review_assigner_file_name,
        reviewAssignerFileSize: task.review_assigner_file_size,
        isPhased: task.is_phased,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      }))
      
      return tasks
    } catch (error) {
      console.error("Error getting tasks:", error)
      throw error
    }
  },

  getUserTasks: async (userId: string, userRole?: string) => {
    try {
      if (!userId) {
        console.log("getUserTasks called with empty userId")
        return []
      }

      console.log("Getting tasks for userId:", userId, "role:", userRole)

      let query = supabase.from("tasks").select("*")

      // Dashboard visibility rules (enforced in RLS too):
      // CEO/C_LEVEL: tasks they assigned + tasks assigned TO them by others
      // LEAD: tasks they assigned + tasks assigned TO them
      // EMPLOYEE/Viewers: only tasks assigned TO them or they can view
      if (userRole && ['CEO', 'C_LEVEL'].includes(userRole)) {
        // CEO/C_LEVEL see ALL tasks system-wide.
        // Read-only enforcement for foreign tasks is handled in the UI layer.
      } else if (userRole === 'LEAD') {
        query = query.or(`assigned_by.eq.${userId},assignee_ids.cs.{${userId}}`)
      } else {
        query = query.or(`assignee_ids.cs.{${userId}},viewer_ids.cs.{${userId}}`)
      }

      const { data, error } = await query

      if (error) throw error

      console.log(`Found ${data?.length || 0} tasks for user ${userId}`)
      
      // Map snake_case to camelCase for frontend
      const tasks = (data || []).map(task => ({
        ...task,
        assigneeIds: task.assignee_ids || (task.assignee_id ? [task.assignee_id] : []),
        assigneeNames: task.assignee_names || (task.assignee_name ? [task.assignee_name] : []),
        viewerIds: task.viewer_ids || [],
        viewerNames: task.viewer_names || [],
        assigneeId: task.assignee_id || (task.assignee_ids && task.assignee_ids[0]) || null,
        assigneeName: task.assignee_name || (task.assignee_names && task.assignee_names[0]) || null,
        projectId: task.project_id,
        projectName: task.project_name,
        dueDate: task.due_date,
        dueDatetime: task.due_datetime,
        startDate: task.start_date,
        createdBy: task.created_by,
        createdByName: task.created_by_name,
        assignedBy: task.assigned_by,
        assignedByName: task.assigned_by_name,
        submissionStatus: task.submission_status,
        submissionOpen: task.submission_open,
        submissionFileUrl: task.submission_file_url,
        submissionFileName: task.submission_file_name,
        submissionFileSize: task.submission_file_size,
        approvedAt: task.approved_at,
        approvedBy: task.approved_by,
        reviewNotes: task.review_notes,
        reviewAssignerNotes: task.review_assigner_notes,
        reviewProgress: task.review_progress,
        reviewAssignerFileUrl: task.review_assigner_file_url,
        reviewAssignerFileName: task.review_assigner_file_name,
        reviewAssignerFileSize: task.review_assigner_file_size,
        isPhased: task.is_phased,
        notified: task.notified,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      }))
      
      return tasks
    } catch (error) {
      console.error("Error getting user tasks:", error)
      throw error
    }
  },

  createTask: async (data: {
    title: string
    description: string
    status: "todo" | "in_progress" | "pending_review" | "pending_completion_review" | "completed"
    priority: "low" | "medium" | "high" | "urgent"
    progress: number
    assigneeIds?: string[]
    assigneeNames?: string[]
    viewerIds?: string[]
    viewerNames?: string[]
    // Legacy support for single assignee
    assigneeId?: string
    assigneeName?: string
    assignee_id?: string
    assignee_name?: string
    assignee_ids?: string[]
    assignee_names?: string[]
    viewer_ids?: string[]
    viewer_names?: string[]
    dueDate?: Date
    due_date?: string | null
    dueDatetime?: string
    due_datetime?: string
    projectId?: string
    project_id?: string | null
    project_name?: string | null
    createdBy?: string
    createdByName?: string
    created_by?: string
    created_by_name?: string
    assignedBy?: string
    assigned_by?: string
    assignedByName?: string
    assigned_by_name?: string
    isPhased?: boolean
    is_phased?: boolean
    milestones?: { title: string; description?: string; dueDate?: string; weight?: number }[]
  }) => {
    try {
      console.log("createTask API called with data:", data);
      
      // Support both camelCase and snake_case for compatibility
      let assigneeIds = data.assigneeIds || data.assignee_ids || [];
      let assigneeNames = data.assigneeNames || data.assignee_names || [];
      let viewerIds = data.viewerIds || data.viewer_ids || [];
      let viewerNames = data.viewerNames || data.viewer_names || [];
      
      // Legacy support: convert single assignee to array
      if (assigneeIds.length === 0 && (data.assigneeId || data.assignee_id)) {
        assigneeIds = [data.assigneeId || data.assignee_id!];
      }
      if (assigneeNames.length === 0 && (data.assigneeName || data.assignee_name)) {
        assigneeNames = [data.assigneeName || data.assignee_name!];
      }
      
      const projectId = data.projectId || data.project_id
      const createdBy = data.createdBy || data.created_by
      const createdByName = data.createdByName || data.created_by_name
      const dueDate = data.dueDate || (data.due_date ? new Date(data.due_date) : null)
      const dueDatetime = data.dueDatetime || data.due_datetime || null
      const assignedBy = data.assignedBy || data.assigned_by || createdBy
      const assignedByName = data.assignedByName || data.assigned_by_name || createdByName

      console.log("Parsed values:", { assigneeIds, assigneeNames, viewerIds, viewerNames, createdBy, createdByName, assignedBy, assignedByName, dueDatetime });

      if (!assigneeIds.length || !assigneeNames.length || !createdBy || !createdByName) {
        const error = `Assignee and creator information is required. Missing: ${!assigneeIds.length ? 'assigneeIds ' : ''}${!assigneeNames.length ? 'assigneeNames ' : ''}${!createdBy ? 'createdBy ' : ''}${!createdByName ? 'createdByName' : ''}`
        console.error(error);
        throw new Error(error)
      }

      console.log("Calling Supabase insert...");
      
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          progress: data.progress,
          assignee_ids: assigneeIds,
          assignee_names: assigneeNames,
          viewer_ids: viewerIds,
          viewer_names: viewerNames,
          assignee_id: assigneeIds[0] || '',
          assignee_name: assigneeNames[0] || '',
          due_date: dueDate ? dueDate.toISOString() : null,
          due_datetime: dueDatetime,
          project_id: projectId || null,
          created_by: createdBy,
          created_by_name: createdByName,
          assigned_by: assignedBy,
          assigned_by_name: assignedByName,
          submission_open: true,
          submission_status: 'pending',
          is_phased: data.isPhased || data.is_phased || false,
        })
        .select()
        .single()

      if (error) {
        // Use JSON.stringify to capture non-enumerable getters (code, message, details, hint)
        const errStr = JSON.stringify(error, Object.getOwnPropertyNames(error));
        console.error("Supabase task insert error:", errStr);
        if (error.code === '42703' || (error.message || '').includes('assignee_ids')) {
          console.error("⚠️ DATABASE MIGRATION REQUIRED: The 'assignee_ids' and 'assignee_names' columns don't exist.");
          console.error("Please run the SQL migration from 'components/migrations/006-multi-assignee-schema.sql' in your Supabase SQL Editor.");
          throw new Error("Database migration required. Please run 006-multi-assignee-schema.sql in Supabase SQL Editor.")
        }
        if (error.code === '23514' && (error.message || '').includes('project_id')) {
          console.error("⚠️ CONSTRAINT ERROR: tasks_project_id_required CHECK constraint is blocking NULL project_id.");
          console.error("Please run the SQL migration from 'components/migrations/007-drop-project-id-constraint.sql' in your Supabase SQL Editor.");
          throw new Error("Database constraint error. Please run 007-drop-project-id-constraint.sql in Supabase SQL Editor.")
        }
        if (error.code === 'PGRST116') {
          console.error("⚠️ RLS POLICY REJECTION: Task insert got 0 rows — likely blocked by get_user_role().");
          console.error("   Verify: auth.uid() = assigned_by AND role IN ('CEO','C_LEVEL','LEAD')");
          throw new Error("Task creation blocked by RLS. Ensure you are logged in as CEO, C_LEVEL, or LEAD, and that the get_user_role() database function exists.")
        }
        throw error
      }

      // Create milestones if provided
      const milestones = data.milestones
      if (milestones && milestones.length > 0) {
        const milestoneCount = milestones.length
        const evenWeight = Math.floor(100 / milestoneCount)
        const remainder = 100 - evenWeight * milestoneCount
        const milestoneInserts = milestones.map((m, i) => {
          const milestoneDueDatetime = m.dueDate && m.dueTime 
            ? new Date(`${m.dueDate}T${m.dueTime}:00`).toISOString() 
            : m.dueDate ? new Date(`${m.dueDate}T23:59:59`).toISOString() : null
          return {
            task_id: task.id,
            title: m.title,
            description: m.description || '',
            order_index: i,
            weight: m.weight ?? (evenWeight + (i === 0 ? remainder : 0)),
            due_datetime: milestoneDueDatetime,
            status: 'not_started'
          }
        })
        const { error: milestonesError } = await supabase.from("task_milestones").insert(milestoneInserts)
        if (milestonesError) {
          const errStr = JSON.stringify(milestonesError, Object.getOwnPropertyNames(milestonesError))
          console.error("Failed to create milestones:", errStr)
          throw new Error(`Milestone creation failed: ${milestonesError.message || milestonesError.code || "unknown error"}. Check that task_milestones table exists and RLS allows inserts.`)
        }
      }

      return task
    } catch (error: any) {
      const errStr = JSON.stringify(error, Object.getOwnPropertyNames(error));
      console.error("createTask catch block - raw:", errStr);
      throw error
    }
  },

  update: async (id: string, data: Partial<{
    title: string
    description: string
    status: "todo" | "in_progress" | "pending_review" | "pending_completion_review" | "completed"
    priority: "low" | "medium" | "high" | "urgent"
    progress: number
    assigneeId: string
    assigneeName: string
    dueDate: Date
    dueDatetime: string
    projectId: string
    start_date: string
    submissionOpen: boolean
    submissionStatus: string
    submissionFileUrl: string
    submissionFileName: string
    submissionFileSize: number
    assignedBy: string
    assignedByName: string
  }>) => {
    try {
      const updateData: any = {}
      
      if (data.title) updateData.title = data.title
      if (data.description) updateData.description = data.description
      if (data.status) updateData.status = data.status
      if (data.priority) updateData.priority = data.priority
      if (data.progress !== undefined) updateData.progress = data.progress
      if (data.assigneeId) updateData.assignee_id = data.assigneeId
      if (data.assigneeName) updateData.assignee_name = data.assigneeName
      if (data.dueDate) updateData.due_date = data.dueDate.toISOString()
      if (data.projectId) updateData.project_id = data.projectId
      if (data.start_date) updateData.start_date = data.start_date
      if (data.dueDatetime !== undefined) updateData.due_datetime = data.dueDatetime
      if (data.submissionOpen !== undefined) updateData.submission_open = data.submissionOpen
      if (data.submissionStatus !== undefined) updateData.submission_status = data.submissionStatus
      if (data.submissionFileUrl !== undefined) updateData.submission_file_url = data.submissionFileUrl
      if (data.submissionFileName !== undefined) updateData.submission_file_name = data.submissionFileName
      if (data.submissionFileSize !== undefined) updateData.submission_file_size = data.submissionFileSize
      if (data.assignedBy !== undefined) updateData.assigned_by = data.assignedBy
      if (data.assignedByName !== undefined) updateData.assigned_by_name = data.assignedByName
      if (data.reviewNotes !== undefined) updateData.review_notes = data.reviewNotes
      if (data.reviewAssignerNotes !== undefined) updateData.review_assigner_notes = data.reviewAssignerNotes
      if (data.reviewProgress !== undefined) updateData.review_progress = data.reviewProgress
      
      updateData.updated_at = new Date().toISOString()

      const { data: task, error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("Supabase error updating task:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      return task
    } catch (error: any) {
      console.error("Error updating task:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      })
      throw error
    }
  },

  // Alias for update method for compatibility
  updateTask: async (id: string, data: any) => {
    return tasksAPI.update(id, data)
  },

  delete: async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting task:", error)
      throw error
    }
  },

  submitTask: async (id: string, fileUrl: string, fileName: string, fileSize: number) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          submission_file_url: fileUrl,
          submission_file_name: fileName,
          submission_file_size: fileSize,
          submission_status: "submitted",
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error submitting task:", error)
      throw error
    }
  },

  toggleSubmission: async (id: string, open: boolean) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          submission_open: open,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error toggling submission:", error)
      throw error
    }
  },

  toggleMilestoneSubmission: async (milestoneId: string, open: boolean) => {
    try {
      const { data, error } = await supabase
        .from("task_milestones")
        .update({
          submission_open: open,
          updated_at: new Date().toISOString()
        })
        .eq("id", milestoneId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error toggling milestone submission:", error)
      throw error
    }
  },

  approveTask: async (id: string, approverId: string) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          submission_status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: approverId,
          submission_open: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error approving task:", error)
      throw error
    }
  },

  rejectTask: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          submission_status: "rejected",
          submission_open: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error rejecting task:", error)
      throw error
    }
  },

  uploadSubmissionFile: async (taskId: string, file: File, userId: string) => {
    try {
      const result = await uploadFile("uploads", "submissions", taskId, file, userId)
      await tasksAPI.submitTask(taskId, result.url, result.name, result.size)
      return { fileUrl: result.url, fileName: result.name, fileSize: result.size }
    } catch (error) {
      console.error("Error uploading submission file:", error)
      throw error
    }
  },

  // --- Review workflow functions ---

  startTask: async (id: string) => {
    try {
      // Check if this is a milestone-based task — if so, skip the flat 15% progress jump
      const { data: task } = await supabase.from("tasks").select("is_phased").eq("id", id).single()
      const isPhased = task?.is_phased || false
      const { data, error } = await supabase
        .from("tasks")
        .update({
          status: "in_progress",
          progress: isPhased ? 0 : 15,
          start_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data
    } catch (error) {
      console.error("Error starting task:", error)
      throw error
    }
  },

  submitProgressReview: async (id: string, notes: string, file?: File, userId?: string) => {
    try {
      const updateData: any = {
        status: "pending_review",
        review_notes: notes,
        updated_at: new Date().toISOString()
      }
      if (file && userId) {
        const result = await uploadFile("uploads", "reviews", id, file, userId)
        updateData.review_assigner_file_url = result.url
        updateData.review_assigner_file_name = result.name
        updateData.review_assigner_file_size = result.size
      }
      const { data, error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data
    } catch (error) {
      console.error("Error submitting progress review:", error)
      throw error
    }
  },

  uploadReviewerFile: async (taskId: string, file: File, userId: string) => {
    return uploadFile("uploads", "reviews", taskId, file, userId)
  },

  reviewProgress: async (id: string, reviewerId: string, progress: number, notes: string, reviewerFile?: { url: string; name: string; size: number }) => {
    try {
      const updateData: any = {
        status: "in_progress",
        progress: Math.max(0, Math.min(100, progress)),
        review_assigner_notes: notes,
        review_notes: null,
        updated_at: new Date().toISOString()
      }
      if (reviewerFile) {
        updateData.review_assigner_file_url = reviewerFile.url
        updateData.review_assigner_file_name = reviewerFile.name
        updateData.review_assigner_file_size = reviewerFile.size
      }
      const { data, error } = await supabase.from("tasks").update(updateData).eq("id", id).select().single()
      if (error) throw error; return data
    } catch (error) { console.error("Error reviewing progress:", error); throw error }
  },

  submitCompletionReview: async (id: string, fileUrl: string, fileName: string, fileSize: number) => {
    if (!fileUrl) throw new Error("File attachment is required for completion review.")

    // Gate: if milestone-based task, all milestones must be approved
    const { data: task } = await supabase.from("tasks").select("is_phased").eq("id", id).single()
    if (task?.is_phased) {
      const allApproved = await (tasksAPI as any).allMilestonesApproved(id)
      if (!allApproved) throw new Error("All milestones must be approved before submitting the final completion review.")
    }

    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          status: "pending_completion_review",
          submission_file_url: fileUrl,
          submission_file_name: fileName,
          submission_file_size: fileSize,
          submission_status: "submitted",
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single()
      if (error) throw error
      return data
    } catch (error) {
      console.error("Error submitting completion review:", error)
      throw error
    }
  },

  uploadCompletionFile: async (taskId: string, file: File, userId: string) => {
    const result = await uploadFile("uploads", "submissions", taskId, file, userId)
    return { fileUrl: result.url, fileName: result.name, fileSize: result.size }
  },

  approveCompletion: async (id: string, approverId: string, reviewerFile?: { url: string; name: string; size: number }) => {
    try {
      const updateData: any = {
        status: "completed", progress: 100,
        submission_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: approverId,
        submission_open: false,
        updated_at: new Date().toISOString()
      }
      if (reviewerFile) {
        updateData.review_assigner_file_url = reviewerFile.url
        updateData.review_assigner_file_name = reviewerFile.name
        updateData.review_assigner_file_size = reviewerFile.size
      }
      const { data, error } = await supabase.from("tasks").update(updateData).eq("id", id).select().single()
      if (error) throw error; return data
    } catch (error) { console.error("Error approving completion:", error); throw error }
  },

  rejectCompletion: async (id: string, notes: string, reviewerFile?: { url: string; name: string; size: number }) => {
    try {
      const updateData: any = {
        status: "in_progress",
        submission_status: "rejected",
        review_assigner_notes: notes,
        submission_open: true,
        updated_at: new Date().toISOString()
      }
      if (reviewerFile) {
        updateData.review_assigner_file_url = reviewerFile.url
        updateData.review_assigner_file_name = reviewerFile.name
        updateData.review_assigner_file_size = reviewerFile.size
      }
      const { data, error } = await supabase.from("tasks").update(updateData).eq("id", id).select().single()
      if (error) throw error; return data
    } catch (error) { console.error("Error rejecting completion:", error); throw error }
  },

  getSignedFileUrl: async (fileUrl: string): Promise<string | null> => {
    return getSignedUrl(fileUrl, fileUrl.includes('/vault/') ? "vault" : "uploads")
  },

  // --- Milestone functions ---

  getTaskMilestones: async (taskId: string) => {
    const { data: milestones, error } = await supabase
      .from("task_milestones")
      .select("*")
      .eq("task_id", taskId)
      .order("order_index", { ascending: true })
    if (error) throw error
    // Fetch latest review for each milestone
    const { data: allReviews } = await supabase
      .from("milestone_reviews")
      .select("*")
      .in("milestone_id", (milestones || []).map(m => m.id))
      .order("created_at", { ascending: false })
    const reviewMap: Record<string, any> = {}
    ;(allReviews || []).forEach(r => {
      if (!reviewMap[r.milestone_id]) reviewMap[r.milestone_id] = r
    })
    return (milestones || []).map(m => ({ ...m, latestReview: reviewMap[m.id] || null }))
  },

  getNextActionableMilestone: async (taskId: string): Promise<{ id: string; order_index: number; title: string; status: string } | null> => {
    const { data, error } = await supabase
      .from("task_milestones")
      .select("*")
      .eq("task_id", taskId)
      .eq("status", "not_started")
      .order("order_index", { ascending: true })
      .limit(1)
    if (error) throw error
    return data?.[0] || null
  },

  startMilestone: async (milestoneId: string) => {
    // Enforce sequential ordering — can only start the first not-started milestone
    const { data: milestone } = await supabase.from("task_milestones").select("task_id, order_index, status").eq("id", milestoneId).single()
    if (!milestone) throw new Error("Milestone not found")
    if (milestone.status !== "not_started") throw new Error("This milestone has already been started.")
    const { data: allMilestones } = await supabase.from("task_milestones").select("order_index, status").eq("task_id", milestone.task_id).order("order_index")
    if (allMilestones) {
      const hasEarlierPending = allMilestones.some(m => m.order_index < milestone.order_index && m.status !== "approved")
      if (hasEarlierPending) throw new Error("You must complete earlier milestones first.")
    }
    const { data, error } = await supabase
      .from("task_milestones")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", milestoneId)
      .select()
      .single()
    if (error) {
      console.error("startMilestone update error:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
      throw error
    }
    return data
  },

  submitMilestoneReview: async (milestoneId: string, comment: string, file?: File, userId?: string) => {
    // Enforce sequential ordering — can only submit the current in-progress milestone
    const { data: milestone } = await supabase.from("task_milestones").select("task_id, order_index, status, submission_open").eq("id", milestoneId).single()
    if (!milestone) throw new Error("Milestone not found")
    if (milestone.submission_open === false) {
      throw new Error("The submission deadline for this milestone has been closed by the assigner.")
    }
    if (milestone.status !== "in_progress" && milestone.status !== "needs_revision") {
      throw new Error("This milestone cannot be submitted in its current state.")
    }
    const { data: allMilestones } = await supabase.from("task_milestones").select("order_index, status").eq("task_id", milestone.task_id).order("order_index")
    if (allMilestones) {
      const hasEarlierPending = allMilestones.some(m => m.order_index < milestone.order_index && m.status !== "approved")
      if (hasEarlierPending) throw new Error("You must complete earlier milestones first.")
    }
    const insertData: any = {
      milestone_id: milestoneId,
      comment,
    }
    if (file && userId) {
      const result = await uploadFile("uploads", "submissions", milestoneId, file, userId)
      insertData.employee_file_url = result.url
      insertData.employee_file_name = result.name
      insertData.employee_file_size = result.size
    }
    const { error: reviewError } = await supabase.from("milestone_reviews").insert(insertData)
    if (reviewError) throw reviewError
    const { data, error } = await supabase
      .from("task_milestones")
      .update({ status: "pending_review", updated_at: new Date().toISOString() })
      .eq("id", milestoneId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  approveMilestone: async (milestoneId: string, comment: string, reviewerId: string, file?: File, userId?: string) => {
    const insertData: any = {
      milestone_id: milestoneId,
      comment,
      decision: "approved",
      reviewer_id: reviewerId,
    }
    if (file && userId) {
      const result = await uploadFile("uploads", "reviews", milestoneId, file, userId)
      insertData.reviewer_file_url = result.url
      insertData.reviewer_file_name = result.name
      insertData.reviewer_file_size = result.size
    }
    const { error: reviewError } = await supabase.from("milestone_reviews").insert(insertData)
    if (reviewError) throw reviewError
    // Update milestone status
    const { data, error } = await supabase
      .from("task_milestones")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", milestoneId)
      .select()
      .single()
    if (error) throw error
    // Recalculate task progress
    await (tasksAPI as any).recalculateMilestoneProgress(data.task_id)
    return data
  },

  rejectMilestone: async (milestoneId: string, comment: string, reviewerId: string, file?: File, userId?: string) => {
    const insertData: any = {
      milestone_id: milestoneId,
      comment,
      decision: "rejected",
      reviewer_id: reviewerId,
    }
    if (file && userId) {
      const result = await uploadFile("uploads", "reviews", milestoneId, file, userId)
      insertData.reviewer_file_url = result.url
      insertData.reviewer_file_name = result.name
      insertData.reviewer_file_size = result.size
    }
    const { error: reviewError } = await supabase.from("milestone_reviews").insert(insertData)
    if (reviewError) throw reviewError
    const { data, error } = await supabase
      .from("task_milestones")
      .update({ status: "needs_revision", updated_at: new Date().toISOString() })
      .eq("id", milestoneId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  recalculateMilestoneProgress: async (taskId: string) => {
    const { data: milestones } = await supabase
      .from("task_milestones")
      .select("weight, status")
      .eq("task_id", taskId)
    if (!milestones || milestones.length === 0) return
    const progress = milestones
      .filter(m => m.status === "approved")
      .reduce((sum, m) => sum + (m.weight || 0), 0)
    await supabase.from("tasks").update({ progress, updated_at: new Date().toISOString() }).eq("id", taskId)
  },

  allMilestonesApproved: async (taskId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("task_milestones")
      .select("status")
      .eq("task_id", taskId)
    if (error || !data || data.length === 0) return true // no milestones = not gated
    return data.every(m => m.status === "approved")
  },

  updateMilestone: async (id: string, dataUpdates: Partial<{ title: string; description: string; weight: number; status: string; due_datetime: string; submission_open: boolean }>) => {
    const updateData: any = { ...dataUpdates, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from("task_milestones").update(updateData).eq("id", id).select().single()
    if (error) throw error
    return data
  },

  addMilestone: async (taskId: string, milestone: { title: string; description?: string; dueDate?: string; dueTime?: string; weight?: number }) => {
    const { data: existing } = await supabase.from("task_milestones").select("*").eq("task_id", taskId).order("order_index")
    const newIndex = existing ? existing.length : 0

    const milestoneDueDatetime = milestone.dueDate && milestone.dueTime 
      ? new Date(`${milestone.dueDate}T${milestone.dueTime}:00`).toISOString() 
      : milestone.dueDate ? new Date(`${milestone.dueDate}T23:59:59`).toISOString() : null

    const insertPayload: any = {
      task_id: taskId,
      title: milestone.title,
      description: milestone.description || '',
      due_datetime: milestoneDueDatetime,
      order_index: newIndex,
      weight: milestone.weight || 0,
      status: 'not_started'
    }
    const { data, error } = await supabase.from("task_milestones").insert(insertPayload).select().single()
    if (error) throw error
    // Redistribute weights evenly among all milestones
    const { data: all } = await supabase.from("task_milestones").select("*").eq("task_id", taskId).order("order_index")
    if (all && all.length > 0) {
      const evenWeight = Math.floor(100 / all.length)
      const remainder = 100 - evenWeight * all.length
      for (let i = 0; i < all.length; i++) {
        const newWeight = evenWeight + (i === 0 ? remainder : 0)
        await supabase.from("task_milestones").update({ weight: newWeight, updated_at: new Date().toISOString() }).eq("id", all[i].id)
      }
    }
    await (tasksAPI as any).recalculateMilestoneProgress(taskId)
    return data
  },

  deleteMilestone: async (id: string) => {
    // Get milestone info before deletion for weight redistribution
    const { data: milestone } = await supabase.from("task_milestones").select("*").eq("id", id).single()
    if (!milestone) throw new Error("Milestone not found")
    const taskId = milestone.task_id
    const wasApproved = milestone.status === "approved"
    const deletedWeight = milestone.weight || 0
    const { error } = await supabase.from("task_milestones").delete().eq("id", id)
    if (error) throw error
    // Redistribute weight evenly among remaining unapproved milestones only
    // Approved milestones keep their weight — progress already credited isn't retroactively reduced
    const { data: remaining } = await supabase.from("task_milestones").select("*").eq("task_id", taskId).order("order_index")
    if (remaining && remaining.length > 0) {
      const approvedWeight = remaining.filter(r => r.status === "approved").reduce((s, r) => s + (r.weight || 0), 0)
      const unapprovedTotal = remaining.length - remaining.filter(r => r.status === "approved").length
      if (unapprovedTotal > 0) {
        const weightPerUnapproved = Math.floor((100 - approvedWeight) / unapprovedTotal)
        const remainderWeight = 100 - approvedWeight - weightPerUnapproved * unapprovedTotal
        let unapprovedCounter = 0
        for (let i = 0; i < remaining.length; i++) {
          if (remaining[i].status !== "approved") {
            const newWeight = weightPerUnapproved + (unapprovedCounter === 0 ? remainderWeight : 0)
            await supabase.from("task_milestones").update({
              weight: newWeight,
              order_index: i,
              updated_at: new Date().toISOString()
            }).eq("id", remaining[i].id)
            unapprovedCounter++
          } else {
            // Just re-index approved milestones
            await supabase.from("task_milestones").update({ order_index: i, updated_at: new Date().toISOString() }).eq("id", remaining[i].id)
          }
        }
      }
      // If the removed milestone was approved, add its weight back to task progress
      // so that credited progress isn't retroactively lost
      if (wasApproved) {
        const { data: task } = await supabase.from("tasks").select("progress").eq("id", taskId).single()
        const newProgress = Math.min(100, (task?.progress || 0) + deletedWeight)
        await supabase.from("tasks").update({ progress: newProgress, updated_at: new Date().toISOString() }).eq("id", taskId)
      } else {
        await (tasksAPI as any).recalculateMilestoneProgress(taskId)
      }
    } else {
      // No milestones left — reset to 0
      await supabase.from("tasks").update({ progress: 0, updated_at: new Date().toISOString() }).eq("id", taskId)
    }
    return { deleted: true }
  },

  reorderMilestones: async (taskId: string, orderedIds: string[]) => {
    const { data: existing } = await supabase.from("task_milestones").select("*").eq("task_id", taskId).order("order_index")
    if (!existing) throw new Error("No milestones found")
    const existingMap = new Map(existing.map(m => [m.id, m]))
    const approvedIds = existing.filter(m => m.status === "approved").map(m => m.id)
    const approvedPositions = orderedIds.map((id, i) => ({ id, i })).filter(p => approvedIds.includes(p.id))
    const pendingPositions = orderedIds.map((id, i) => ({ id, i })).filter(p => !approvedIds.includes(p.id))
    // Validate: no approved after a pending
    if (approvedPositions.length > 0 && pendingPositions.length > 0) {
      const maxApprovedIndex = Math.max(...approvedPositions.map(p => p.i))
      const minPendingIndex = Math.min(...pendingPositions.map(p => p.i))
      if (minPendingIndex < maxApprovedIndex) {
        throw new Error("Cannot move an unapproved milestone before an approved one.")
      }
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase.from("task_milestones").update({ order_index: i, updated_at: new Date().toISOString() }).eq("id", orderedIds[i])
    }
    return { reordered: true }
  },

  getMilestoneSummaries: async (taskIds: string[]): Promise<Record<string, { total: number; approved: number }>> => {
    if (!taskIds.length) return {}
    const { data, error } = await supabase
      .from("task_milestones")
      .select("task_id, status")
      .in("task_id", taskIds)
    if (error) {
      console.error("Error fetching milestone summaries:", error)
      return {}
    }
    const result: Record<string, { total: number; approved: number }> = {}
    for (const m of data || []) {
      if (!result[m.task_id]) result[m.task_id] = { total: 0, approved: 0 }
      result[m.task_id].total++
      if (m.status === "approved") result[m.task_id].approved++
    }
    return result
  },

  getOverdueTasks: async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .lt("due_datetime", new Date().toISOString())
        .neq("submission_status", "approved")
        .eq("notified", false)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error getting overdue tasks:", error)
      throw error
    }
  },
}

// Announcements API
export const announcementsAPI = {
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      
      // Map snake_case to camelCase for frontend
      const announcements = (data || []).map(announcement => ({
        ...announcement,
        authorId: announcement.author_id,
        authorName: announcement.author_name,
        createdAt: announcement.created_at,
        updatedAt: announcement.updated_at,
        readBy: announcement.read_by
      }))
      
      return announcements
    } catch (error) {
      console.error("Error getting announcements:", error)
      throw error
    }
  },

  create: async (data: {
    title: string
    content: string
    priority: "low" | "medium" | "high"
    authorId?: string
    authorName?: string
    createdBy?: string
    createdByName?: string
  }) => {
    try {
      // Support both authorId/authorName and createdBy/createdByName for compatibility
      const authorId = data.authorId || data.createdBy
      const authorName = data.authorName || data.createdByName

      if (!authorId || !authorName) {
        throw new Error("Author ID and name are required")
      }

      const { data: announcement, error } = await supabase
        .from("announcements")
        .insert({
          title: data.title,
          content: data.content,
          priority: data.priority,
          author_id: authorId,
          author_name: authorName,
          read_by: [],
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating announcement:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      // Map snake_case to camelCase for frontend
      const mappedAnnouncement = {
        ...announcement,
        authorId: announcement.author_id,
        authorName: announcement.author_name,
        createdAt: announcement.created_at,
        updatedAt: announcement.updated_at,
        readBy: announcement.read_by
      }
      
      return mappedAnnouncement
    } catch (error: any) {
      console.error("Error creating announcement:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      })
      throw error
    }
  },

  update: async (id: string, data: Partial<{
    title: string
    content: string
    priority: "low" | "medium" | "high"
  }>) => {
    try {
      const updateData: any = { ...data, updated_at: new Date().toISOString() }

      const { data: announcement, error } = await supabase
        .from("announcements")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      
      // Map snake_case to camelCase for frontend
      const mappedAnnouncement = {
        ...announcement,
        authorId: announcement.author_id,
        authorName: announcement.author_name,
        createdAt: announcement.created_at,
        updatedAt: announcement.updated_at,
        readBy: announcement.read_by
      }
      return announcement
    } catch (error) {
      console.error("Error updating announcement:", error)
      throw error
    }
  },

  delete: async (id: string) => {
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting announcement:", error)
      throw error
    }
  },

  markAsRead: async (announcementId: string, userId: string) => {
    try {
      // First get the current announcement to check if user already read it
      const { data: announcement, error: fetchError } = await supabase
        .from("announcements")
        .select("read_by")
        .eq("id", announcementId)
        .single()

      if (fetchError) {
        console.error("Error fetching announcement:", {
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code
        })
        throw fetchError
      }

      // Check if user has already read it
      const readBy = announcement.read_by || []
      if (readBy.includes(userId)) {
        return { id: announcementId, alreadyRead: true }
      }

      // Add user to read_by array
      const { error: updateError } = await supabase
        .from("announcements")
        .update({ 
          read_by: [...readBy, userId],
          updated_at: new Date().toISOString()
        })
        .eq("id", announcementId)

      if (updateError) {
        console.error("Error marking announcement as read:", {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        })
        throw updateError
      }

      return { id: announcementId, read: true }
    } catch (error: any) {
      console.error("Error marking announcement as read:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      })
      throw error
    }
  }
}

// Notifications API
export const notificationsAPI = {
  getUserNotifications: async (userId: string) => {
    try {
      if (!userId) return []

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error getting user notifications:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      return data || []
    } catch (error: any) {
      console.error("Error getting user notifications:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      })
      return []
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)

      if (error) throw error
      return true
    } catch (error) {
      console.error("Error marking notification as read:", error)
      return false
    }
  },

  getUnreadCount: async (userId: string) => {
    try {
      if (!userId) return 0

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false)

      if (error) {
        console.error("Error getting unread notifications count:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      return count || 0
    } catch (error: any) {
      console.error("Error getting unread notifications count:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      })
      return 0
    }
  },

  addNotification: async ({ userId, title, body, type, linkTo, relatedItemId }: {
    userId: string
    title: string
    body: string
    type: string
    linkTo?: string
    relatedItemId?: string
  }) => {
    try {
      console.log("Adding notification with params:", { userId, title, body, type, linkTo, relatedItemId });
      
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title,
          body,
          type,
          link_to: linkTo || null,
          related_item_id: relatedItemId || null,
          read: false,
        })
        .select()
        .single()

      if (error) {
        console.error("Supabase error details:", error);
        console.error("Error adding notification - Full error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to add notification: ${error.message || 'Unknown error'}`)
      }
      
      console.log("Notification added successfully:", data);
      return data
    } catch (error: any) {
      console.error("Caught error in addNotification:", error);
      console.error("Error details:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      });
      throw error
    }
  }
}

// Calendar Events API
export const calendarEventsAPI = {
  // Get all events for the current user (as organizer or invitee)
  getAll: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .or(`organizer_id.eq.${userId},invited_member_ids.cs.{${userId}}`)
        .order("start_time", { ascending: true })

      if (error) {
        console.error("Error getting calendar events:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      // Transform snake_case to camelCase
      return (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.start_time,
        endTime: event.end_time,
        location: event.location,
        type: event.event_type as "event" | "meeting",
        organizerId: event.organizer_id,
        organizerName: event.organizer_name,
        organizerEmail: event.organizer_email,
        attendees: event.attendees || [],
        invitedMemberIds: event.invited_member_ids || [],
        sendCalendarInvite: event.send_calendar_invite,
        sendEmailReminder: event.send_email_reminder,
        addToGoogleCalendar: event.add_to_google_calendar,
        notifyOnDashboard: event.notify_on_dashboard,
        meetingLink: event.meeting_link,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
      }))
    } catch (error: any) {
      console.error("Error getting calendar events:", {
        message: error?.message,
        stack: error?.stack
      })
      throw error
    }
  },

  // Create a new event
  createEvent: async (event: {
    title: string
    description: string
    startTime: Date
    endTime: Date
    location: string
    type: "event" | "meeting"
    organizerId: string
    organizerName?: string
    organizerEmail?: string
    attendees?: string[]
    invitedMemberIds?: string[]
    sendCalendarInvite?: boolean
    sendEmailReminder?: boolean
    addToGoogleCalendar?: boolean
    notifyOnDashboard?: boolean
    meetingLink?: string
  }) => {
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          title: event.title,
          description: event.description,
          start_time: event.startTime.toISOString(),
          end_time: event.endTime.toISOString(),
          location: event.location,
          event_type: event.type,
          organizer_id: event.organizerId,
          organizer_name: event.organizerName || null,
          organizer_email: event.organizerEmail || null,
          attendees: event.attendees || [],
          invited_member_ids: event.invitedMemberIds || [],
          send_calendar_invite: event.sendCalendarInvite ?? true,
          send_email_reminder: event.sendEmailReminder ?? true,
          add_to_google_calendar: event.addToGoogleCalendar ?? false,
          notify_on_dashboard: event.notifyOnDashboard ?? true,
          meeting_link: event.meetingLink || null,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating calendar event:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        startTime: data.start_time,
        endTime: data.end_time,
        location: data.location,
        type: data.event_type as "event" | "meeting",
        organizerId: data.organizer_id,
        organizerName: data.organizer_name,
        organizerEmail: data.organizer_email,
        attendees: data.attendees || [],
        invitedMemberIds: data.invited_member_ids || [],
        sendCalendarInvite: data.send_calendar_invite,
        sendEmailReminder: data.send_email_reminder,
        addToGoogleCalendar: data.add_to_google_calendar,
        notifyOnDashboard: data.notify_on_dashboard,
        meetingLink: data.meeting_link,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    } catch (error: any) {
      console.error("Error creating calendar event:", {
        message: error?.message,
        stack: error?.stack
      })
      throw error
    }
  },

  // Update an event
  updateEvent: async (id: string, updates: {
    title?: string
    description?: string
    startTime?: Date
    endTime?: Date
    location?: string
    attendees?: string[]
    invitedMemberIds?: string[]
  }) => {
    try {
      const updateData: any = {}
      if (updates.title !== undefined) updateData.title = updates.title
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.startTime) updateData.start_time = updates.startTime.toISOString()
      if (updates.endTime) updateData.end_time = updates.endTime.toISOString()
      if (updates.location !== undefined) updateData.location = updates.location
      if (updates.attendees !== undefined) updateData.attendees = updates.attendees
      if (updates.invitedMemberIds !== undefined) updateData.invited_member_ids = updates.invitedMemberIds

      const { data, error } = await supabase
        .from("calendar_events")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("Error updating calendar event:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      return data
    } catch (error: any) {
      console.error("Error updating calendar event:", {
        message: error?.message,
        stack: error?.stack
      })
      throw error
    }
  },

  // Delete an event
  deleteEvent: async (id: string) => {
    try {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("Error deleting calendar event:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error deleting calendar event:", {
        message: error?.message,
        stack: error?.stack
      })
      throw error
    }
  }
}

// Chat API
export const chatAPI = {
  sendDirectMessage: async (senderId: string, recipientId: string, text: string, senderName?: string, senderAvatar?: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          text,
          sender_id: senderId,
          recipient_id: recipientId,
          sender_name: senderName || null,
          sender_avatar: senderAvatar || null,
          is_read: false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error sending direct message:", error)
      throw error
    }
  },

  sendGroupMessage: async (senderId: string, groupId: string, text: string, senderName?: string, senderAvatar?: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          text,
          sender_id: senderId,
          group_id: groupId,
          sender_name: senderName || null,
          sender_avatar: senderAvatar || null,
          is_read: false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error sending group message:", error)
      throw error
    }
  },

  getDirectMessageHistory: async (userId1: string, userId2: string, limit = 50) => {
    try {
      console.log(`Starting message fetch for users ${userId1} and ${userId2}`)

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
        .order("created_at", { ascending: true })
        .limit(limit)

      if (error) throw error

      console.log(`Found ${data?.length || 0} messages`)
      return data || []
    } catch (error) {
      console.error("Error getting direct message history:", error)
      throw error
    }
  },

  getGroupMessageHistory: async (groupId: string, limit = 50) => {
    try {
      console.log(`Starting message fetch for group ${groupId}`)

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(limit)

      if (error) throw error

      console.log(`Found ${data?.length || 0} group messages`)
      return data || []
    } catch (error) {
      console.error("Error getting group message history:", error)
      throw error
    }
  },

  getUserChatGroups: async (userId: string) => {
    try {
      console.log(`Getting chat groups for user ${userId}`)
      
      const { data, error } = await supabase
        .from("chat_groups")
        .select("*")
        .contains("members", [userId])

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error getting user chat groups:", error)
      throw error
    }
  },

  createChatGroup: async (data: {
    name: string
    description: string
    members: string[]
    createdBy: string
  }) => {
    try {
      const { data: group, error } = await supabase
        .from("chat_groups")
        .insert({
          name: data.name,
          description: data.description,
          members: data.members,
          created_by: data.createdBy,
          avatar: "https://github.com/shadcn.png",
        })
        .select()
        .single()

      if (error) throw error
      return group
    } catch (error) {
      console.error("Error creating chat group:", error)
      throw error
    }
  },

  markMessagesAsRead: async (messageIds: string[]) => {
    try {
      if (!messageIds || messageIds.length === 0) return

      const { error } = await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .in("id", messageIds)

      if (error) throw error
    } catch (error) {
      console.error("Error marking messages as read:", error)
      throw error
    }
  }
}

// Warnings API
export const warningsAPI = {
  getAll: async (filters?: { status?: string; userId?: string; departmentId?: string }) => {
    try {
      let query = supabase.from("warnings").select("*").order("created_at", { ascending: false })

      if (filters) {
        if (filters.status && filters.status !== "all") {
          query = query.eq("status", filters.status)
        }

        if (filters.userId) {
          query = query.eq("user_id", filters.userId)
        }

        if (filters.departmentId) {
          query = query.eq("department_id", filters.departmentId)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error("Error getting warnings:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      return data || []
    } catch (error: any) {
      console.error("Error getting warnings:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack
      })
      throw error
    }
  },

  create: async (warningData: {
    userId: string
    userName: string
    issuerId: string
    issuerName: string
    title: string
    description: string
    severity: "low" | "medium" | "high" | "critical"
    departmentId?: string
    departmentName?: string
  }) => {
    try {
      const { data: warning, error } = await supabase
        .from("warnings")
        .insert({
          user_id: warningData.userId,
          user_name: warningData.userName,
          issuer_id: warningData.issuerId,
          issuer_name: warningData.issuerName,
          title: warningData.title,
          description: warningData.description,
          severity: warningData.severity,
          status: "active",
          department_id: warningData.departmentId || null,
          department_name: warningData.departmentName || null,
        })
        .select()
        .single()

      if (error) throw error

      // Create a notification for the user
      await supabase
        .from("notifications")
        .insert({
          user_id: warningData.userId,
          type: "warning",
          title: `Warning: ${warningData.title}`,
          body: warningData.description.substring(0, 100) + (warningData.description.length > 100 ? "..." : ""),
          related_item_id: warning.id,
          read: false,
        })

      return warning
    } catch (error) {
      console.error("Error creating warning:", error)
      throw error
    }
  },

  updateStatus: async (warningId: string, status: "active" | "resolved" | "dismissed", updateData?: {
    resolvedBy?: string
    resolvedReason?: string
  }) => {
    try {
      const updateObject: any = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (status === "resolved" || status === "dismissed") {
        updateObject.resolved_at = new Date().toISOString()
        if (updateData?.resolvedBy) {
          updateObject.resolved_by = updateData.resolvedBy
        }
        if (updateData?.resolvedReason) {
          updateObject.resolved_reason = updateData.resolvedReason
        }
      }

      const { data, error } = await supabase
        .from("warnings")
        .update(updateObject)
        .eq("id", warningId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error updating warning status:", error)
      throw error
    }
  },

  getById: async (warningId: string) => {
    try {
      const { data, error } = await supabase
        .from("warnings")
        .select("*")
        .eq("id", warningId)
        .single()

      if (error) throw error
      if (!data) throw new Error("Warning not found")

      return data
    } catch (error) {
      console.error("Error getting warning:", error)
      throw error
    }
  },
}

// Time Tracking API
export const timeTrackingAPI = {
  startSession: async (userId: string, userName: string, userRole: string) => {
    try {
      const { data, error } = await supabase
        .from("time_tracking")
        .insert({
          user_id: userId,
          user_name: userName,
          user_role: userRole,
          start_time: new Date().toISOString(),
          end_time: null,
          duration: 0,
          is_active: true,
          device: {
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
            platform: typeof window !== 'undefined' ? window.navigator.platform : 'Unknown'
          },
        })
        .select()
        .single()

      if (error) throw error
      return {
        id: data.id,
        startTime: new Date(data.start_time)
      }
    } catch (error) {
      console.error("Error starting time tracking session:", error)
      throw error
    }
  },

  endSession: async (sessionId: string) => {
    try {
      // Get session data
      const { data: sessionData, error: fetchError } = await supabase
        .from("time_tracking")
        .select("*")
        .eq("id", sessionId)
        .single()

      if (fetchError) throw fetchError
      if (!sessionData) throw new Error("Session not found")

      const startTime = new Date(sessionData.start_time)
      const endTime = new Date()
      const durationMs = endTime.getTime() - startTime.getTime()
      const durationMinutes = Math.floor(durationMs / (1000 * 60))

      const { data, error } = await supabase
        .from("time_tracking")
        .update({
          end_time: endTime.toISOString(),
          duration: durationMinutes,
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId)
        .select()
        .single()

      if (error) throw error

      return {
        id: sessionId,
        endTime,
        duration: durationMinutes
      }
    } catch (error) {
      console.error("Error ending time tracking session:", error)
      throw error
    }
  },

  cleanupStaleSessions: async (userId: string, olderThanHours = 12) => {
    try {
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - olderThanHours)

      const { data: staleSessions, error: fetchError } = await supabase
        .from("time_tracking")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .lt("start_time", cutoffTime.toISOString())

      if (fetchError) throw fetchError

      if (staleSessions && staleSessions.length > 0) {
        for (const session of staleSessions) {
          const startTime = new Date(session.start_time)
          const endTime = new Date(cutoffTime)
          const durationMs = endTime.getTime() - startTime.getTime()
          const durationMinutes = Math.floor(durationMs / (1000 * 60))

          await supabase
            .from("time_tracking")
            .update({
              end_time: cutoffTime.toISOString(),
              duration: durationMinutes,
              is_active: false,
              auto_ended: true,
              updated_at: new Date().toISOString()
            })
            .eq("id", session.id)
        }
      }

      return {
        cleanedSessions: staleSessions?.length || 0
      }
    } catch (error) {
      console.error("Error cleaning up stale sessions:", error)
      return { cleanedSessions: 0 }
    }
  },

  getAllSessions: async (filters?: {
    startDate?: Date
    endDate?: Date
    userId?: string
    department?: string
    limit?: number
  }) => {
    try {
      let query = supabase
        .from("time_tracking")
        .select("*")
        .order("start_time", { ascending: false })

      if (filters) {
        if (filters.userId) {
          query = query.eq("user_id", filters.userId)
        }

        if (filters.startDate) {
          query = query.gte("start_time", filters.startDate.toISOString())
        }

        if (filters.endDate) {
          query = query.lte("start_time", filters.endDate.toISOString())
        }

        if (filters.limit) {
          query = query.limit(filters.limit)
        }
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error getting time tracking sessions:", error)
      throw error
    }
  },

  getTimeAnalytics: async (filters: {
    period: 'daily' | 'weekly' | 'monthly'
    startDate: Date
    endDate: Date
    userId?: string
    department?: string
  }) => {
    try {
      let query = supabase
        .from("time_tracking")
        .select("*")
        .gte("start_time", filters.startDate.toISOString())
        .lte("start_time", filters.endDate.toISOString())
        .eq("is_active", false)

      if (filters.userId) {
        query = query.eq("user_id", filters.userId)
      }

      const { data: sessions, error } = await query

      if (error) throw error
      if (!sessions) return []

      // Process data based on period
      const analyticsData: any = {}

      if (filters.period === 'daily') {
        sessions.forEach((session: { start_time: string; end_time: string | null; duration: number; user_id: string }) => {
          const startTime = new Date(session.start_time)
          const dateKey = startTime.toISOString().split('T')[0]

          if (!analyticsData[dateKey]) {
            analyticsData[dateKey] = {
              date: dateKey,
              totalMinutes: 0,
              totalSessions: 0,
              users: {}
            }
          }

          analyticsData[dateKey].totalMinutes += session.duration || 0
          analyticsData[dateKey].totalSessions += 1

          if (!analyticsData[dateKey].users[session.user_id]) {
            analyticsData[dateKey].users[session.user_id] = {
              userId: session.user_id,
              userName: session.user_name,
              userRole: session.user_role,
              minutes: 0,
              sessions: 0
            }
          }

          analyticsData[dateKey].users[session.user_id].minutes += session.duration || 0
          analyticsData[dateKey].users[session.user_id].sessions += 1
        })
      }

      return Object.values(analyticsData)
    } catch (error) {
      console.error("Error getting time analytics:", error)
      throw error
    }
  }
}

// Departments API
export const departmentsAPI = {
  getAll: async (): Promise<Tables<'departments'>[]> => {
    try {
      const { data, error } = await supabase.from("departments").select("*")

      if (error) {
        console.error("Error getting departments:", error)
        throw error
      }
      return data || []
    } catch (error) {
      console.error("Error getting departments:", error)
      throw error
    }
  },

  createDepartment: async (departmentData: {
    name: string
    description?: string
    head_id?: string | null
    head_name?: string | null
    member_count?: number
  }) => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .insert(departmentData)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating department:", error)
      throw error
    }
  },

  updateDepartment: async (id: string, departmentData: Partial<{
    name: string
    description: string
    head_id: string | null
    head_name: string | null
    member_count: number
  }>) => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .update(departmentData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error updating department:", error)
      throw error
    }
  },

  deleteDepartment: async (id: string) => {
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting department:", error)
      throw error
    }
  },
}

// Teams API
export const teamsAPI = {
  getAll: async () => {
    try {
      const { data, error } = await supabase.from("teams").select("*")

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error getting teams:", error)
      return []
    }
  },

  getDepartments: async () => {
    try {
      const { data, error } = await supabase.from("teams").select("department")

      if (error) throw error
      
      const departments = new Set<string>()
      data?.forEach((team: any) => {
        if (team.department) {
          departments.add(team.department)
        }
      })
      
      return Array.from(departments)
    } catch (error) {
      console.error("Error getting departments from teams:", error)
      return []
    }
  },

  getTeamByLeadId: async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("leader_id", leadId)
        .maybeSingle() // Use maybeSingle instead of single to avoid error when no rows

      if (error) {
        console.error("Error getting team by lead ID:", error.message || error)
        return null
      }
      
      return data
    } catch (error: any) {
      if (error?.message) {
        console.error("Unexpected error getting team by lead ID:", error.message)
      }
      return null
    }
  },

  create: async (data: {
    name: string
    description: string
    department: string
  }) => {
    try {
      const { data: team, error } = await supabase
        .from("teams")
        .insert({
          name: data.name,
          description: data.description,
          department: data.department,
          members: [],
        })
        .select()
        .single()

      if (error) throw error
      return team
    } catch (error) {
      console.error("Error creating team:", error)
      throw error
    }
  },

  update: async (
    id: string,
    data: {
      name?: string
      description?: string
      department?: string
      leaderId?: string
    }
  ) => {
    try {
      const updateData: any = { ...data, updated_at: new Date().toISOString() }
      if (data.leaderId !== undefined) {
        updateData.leader_id = data.leaderId
        delete updateData.leaderId
      }

      const { error } = await supabase
        .from("teams")
        .update(updateData)
        .eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error updating team:", error)
      throw error
    }
  },

  delete: async (id: string) => {
    try {
      const { error } = await supabase.from("teams").delete().eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting team:", error)
      throw error
    }
  },

  // Get team with full member details (names instead of just IDs)
  getTeamWithMembers: async (teamId: string) => {
    try {
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single()

      if (teamError) throw teamError

      // Fetch member details
      if (team.members && team.members.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("uid, name, email, avatar")
          .in("uid", team.members)

        if (usersError) throw usersError

        return {
          ...team,
          members: users || []
        }
      }

      return { ...team, members: [] }
    } catch (error) {
      console.error("Error getting team with members:", error)
      throw error
    }
  },

  // Get team by lead ID with full member details
  getTeamByLeadIdWithMembers: async (leadId: string) => {
    try {
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("leader_id", leadId)
        .maybeSingle()

      if (teamError) {
        console.error("Error getting team by lead ID:", teamError.message || teamError)
        return null
      }

      if (!team) return null

      // Fetch member details
      if (team.members && team.members.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("uid, name, email, avatar")
          .in("uid", team.members)

        if (usersError) throw usersError

        return {
          ...team,
          members: users || []
        }
      }

      return { ...team, members: [] }
    } catch (error: any) {
      if (error?.message) {
        console.error("Unexpected error getting team by lead ID:", error.message)
      }
      return null
    }
  },

  // Add a member to a team
  addMember: async (teamId: string, userId: string) => {
    try {
      // First get the current team to check if member already exists
      const { data: team, error: fetchError } = await supabase
        .from("teams")
        .select("members")
        .eq("id", teamId)
        .single()

      if (fetchError) throw fetchError

      const currentMembers = team.members || []
      
      // Check if user is already a member
      if (currentMembers.includes(userId)) {
        throw new Error("User is already a team member")
      }

      // Add the new member
      const { data, error } = await supabase
        .from("teams")
        .update({ 
          members: [...currentMembers, userId],
          updated_at: new Date().toISOString()
        })
        .eq("id", teamId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error adding member to team:", error)
      throw error
    }
  },

  // Remove a member from a team
  removeMember: async (teamId: string, userId: string) => {
    try {
      // First get the current team
      const { data: team, error: fetchError } = await supabase
        .from("teams")
        .select("members")
        .eq("id", teamId)
        .single()

      if (fetchError) throw fetchError

      const currentMembers = team.members || []
      
      // Remove the member
      const updatedMembers = currentMembers.filter((id: string) => id !== userId)

      const { data, error } = await supabase
        .from("teams")
        .update({ 
          members: updatedMembers,
          updated_at: new Date().toISOString()
        })
        .eq("id", teamId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error removing member from team:", error)
      throw error
    }
  },

  // Get available users that can be added to a team
  getAvailableUsers: async (teamId: string) => {
    try {
      // Get the team to see current members and leader
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("members, department, leader_id")
        .eq("id", teamId)
        .single()

      if (teamError) throw teamError

      const currentMembers = team.members || []
      const teamLeaderId = team.leader_id

      // Get all users in the same department who are not already members
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("uid, name, email, role, department")
        .eq("department", team.department)
        .order("name")

      if (usersError) throw usersError

      // Filter out current members, team lead, and admins
      return (users || []).filter(user => 
        !currentMembers.includes(user.uid) && 
        user.uid !== teamLeaderId &&
        user.role !== 'ADMIN'
      )
    } catch (error) {
      console.error("Error getting available users:", error)
      throw error
    }
  },
}

// Vault API
export const vaultAPI = {
  getAll: async (): Promise<Tables<'vault_items'>[]> => {
    try {
      const { data, error } = await supabase
        .from("vault_items")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error getting vault items:", error)
      throw error
    }
  },

  create: async (data: {
    title: string
    category: 'document' | 'api_key' | 'password' | 'other'
    description?: string | null
    text_value?: string | null
    created_by: string
    created_by_name?: string | null
  }): Promise<Tables<'vault_items'>> => {
    try {
      const { data: item, error } = await supabase
        .from("vault_items")
        .insert({
          title: data.title,
          category: data.category,
          description: data.description || null,
          text_value: data.text_value || null,
          created_by: data.created_by,
          created_by_name: data.created_by_name || null,
        })
        .select()
        .single()

      if (error) throw error
      return item
    } catch (error) {
      console.error("Error creating vault item:", error)
      throw error
    }
  },

  uploadFile: async (
    data: {
      title: string
      category: 'document' | 'api_key' | 'password' | 'other'
      description?: string | null
      created_by: string
      created_by_name?: string | null
    },
    file: File
  ): Promise<Tables<'vault_items'>> => {
    try {
      const ALLOWED_TYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/png",
        "image/jpeg",
        "image/gif"
      ]
      const MAX_SIZE = 10 * 1024 * 1024

      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, PNG, JPEG, GIF.")
      }

      if (file.size > MAX_SIZE) {
        throw new Error("File too large. Maximum size is 10MB.")
      }

      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const filePath = `vault/${data.created_by}/${timestamp}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from("vault")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        console.error("Storage upload error:", uploadError)
        throw new Error("Failed to upload file. Ensure the 'vault' bucket exists in Supabase Storage.")
      }

      const { data: urlData } = supabase.storage
        .from("vault")
        .getPublicUrl(filePath)

      const fileUrl = urlData?.publicUrl || filePath

      const { data: item, error } = await supabase
        .from("vault_items")
        .insert({
          title: data.title,
          category: data.category,
          description: data.description || null,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          created_by: data.created_by,
          created_by_name: data.created_by_name || null,
        })
        .select()
        .single()

      if (error) throw error
      return item
    } catch (error) {
      console.error("Error uploading vault file:", error)
      throw error
    }
  },

  update: async (
    id: string,
    data: Partial<{
      title: string
      category: 'document' | 'api_key' | 'password' | 'other'
      description: string | null
      text_value: string | null
    }>
  ): Promise<Tables<'vault_items'>> => {
    try {
      const updateData: any = { ...data, updated_at: new Date().toISOString() }

      const { data: item, error } = await supabase
        .from("vault_items")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return item
    } catch (error) {
      console.error("Error updating vault item:", error)
      throw error
    }
  },

  delete: async (id: string, fileUrl?: string | null) => {
    try {
      // Delete the file from storage if it exists
      if (fileUrl) {
        const filePath = fileUrl.split('/vault/').pop()
        if (filePath) {
          await supabase.storage
            .from("vault")
            .remove([filePath])
            .catch(err => console.error("Error deleting vault file from storage:", err))
        }
      }

      const { error } = await supabase
        .from("vault_items")
        .delete()
        .eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting vault item:", error)
      throw error
    }
  },

  getSignedUrl: async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("vault")
        .createSignedUrl(filePath, 60)

      if (error) throw error
      return data?.signedUrl || null
    } catch (error) {
      console.error("Error getting signed URL:", error)
      return null
    }
  },
}
