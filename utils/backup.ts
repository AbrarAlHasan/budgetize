import { File, Paths } from "expo-file-system";

export async function backupSqlLiteData(): Promise<string | null> {
  try {
    const uri = Paths.document.uri;
    const dbPath = `${uri}/SQLite/budgetize.db`;

    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/T/, "-") // Replace T with dash
      .replace(/:/g, "-") // Replace colons with dashes
      .replace(/\.\d{3}Z$/, ""); // Remove milliseconds and Z

    const backupFileName = `backup-${timestamp}.db`;
    const backupPath = `${uri}/SQLite/${backupFileName}`;

    console.log(uri);

    const sourceFile = new File(dbPath);

    const destinationFile = new File(backupPath);

    sourceFile.copy(destinationFile);

    return destinationFile.uri;
  } catch (error) {
    console.log("ERROR IN GETTING SQLITE DATA", error);
    return null;
  }
}
