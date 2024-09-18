// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

console.log("Hello from Functions!");

import { createClient } from "jsr:@supabase/supabase-js@2";

import nodemailer from "npm:nodemailer@6.9.10";
import * as postgres from "https://deno.land/x/postgres@v0.17.0/mod.ts";

//CONNECT TO SUPABASE CLIENT
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1amN2cXVvaGNrZWhhbHRwanh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUyNDU3NjksImV4cCI6MjA0MDgyMTc2OX0.a9ViuHNS8a8TA0p5-B6FT7itCNKuz4QFkosjTuHYmO0",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1amN2cXVvaGNrZWhhbHRwanh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTI0NTc2OSwiZXhwIjoyMDQwODIxNzY5fQ.nRlmFPfpOCKUTAxj7DU5c9Q5W3xM0_1jrqiDryjTZCc",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// CONNECT TO DATA BASE
const databaseUrl =
  Deno.env.get("DB_URL") ??
  "postgresql://postgres.vujcvquohckehaltpjxw:PicEw3CUQMDqNuVx@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const pool = new postgres.Pool(databaseUrl, 3, true);

//GENERATE RANDOM PASSWORD
function generateRandomPassword(length = 12) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let randomPassword = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomPassword += characters[randomIndex];
  }

  return randomPassword;
}

const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,

  auth: {
    user: "abraralhasanprogrammer@gmail.com", // SendGrid SMTP username
    pass: "rnvravtmrigctatz", // SendGrid SMTP password
  },
});

Deno.serve(async (req) => {
  const request = await req.json();
  const connection = await pool.connect();

  const userDetails = await supabaseClient
    .from("users")
    .select()
    .eq("email", request?.email?.trim())
    .limit(1)
    .maybeSingle();
  console.log("USER DETAILS",userDetails);
  let responseData = {
    error: false,
    message: "Password Reset Successfull",
  };

  if (userDetails?.data === null) {
    responseData = {
      error: true,
      message: "Email Id not found",
    };
    return new Response(JSON.stringify(responseData), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const randomPassword = generateRandomPassword();

  const authDetails = {
    email: request?.email?.trim(),
    password: randomPassword,
  };
  console.log({ authDetails });
  const deletedUser = await supabaseClient.auth.admin.deleteUser(
    userDetails?.data?.auth_user_id
  );

  console.log("DELETED USER", deletedUser);

  if (deletedUser?.error == null) {
    const userCreatedResponse = await supabaseClient.auth.admin.createUser({
      ...authDetails,
      email_confirm: true,
      user_metadata: { name: userDetails?.name },
    });

    console.log("USER CREATED", userCreatedResponse);

    if (userCreatedResponse?.error === null) {
      const updatedUserResponse = await supabaseClient
        .from("users")
        .update({ auth_user_id: userCreatedResponse?.data?.user?.id })
        .eq("auth_user_id", userDetails?.data?.auth_user_id);

      console.log("UPDATED USER", updatedUserResponse);

      if (userCreatedResponse.error === null) {
        await transport.sendMail({
          from: "abraralhasanprogrammer@gmail.com",
          to: authDetails?.email,
          subject: "WELCOME TO MONEY MANAGER - PASSWORD",
          text: `The Temporary Password is ${randomPassword}. You can login with this Password and change it in settings`,
        });
      }
    }
  }

  return new Response(JSON.stringify(responseData), {
    headers: { "Content-Type": "application/json" },
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/forgot-password' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
