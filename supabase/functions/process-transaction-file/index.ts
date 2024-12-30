// Import required modules
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import xlsx from "npm:xlsx@0.18.5";
import { createClient } from "jsr:@supabase/supabase-js@2";
import ProcessPaytmTransaction from "./processPaytmFile.ts";

// console.log("Hello from Functions!");

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

Deno.serve(async (req) => {
  try {
    const { userId } = await req.json();
    const unProcesseedData = await supabaseClient
      .from("files_for_processing_transactions")
      .select()
      .eq("status", "NOT_PROCESSED")
      .eq("user_id", userId);

    if (unProcesseedData?.data?.length === 0) {
      // console.log("No files to process");
      return new Response(JSON.stringify({ message: "No files to process" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (unProcesseedData?.error) {
      // console.log(unProcesseedData.error);
      return new Response(
        JSON.stringify({
          message: "Error Fetching Files List From Transaction Table",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    for (let i = 0; i < unProcesseedData.data.length; i++) {
      const transactionFileDetails = unProcesseedData.data[i];
      await supabaseClient
        .from("files_for_processing_transactions")
        .update({ status: "PROCESSING" })
        .eq("uniqueName", transactionFileDetails.uniqueName);

      const fileResponse = await supabaseClient.storage
        .from("transactions")
        .download(transactionFileDetails?.uniqueName);

      const file = fileResponse?.data;

      const arrayBuffer = await file.arrayBuffer();
      try {
        const workbook = xlsx.read(new Uint8Array(arrayBuffer), {
          type: "array",
        });
        // console.log("workbook", workbook);

        // Assuming the first sheet contains the relevant data
        const sheetName = workbook.SheetNames[1];
        // console.log("sheetName", sheetName);

        const worksheet = workbook.Sheets[sheetName];
        // console.log("worksheet", worksheet);

        if (!worksheet) {
          console.log("Un Supoorted File Format");
          await supabaseClient
            .from("files_for_processing_transactions")
            .update({ status: "ERROR" })
            .eq("uniqueName", transactionFileDetails.uniqueName);
          continue;
        }

        // Convert the worksheet to JSON
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        // console.log("jsonData", jsonData);

        const transactions = await ProcessPaytmTransaction(
          jsonData,
          transactionFileDetails?.user_id,
          transactionFileDetails.uniqueName
        );

        // console.log(transactions);

        const insertJsonToTable = await supabaseClient
          .from("processed_transactions")
          .insert(transactions);

        // console.log("insertJsonToTable", insertJsonToTable);

        if (insertJsonToTable?.error == null) {
          await supabaseClient
            .from("files_for_processing_transactions")
            .update({ status: "PROCESSED" })
            .eq("uniqueName", transactionFileDetails.uniqueName);
        } else {
          console.log("Error inserting data to table", insertJsonToTable);
          await supabaseClient
            .from("files_for_processing_transactions")
            .update({ status: "ERROR" })
            .eq("uniqueName", transactionFileDetails.uniqueName);
        }
      } catch (error) {
        console.log("Error In Processing File", error);
        await supabaseClient
          .from("files_for_processing_transactions")
          .update({ status: "ERROR" })
          .eq("uniqueName", transactionFileDetails.uniqueName);
        continue;
      }

      // Parse the Excel file using xlsx
    }

    // Return the processed JSON data
    return new Response(
      JSON.stringify({ message: "Data Processed Scucessfully" }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing file:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

`curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-transaction-file' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'`;
