export default async function processPaytmFile(jsonData, userId, fileName) {
  const transactions = jsonData
    .filter((row) => {
      const amount = parseFloat(row["Amount"] || 0);
      return amount < 0; // Debit transactions
    })
    .map((row) => {
      console.log(
        row["Date"],
        row["Amount"],
        row["Remarks"],
        row["Transaction Details"]
      );
      const date = row["Date"];
      const time = row["Time"];
      const dateTimeString = `${date} ${time}`;

      // Parse the date-time string into a JavaScript Date object
      const formattedDate = new Date(
        dateTimeString.replace(/(\d+)\/(\d+)\/(\d+)/, "$2/$1/$3")
      );

      return {
        date: `${row["Date"].split("/").reverse().join("-")}`,
        amount: Math.abs(parseFloat(row["Amount"] || 0)), // Remove negative sign
        description: row["Remarks"] || row["Transaction Details"],
        user_id: userId,
        file_name: fileName,
        transaction_date: formattedDate,
      };
    });

  return transactions;
}
