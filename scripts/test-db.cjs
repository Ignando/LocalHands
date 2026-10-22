
import "dotenv/config";
import { getDbConnection } from "./src/lib/db";

async function testConnection() {
  try {
    const pool = await getDbConnection();

    const result = await pool.request().query(`
      SELECT
        DB_NAME() AS DatabaseName,
        @@SERVERNAME AS ServerName,
        (SELECT COUNT(*) FROM sys.tables) AS TableCount;
    `);

    console.log("Database connection successful!");
    console.table(result.recordset);
  } catch (error) {
    console.error("Database connection failed:");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  }
}

testConnection();
