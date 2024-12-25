// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js@2";

import nodemailer from "npm:nodemailer@6.9.10";
import * as postgres from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const defaultCategoryList = [
  {
    category_name: "Breakfast",
    type: "WEEKLY",
    icon: "🍞",
    background_color: "#BDB76B",
  },
  {
    category_name: "Lunch",
    type: "WEEKLY",
    icon: "🍚",
    background_color: "#000000",
  },
  {
    category_name: "Dinner",
    type: "WEEKLY",
    icon: "🍱",
    background_color: "#993366",
  },
  {
    category_name: "Snacks",
    type: "WEEKLY",
    icon: "🍿",
    background_color: "#000080",
  },
  {
    category_name: "Petrol / Diesel",
    type: "WEEKLY",
    icon: "⛽️",
    background_color: "#FFFF00",
  },

  {
    category_name: "Travel",
    type: "MONTHLY",
    icon: "🚗",
    background_color: "#008000",
  },
  {
    category_name: "Rent",
    type: "MONTHLY",
    icon: "🏠",
    background_color: "#660066",
  },
  {
    category_name: "Electricity Bill",
    type: "MONTHLY",
    icon: "⚡️",
    background_color: "#000080",
  },
  {
    category_name: "Recharge",
    type: "MONTHLY",
    icon: "📞",
    background_color: "#BDB76B",
  },
  {
    category_name: "Shopping",
    type: "MONTHLY",
    icon: "🛍️",
    background_color: "#FF0000",
  },
];

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

const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,

  auth: {
    user: "abraralhasanprogrammer@gmail.com",
    pass: "rnvravtmrigctatz",
  },
});

Deno.serve(async (req) => {
  const { email, userId, name } = await req.json();

  const newUserPayload = {
    name: name,
    email: email,
    auth_user_id: userId,
    user_id: userId,
  };

  const newUser = await supabaseClient.from("users").insert(newUserPayload);

  const userDetailsAfterCreation = await supabaseClient
    .from("users")
    .select()
    .eq("email", newUserPayload?.email?.trim())
    .limit(1)
    .maybeSingle();
  console.log("RE_FETCHED USER DETAILS FROM DB", userDetailsAfterCreation);

  if (userDetailsAfterCreation?.data != null) {
    const categoryPayload = defaultCategoryList?.map((data) => {
      return {
        ...data,
        user_id: userDetailsAfterCreation?.data?.user_id,
      };
    });
    console.log("CATEGORY PAYLOAD", categoryPayload);
    await supabaseClient.from("category").insert(categoryPayload);
  }

  return new Response(
    JSON.stringify({ message: "Account Created Successfully" }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-user-social-login' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
