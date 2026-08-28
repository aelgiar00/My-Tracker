import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://baxlvsmaxzvpfnyahyku.supabase.co";
const supabaseAnonKey = "sb_publishable_MWL1Tv4asi-aj34T7WxvSw_HqxU8TWm"; // ضع المفتاح هنا بين علامتي التنصيص

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
