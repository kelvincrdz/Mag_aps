import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gmpavmyhfjfbqnggyrds.supabase.co";
// Use anon key instead of publishable key for Storage access with RLS
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGF2bXloZmpmYnFuZ2d5cmRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5ODM2NTYsImV4cCI6MjA4MjU1OTY1Nn0.oE67COtkgZjPkbz1_UO_KcckHtZ0K7qQD8oyEiJGd0Y";

export const supabase = createClient(supabaseUrl, supabaseKey);
