import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the user's uid from the users table first
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('uid')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('Error finding user:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete from users table first
    const { error: deleteDbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteDbError) {
      console.error('Error deleting user from database:', deleteDbError)
      return NextResponse.json(
        { error: 'Failed to delete user from database' },
        { status: 500 }
      )
    }

    // Delete from Supabase Auth
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      userData.uid
    )

    if (deleteAuthError) {
      console.error('Error deleting user from auth:', deleteAuthError)
      // Don't return error here since DB deletion succeeded
      // The auth user might already be deleted or not exist
    }

    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully' 
    })

  } catch (error: any) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}
