#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzkbwfajlcekiazbjdhn.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6a2J3ZmFqbGNla2lhemJqZGhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE3MjQ3MiwiZXhwIjoyMDc0NzQ4NDcyfQ.iCFOLxbqL2SZ-PJQSoAg2r7hWyCPHUHK0PDlv6T26qE'

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, serviceRoleKey)

const sqlFixes = [
  {
    name: "Add 'trial' to subscription_tier enum",
    sql: "ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'trial';"
  },
  {
    name: "Create user profile creation function",
    sql: `CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    avatar_url,
    subscription_tier,
    subscription_status,
    created_at,
    updated_at,
    last_active_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'free'::subscription_tier,
    'inactive'::subscription_status,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`
  },
  {
    name: "Create trigger to automatically create user profile",
    sql: `DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();`
  },
  {
    name: "Update RLS policies to allow user creation",
    sql: `DROP POLICY IF EXISTS users_insert ON users;
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (
  auth.uid() = id OR 
  auth.role() = 'service_role'
);`
  },
  {
    name: "Grant permissions to trigger function",
    sql: `ALTER FUNCTION handle_new_user() SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;`
  }
]

async function runDatabaseFixes() {
  console.log('🔧 Running Database Fixes...')
  console.log('============================')
  console.log('')

  for (let i = 0; i < sqlFixes.length; i++) {
    const fix = sqlFixes[i]
    console.log(`${i + 1}. ${fix.name}...`)
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: fix.sql
      })
      
      if (error) {
        console.log(`   ⚠️  ${error.message}`)
        // Try alternative method for some fixes
        if (error.message.includes('function "exec_sql" does not exist')) {
          console.log('   📝 Please run this SQL manually in Supabase SQL Editor:')
          console.log(`   ${fix.sql}`)
          console.log('')
          continue
        }
      } else {
        console.log('   ✅ Success')
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`)
      console.log('   📝 Please run this SQL manually in Supabase SQL Editor:')
      console.log(`   ${fix.sql}`)
      console.log('')
    }
  }

  console.log('')
  console.log('🎉 Database fixes attempt completed!')
  console.log('')
  console.log('If any fixes failed, please run them manually in:')
  console.log('https://wzkbwfajlcekiazbjdhn.supabase.co/project/_/sql')
}

runDatabaseFixes().catch(console.error)