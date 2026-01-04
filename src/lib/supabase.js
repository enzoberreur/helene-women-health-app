import { createClient } from '@supabase/supabase-js';

// ⚠️ IMPORTANT: Remplacez ces valeurs par vos propres clés Supabase
// Vous les trouverez dans votre dashboard Supabase: Settings > API
const SUPABASE_URL = 'https://kbmdfrknotewmonzuaev.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibWRmcmtub3Rld21vbnp1YWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDQwOTksImV4cCI6MjA4MzEyMDA5OX0.aN8yPvM-CqFTS_PGbT2VsEZssysvAsO3PQuFdmPtLFM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
