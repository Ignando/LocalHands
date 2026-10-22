import "dotenv/config";
import sql from "mssql/msnodesqlv8";

let pool: sql.ConnectionPool | null = null;
let poolPromise: Promise<sql.ConnectionPool> | null = null;

export async function getDbConnection(): Promise<sql.ConnectionPool> {
  if (pool?.connected) return pool;

  const required = ["DB_SERVER", "DB_DATABASE", "DB_DRIVER"] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing database configuration: ${missing.join(", ")}`);
  }

  if (!poolPromise) {
    const connectionString = [
      `Driver={${process.env["DB_DRIVER"]}}`,
      `Server=${process.env["DB_SERVER"]}`,
      `Database=${process.env["DB_DATABASE"]}`,
      "Trusted_Connection=yes",
      "Encrypt=yes",
      "TrustServerCertificate=yes",
    ].join(";") + ";";

    poolPromise = new sql.ConnectionPool({
      connectionString,
    } as unknown as ConstructorParameters<typeof sql.ConnectionPool>[0])
      .connect()
      .then((connectedPool) => {
        pool = connectedPool;
        return connectedPool;
      });
  }

  try {
    return await poolPromise;
  } catch (error) {
    poolPromise = null;
    pool = null;
    throw error;
  }
}
