import { createClient } from '@supabase/supabase-js';

// ⚠️ IMPORTANT: Remplacez ces valeurs par vos propres clés Supabase
// Vous les trouverez dans votre dashboard Supabase: Settings > API
const SUPABASE_URL = 'https://pfwbgyrsfjhkhpmisxpg.supabase.co'; // ex: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmd2JneXJzZmpoa2hwbWlzeHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzI4NzEsImV4cCI6MjA3ODYwODg3MX0._BhzfDnnuAlXwdQnOsoGAyP5c-J4xVR-tNVGGI_eAWc'; // ex: eyJhbGc...

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
