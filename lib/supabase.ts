import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gmpavmyhfjfbqnggyrds.supabase.co";
const supabaseKey = "sb_publishable_wHRO9mHnwiWExgVtBZKQIQ_5G19Zpw0";

export const supabase = createClient(supabaseUrl, supabaseKey);
