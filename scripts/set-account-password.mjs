import "dotenv/config";
import { randomBytes, scrypt } from "node:crypto";
import { stdin, stdout } from "node:process";
import { promisify } from "node:util";
import sql from "mssql/msnodesqlv8.js";

const scryptAsync = promisify(scrypt);
const email = process.env["LOCALHANDS_ACCOUNT_EMAIL"]?.trim().toLowerCase();

function readHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal to enter the password safely");
  }
  return new Promise((resolve, reject) => {
    let password = "";
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    const finish = (error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
      stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };
    const onData = (input) => {
      for (const character of input.toString("utf8")) {
        if (character === "\u0003") return finish(new Error("Cancelled"));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") {
          if (password.length) {
            password = password.slice(0, -1);
            stdout.write("\b \b");
          }
        } else if (character >= " ") {
          password += character;
          stdout.write("*");
        }
      }
    };
    stdin.on("data", onData);
  });
}

if (!email) {
  console.error("Set LOCALHANDS_ACCOUNT_EMAIL to an existing account email first.");
  process.exitCode = 1;
} else {
  let pool;
  try {
    const password = await readHidden("New password (12–128 characters): ");
    const confirmation = await readHidden("Confirm password: ");
    if (password.length < 12 || password.length > 128) {
      throw new Error("Password must be 12–128 characters");
    }
    if (password !== confirmation) throw new Error("Passwords do not match");

    pool = await new sql.ConnectionPool({
      connectionString: [
        `Driver={${process.env["DB_DRIVER"]}}`,
        `Server=${process.env["DB_SERVER"]}`,
        `Database=${process.env["DB_DATABASE"]}`,
        "Trusted_Connection=yes",
        "Encrypt=yes",
        "TrustServerCertificate=yes",
      ].join(";") + ";",
    }).connect();

    const salt = randomBytes(16);
    const derived = await scryptAsync(password.normalize("NFKC"), salt, 64, {
      N: 16_384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
    const passwordHash = `scrypt$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
    const result = await pool
      .request()
      .input("Email", sql.NVarChar(254), email)
      .input("PasswordHash", sql.NVarChar(512), passwordHash)
      .query(`
        UPDATE dbo.Users
        SET PasswordHash = @PasswordHash, UpdatedAt = SYSUTCDATETIME()
        WHERE Email = @Email AND Role IN (N'Admin', N'Worker', N'Customer') AND IsActive = 1;
        UPDATE dbo.UserSessions
        SET RevokedAt = SYSUTCDATETIME()
        WHERE UserId = (SELECT UserId FROM dbo.Users WHERE Email = @Email)
          AND RevokedAt IS NULL;
      `);

    if (!result.rowsAffected[0]) {
      throw new Error("No active account matched that email");
    }
    console.log(`Password set for ${email}. Existing sessions were revoked.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await pool?.close();
  }
}
