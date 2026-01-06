// Expo config with environment-based secrets.
// Loads .env locally (ignored by git) and exposes only EXPO_PUBLIC_* values.

require('dotenv').config();

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash',
  },
});
