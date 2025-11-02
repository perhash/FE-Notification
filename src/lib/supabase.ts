import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hubaxblrmozsvejhjqet.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YmF4YmxybW96c3ZlamhqcWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNjA3MjIsImV4cCI6MjA3NTkzNjcyMn0.ETKNNvLco2s1Vrgn9BW0t6ZLTneWh0zAOxFlVafWSeQ';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

