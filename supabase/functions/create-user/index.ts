// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

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
  "postgresql://postgres.vujcvquohckehaltpjxw:BXxDzsOaWJ9HBeX2@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const pool = new postgres.Pool(databaseUrl, 3, true);

//GENERATE RANDOM PASSWORD
function generateRandomPassword(length = 12) {
  const characters =
    "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%^&*";
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
  const connection = await pool.connect();
  try {
    const result =
      await connection.queryObject`SELECT * from account_creation_requests where is_created = false;`;
    const userList = result.rows;

    userList?.map(async (data) => {
      const randomPassword = generateRandomPassword();

      const authDetails = {
        email: data?.email?.trim(),
        password: randomPassword,
      };

      const userCreatedResponse = await supabaseClient.auth.admin.createUser({
        ...authDetails,
        email_confirm: true,
        user_metadata: { name: data?.name },
      });

      console.log(userCreatedResponse);

      if (userCreatedResponse.error === null) {
        const updatedUserResponse = await supabaseClient
          .from("account_creation_requests")
          .delete()
          .eq("email", authDetails?.email);
        const newUserPayload = {
          name: data?.name,
          email: data?.email,
          auth_user_id: userCreatedResponse?.data?.user?.id,
        };
        console.log("NEW USER PAYLOAD FOR USERS TABLE", newUserPayload);
        const newUser = await supabaseClient
          .from("users")
          .insert(newUserPayload);

        const userDetailsAfterCreation = await supabaseClient
          .from("users")
          .select()
          .eq("email", newUserPayload?.email?.trim())
          .limit(1)
          .maybeSingle();
        console.log(
          "RE_FETCHED USER DETAILS FROM DB",
          userDetailsAfterCreation
        );
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
        console.log(
          `The Temporary Password for ${authDetails?.email} is ${randomPassword}`
        );
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Temporary Password</title>
  <style>
  * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, sans-serif;
      color: #333;
      background-color: #f9f9f9;
      margin: 0;
      padding: 0;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 30px auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #17B169;
      padding: 15px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      margin: 0;
    }
    .content {
      padding: 20px;
      text-align: center;
    }
    .temp-password {
      font-size: 24px;
      font-weight: bold;
      color: #17B169;
      background-color: #f2f9f4;
      padding: 10px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      font-size: 14px;
      color: #888;
      text-align: center;
      padding: 10px 0;
      border-top: 1px solid #e6e6e6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Temporary Password</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Here’s your temporary password to access the Money Manager app:</p>
      <div class="temp-password">${randomPassword}</div>
      <p>Please use it to log in and remember to update your password after logging in.</p>
    </div>
    <div class="footer">
      <p>Thank you for using Money Manager!</p>
    </div>
  </div>
</body>
</html>`;
        await transport.sendMail({
          from: "abraralhasanprogrammer@gmail.com",
          to: authDetails?.email,
          subject: "Here's Your Temporary Password - Log in to Money Manager",
          html: htmlContent,
        });
      }
    });
    const body = JSON.stringify({ success: "success" });
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    console.log(error);
  } finally {
    // Release the connection back into the pool
    connection.release();
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-user' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
