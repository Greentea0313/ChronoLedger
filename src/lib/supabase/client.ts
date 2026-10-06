import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://placeholder'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

const isTauriRuntime =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: isTauriRuntime ? 'implicit' : 'pkce',
    detectSessionInUrl: false,
  },
})