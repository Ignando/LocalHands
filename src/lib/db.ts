import "dotenv/config";
import sql from "mssql/msnodesqlv8";

let pool: sql.ConnectionPool | null = null;

function checkDbEnvironment(): void {
  console.log(
    "DB_SERVER configured:",
    Boolean(process.env["DB_SERVER"])
  );
  console.log(
    "DB_DATABASE configured:",
    Boolean(process.env["DB_DATABASE"])
  );
  console.log(
    "DB_DRIVER configured:",
    Boolean(process.env["DB_DRIVER"])
  );
}

export async function getDbConnection(): Promise<sql.ConnectionPool> {
  checkDbEnvironment();

  if (pool?.connected) {
    return pool;
  }

  const connectionString = [
    `Driver={${process.env["DB_DRIVER"]}}`,
    `Server=${process.env["DB_SERVER"]}`,
    `Database=${process.env["DB_DATABASE"]}`,
    "Trusted_Connection=yes",
    "Encrypt=yes",
    "TrustServerCertificate=yes",
  ].join(";") + ";";

  const config = {
    connectionString,
  };

  pool = await new sql.ConnectionPool(
    config as unknown as ConstructorParameters<
      typeof sql.ConnectionPool
    >[0]
  ).connect();

  return pool;
}
