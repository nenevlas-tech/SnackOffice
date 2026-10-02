import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://qlebxnbsijuaxtqfdald.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_ST7ocOrKh5XnVkwH_oNZ6Q_SRj35AGv";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("☁️ Conexión con Supabase preparada");
