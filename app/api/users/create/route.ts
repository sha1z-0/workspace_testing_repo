import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    // Check if environment variables are set
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return NextResponse.json(
        { message: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    const { name, email, password, role, department } = await request.json()

    // Validate required fields
    if (!name || !email || !password || !role || !department) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Supabase admin client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        department
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return NextResponse.json(
        { message: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: 'Failed to create auth user' },
        { status: 500 }
      )
    }

    // Insert into users table
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        uid: authData.user.id,
        name,
        email,
        role,
        department,
        status: 'active',
        email_verified: true,
        avatar: null
      })

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Clean up auth user if database insert fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { message: dbError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name,
          role,
          department
        }
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
