// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

import * as postgres from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const databaseUrl =
  "postgresql://postgres.vujcvquohckehaltpjxw:PicEw3CUQMDqNuVx@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";
const pool = new postgres.Pool(databaseUrl, 3, true);

Deno.serve(async (req) => {
  const { userId } = await req.json();
  const connection = await pool.connect();
  try {
    // Run a query
    const result = await connection.queryObject`SELECT
  date,
  SUM(amount) AS amount
FROM
  transactions
WHERE
  user_id = ${userId}
GROUP BY
  date;`;
    const transactions = result.rows; // [{ id: 1, name: "Lion" }, ...]

    // Encode the result as pretty printed JSON
    const body = JSON.stringify(
      transactions,
      (key, value) => (typeof value === "bigint" ? value.toString() : value),
      2
    );

    // Return the response with the correct content type header
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get_weekly_grouped_transactions' \
    --header 'Authorization: Bearer ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
