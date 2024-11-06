// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

console.log("Hello from Functions!");

import { createClient } from "jsr:@supabase/supabase-js@2";

import * as postgres from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1amN2cXVvaGNrZWhhbHRwanh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUyNDU3NjksImV4cCI6MjA0MDgyMTc2OX0.a9ViuHNS8a8TA0p5-B6FT7itCNKuz4QFkosjTuHYmO0",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1amN2cXVvaGNrZWhhbHRwanh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTI0NTc2OSwiZXhwIjoyMDQwODIxNzY5fQ.nRlmFPfpOCKUTAxj7DU5c9Q5W3xM0_1jrqiDryjTZCc",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const databaseUrl =
  Deno.env.get("DB_URL") ??
  "postgresql://postgres.vujcvquohckehaltpjxw:BXxDzsOaWJ9HBeX2@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const pool = new postgres.Pool(databaseUrl, 3, true);

Deno.serve(async (req) => {
  const connection = await pool.connect();
  const { email } = await req.json();

  const deletionRequest = await supabaseClient
    .from("account_deletion_requests")
    .insert({ email });

  console.log(deletionRequest);

  const data = {
    message: `Request To Delete the Account has initialized for ${email}!`,
  };

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/delete-user' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
