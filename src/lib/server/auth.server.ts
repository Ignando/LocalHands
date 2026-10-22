import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import sql from "mssql/msnodesqlv8";

import type { AccountRole, AuthenticatedAccount } from "@/lib/auth-types";
import { getDbConnection } from "@/lib/db";

const SESSION_COOKIE = "localhands_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const PASSWORD_MAX_LENGTH = 128;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 6;
const loginFailures = new Map<string, { count: number; expiresAt: number }>();
const DUMMY_SALT = Buffer.alloc(16, 0x5a);

type DatabaseRole = "Customer" | "Worker" | "Admin";
type AuthenticatedUser = AuthenticatedAccount & { userId: number };
type UserRow = {
  UserId: number;
  FullName: string;
  Email: string;
  PasswordHash: string | null;
  Role: DatabaseRole;
  IsActive: boolean | number;
};
type SessionRow = Omit<UserRow, "PasswordHash"> & { PublicId: string | null };

function derivePasswordKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derivePasswordKey(password, salt);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

async function verifyPassword(password: string, storedHash: string | null): Promise<boolean> {
  if (!storedHash) {
    await derivePasswordKey(password, DUMMY_SALT);
    return false;
  }
  const [algorithm, encodedSalt, encodedKey] = storedHash.split("$");
  if (algorithm !== "scrypt" || !encodedSalt || !encodedKey) return false;

  try {
    const salt = Buffer.from(encodedSalt, "base64url");
    const expectedKey = Buffer.from(encodedKey, "base64url");
    if (salt.length !== 16 || expectedKey.length !== 64) return false;
    const actualKey = await derivePasswordKey(password, salt);
    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}

function toAccountRole(role: DatabaseRole): AccountRole {
  if (role === "Admin") return "admin";
  if (role === "Worker") return "worker";
  return "customer";
}

function toPublicAccount(user: AuthenticatedUser): AuthenticatedAccount {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    workerPublicId: user.workerPublicId,
  };
}

function hashSessionToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

async function startSession(userId: number): Promise<void> {
  const pool = await getDbConnection();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await pool
    .request()
    .input("TokenHash", sql.VarBinary(32), hashSessionToken(token))
    .input("UserId", sql.Int, userId)
    .input("ExpiresAt", sql.DateTime2, expiresAt)
    .query(`
      INSERT dbo.UserSessions (TokenHash, UserId, ExpiresAt)
      VALUES (@TokenHash, @UserId, @ExpiresAt)
    `);

  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token || token.length > 100) return null;

  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input("TokenHash", sql.VarBinary(32), hashSessionToken(token))
    .query<SessionRow>(`
      SELECT u.UserId, u.FullName, u.Email, u.Role, u.IsActive, w.PublicId
      FROM dbo.UserSessions s
      INNER JOIN dbo.Users u ON u.UserId = s.UserId
      LEFT JOIN dbo.Workers w ON w.UserId = u.UserId
      WHERE s.TokenHash = @TokenHash
        AND s.RevokedAt IS NULL
        AND s.ExpiresAt > SYSUTCDATETIME()
        AND u.IsActive = 1
    `);

  const row = result.recordset[0];
  if (!row) {
    deleteCookie(SESSION_COOKIE, { path: "/" });
    return null;
  }

  return {
    userId: row.UserId,
    name: row.FullName,
    email: row.Email,
    role: toAccountRole(row.Role),
    workerPublicId: row.PublicId,
  };
}

async function getAuthenticatedUserById(
  userId: number,
): Promise<AuthenticatedUser | null> {
  const pool = await getDbConnection();
  const result = await pool
    .request()
    .input("UserId", sql.Int, userId)
    .query<SessionRow>(`
      SELECT u.UserId, u.FullName, u.Email, u.Role, u.IsActive, w.PublicId
      FROM dbo.Users u
      LEFT JOIN dbo.Workers w ON w.UserId = u.UserId
      WHERE u.UserId = @UserId AND u.IsActive = 1
    `);
  const row = result.recordset[0];
  if (!row) return null;

  return {
    userId: row.UserId,
    name: row.FullName,
    email: row.Email,
    role: toAccountRole(row.Role),
    workerPublicId: row.PublicId,
  };
}

export async function requireRole(...roles: AccountRole[]): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Authentication required");
  if (!roles.includes(user.role)) throw new Error("You are not allowed to perform this action");
  return user;
}

export const getCurrentAccount = createServerFn().handler(async () => {
  const user = await getAuthenticatedUser();
  return user ? toPublicAccount(user) : null;
});

const signInInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export const signIn = createServerFn({ method: "POST" })
  .validator(signInInput)
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    const attempt = loginFailures.get(email);
    if (attempt && attempt.expiresAt > Date.now() && attempt.count >= LOGIN_MAX_FAILURES) {
      throw new Error("Too many failed attempts. Try again in 15 minutes.");
    }

    const pool = await getDbConnection();
    const result = await pool
      .request()
      .input("Email", sql.NVarChar(254), email)
      .query<UserRow>(`
        SELECT UserId, FullName, Email, PasswordHash, Role, IsActive
        FROM dbo.Users
        WHERE Email = @Email
      `);

    const user = result.recordset[0];
    const validPassword = await verifyPassword(data.password, user?.PasswordHash ?? null);
    if (!user || !validPassword || !user.IsActive) {
      const current = loginFailures.get(email);
      const count = current && current.expiresAt > Date.now() ? current.count + 1 : 1;
      loginFailures.set(email, { count, expiresAt: Date.now() + LOGIN_WINDOW_MS });
      throw new Error("Invalid email or password");
    }

    loginFailures.delete(email);
    await startSession(user.UserId);
    const authenticatedUser = await getAuthenticatedUserById(user.UserId);
    if (!authenticatedUser) throw new Error("Could not create a sign-in session");
    return toPublicAccount(authenticatedUser);
  });

const registerInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(PASSWORD_MAX_LENGTH),
});

export const registerCustomer = createServerFn({ method: "POST" })
  .validator(registerInput)
  .handler(async ({ data }) => {
    const pool = await getDbConnection();
    const email = data.email.toLowerCase();
    const existing = await pool
      .request()
      .input("Email", sql.NVarChar(254), email)
      .query<{ UserId: number }>("SELECT UserId FROM dbo.Users WHERE Email = @Email");
    if (existing.recordset.length) throw new Error("An account with that email already exists");

    const passwordHash = await hashPassword(data.password);
    const created = await pool
      .request()
      .input("FullName", sql.NVarChar(100), data.name)
      .input("Email", sql.NVarChar(254), email)
      .input("PasswordHash", sql.NVarChar(512), passwordHash)
      .query<{ UserId: number }>(`
        INSERT dbo.Users (FullName, Email, PasswordHash, Role)
        OUTPUT INSERTED.UserId
        VALUES (@FullName, @Email, @PasswordHash, N'Customer')
      `);

    const userId = created.recordset[0]?.UserId;
    if (!userId) throw new Error("Could not create the account");
    await startSession(userId);
    const authenticatedUser = await getAuthenticatedUserById(userId);
    if (!authenticatedUser) throw new Error("Could not create a sign-in session");
    return toPublicAccount(authenticatedUser);
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    const pool = await getDbConnection();
    await pool
      .request()
      .input("TokenHash", sql.VarBinary(32), hashSessionToken(token))
      .query(`
        UPDATE dbo.UserSessions
        SET RevokedAt = SYSUTCDATETIME()
        WHERE TokenHash = @TokenHash AND RevokedAt IS NULL
      `);
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return null;
});
