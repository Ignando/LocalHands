import { randomUUID } from "node:crypto";
import { test, expect } from "../support/test-fixtures";
import { passwordFor, signIn, signInFixture, signOut } from "../support/test-actions";
import { withTestDatabase } from "../support/test-database";

test("TC-01 — customer registration, role-based sign-in, bad password and sign-out", async ({
  page,
}) => {
  const email = `pw.registered.${randomUUID()}@localhands.test`;
  const newCustomerPassword = passwordFor("customer");
  await page.goto("/signin");
  await page.getByRole("button", { name: "Create a customer account" }).click();
  await page.getByLabel("Full name").fill("Playwright Registered Customer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(newCustomerPassword);
  await page.getByRole("button", { name: "Create customer account" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await signOut(page);

  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Definitely-Wrong-Password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await signIn(page, email, newCustomerPassword);
  await signOut(page);

  for (const role of ["customer", "worker", "admin"] as const) {
    await signInFixture(page, role);
    await expect(
      page.getByText(role[0]!.toUpperCase() + role.slice(1), { exact: true }),
    ).toBeVisible();
    await signOut(page);
  }

  await page.goto("/");
  await page.goto("/worker-dashboard");
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);

  const registered = await withTestDatabase(async (pool) =>
    pool.request().input("Email", email).query<{ Role: string; SessionCount: number }>(`
      SELECT u.Role, (SELECT COUNT(*) FROM dbo.UserSessions s WHERE s.UserId = u.UserId AND s.RevokedAt IS NULL) AS SessionCount
      FROM dbo.Users u WHERE u.Email = @Email
    `),
  );
  expect(registered.recordset[0]?.Role).toBe("Customer");
  expect(registered.recordset[0]?.SessionCount).toBe(0);
});
