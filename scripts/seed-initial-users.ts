/**
 * Seed Test Users Script
 * Creates one user for each role: CEO, C_LEVEL, LEAD, EMPLOYEE
 * Skips users that already exist (by email) so it's safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/seed-initial-users.ts
 *   npx tsx scripts/seed-initial-users.ts --force    (deletes + recreates all four)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface TestUser {
  email: string
  password: string
  name: string
  role: 'EMPLOYEE' | 'LEAD' | 'C_LEVEL' | 'CEO'
  department: string
}

const testUsers: TestUser[] = [
  {
    email: 'lead@finovasolutions.tech',
    password: 'TestPass123!',
    name: 'Marcus Rivera',
    role: 'LEAD',
    department: 'Engineering'
  },
  {
    email: 'employee@finovasolutions.tech',
    password: 'TestPass123!',
    name: 'Jordan Taylor',
    role: 'EMPLOYEE',
    department: 'Engineering'
  }
]

async function deleteExistingUser(email: string) {
  const { data: existing } = await supabase
    .from('users')
    .select('uid')
    .eq('email', email)
    .single()

  if (existing?.uid) {
    await supabase.auth.admin.deleteUser(existing.uid)
    console.log(`   🗑  Deleted existing auth + db user for ${email}`)
  }
}

async function seedUsers(force: boolean) {
  console.log('🌱 Starting user seeding process...\n')

  let created = 0
  let skipped = 0

  for (const user of testUsers) {
    try {
      // Check if user already exists in the users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('uid, email')
        .eq('email', user.email)
        .single()

      if (existingUser) {
        if (force) {
          await deleteExistingUser(user.email)
        } else {
          console.log(`⏭  Skipping ${user.role} ${user.email} — already exists (use --force to recreate)`)
          skipped++
          continue
        }
      }

      console.log(`Creating ${user.role}: ${user.email}`)

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role,
          department: user.department
        }
      })

      if (authError) {
        console.error(`   ❌ Auth creation failed: ${authError.message}`)
        continue
      }

      if (!authData.user) {
        console.error(`   ❌ No user returned from auth creation`)
        continue
      }

      console.log(`   ✓ Auth user created (ID: ${authData.user.id})`)

      // 2. Insert into users table
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          uid: authData.user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          status: 'active',
          email_verified: true,
          avatar: null
        })

      if (dbError) {
        console.error(`   ❌ Database insert failed: ${dbError.message}`)
        await supabase.auth.admin.deleteUser(authData.user.id)
        console.log(`   ⚠️  Cleaned up auth user`)
        continue
      }

      console.log(`   ✓ Database record created`)
      console.log(`   ✅ ${user.role} user created successfully\n`)
      created++

    } catch (error) {
      console.error(`   ❌ Unexpected error: ${error}\n`)
    }
  }

  console.log('🎉 User seeding completed!')
  console.log(`   Created: ${created}  |  Skipped: ${skipped}\n`)
  console.log('📝 Test Credentials:')
  console.log('='.repeat(68))
  console.log(`${'ROLE'.padEnd(12)} ${'EMAIL'.padEnd(36)} ${'PASSWORD'}`)
  console.log('-'.repeat(68))
  testUsers.forEach(user => {
    console.log(`${user.role.padEnd(12)} ${user.email.padEnd(36)} ${user.password}`)
  })
  console.log('='.repeat(68))
  console.log('\n💡 Login with any of these credentials at http://localhost:3000/login')
}

const force = process.argv.includes('--force')
seedUsers(force)
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
