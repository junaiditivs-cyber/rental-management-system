import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from("cities")
  .select("*")
  .limit(5);

if (error) {
  console.error("Supabase connection error:", error.message);
} else {
  console.log("Supabase connected successfully.");
  console.log("Cities data:", data);
}