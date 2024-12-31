// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

Deno.serve(async (req) => {
  const { userId, fileName } = await req.json();

  console.log("User ID: ", userId);
  console.log("File Name: ", fileName);
  console.log(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  if (!userId || !fileName) {
    return new Response(
      JSON.stringify({ message: "Invalid User Name or File Name" }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  const fileStatusReponse = await supabaseClient
    .from("files_for_processing_transactions")
    .update({ status: "PROCESSING" })
    .eq("uniqueName", fileName);
  console.log("File Status Response: ", fileStatusReponse);
  const transactionForSync = await supabaseClient
    .from("processed_transactions")
    .select()
    .not("category_id", "is", null)
    .eq("user_id", userId)
    .eq("file_name", fileName)
    .eq("synced", false);
  console.log("transactionForSync Response: ", transactionForSync);
  if (transactionForSync?.error != null) {
    await supabaseClient
      .from("files_for_processing_transactions")
      .update({ status: "PROCESSING" })
      .eq("uniqueName", fileName);

    console.log(
      "Error Fetching Unsynced Data from the Processed Transaction Table",
      transactionForSync.error
    );
    return new Response(
      JSON.stringify({
        message:
          "Error Fetching Unsynced Data from the Processed Transaction Table",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  for (let i = 0; i < transactionForSync.data.length; i++) {
    const transaction = transactionForSync.data[i];
    const payload = {
      category_id: transaction?.category_id,
      description: transaction?.description,
      date: transaction?.date,
      amount: transaction?.amount,
      user_id: transaction?.user_id,
      category_type: transaction?.category_type,
    };
    const uploadedTransaction = await supabaseClient
      .from("transactions")
      .insert(payload);
    if (uploadedTransaction?.error != null) {
      console.log(
        "Error Uploading Data to Transaction Table",
        uploadedTransaction.error,
        paylaod
      );
      continue;
    }

    await supabaseClient
      .from("processed_transactions")
      .update({ synced: true })
      .eq("id", transaction.id);
  }

  const transactionForSyncRecheck = await supabaseClient
    .from("processed_transactions")
    .select()
    .eq("user_id", userId)
    .eq("file_name", fileName)
    .eq("synced", false);

  console.log("transactionForSyncRecheck", transactionForSyncRecheck);

  if (transactionForSyncRecheck.data.length === 0) {
    await supabaseClient
      .from("files_for_processing_transactions")
      .update({ status: "SYNCHED" })
      .eq("uniqueName", fileName);
    return new Response(JSON.stringify({ message: "Data Sync Completed" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  await supabaseClient
    .from("files_for_processing_transactions")
    .update({ status: "PROCESSED" })
    .eq("uniqueName", fileName);

  return new Response(JSON.stringify({ message: "Data Sync Completed" }), {
    headers: { "Content-Type": "application/json" },
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sync-transaction' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"userId":"014fa2f2-079f-47cb-bf9e-1445da1f8ce2","fileName":"file_20241228123502525_mfnajc0t.xlsx"}'

*/
