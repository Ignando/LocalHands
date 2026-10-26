import type { Page } from "@playwright/test";
import { expect } from "./test-fixtures";
import { getTestPasswords, TEST_ACCOUNTS } from "./test-data";

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/signin");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/signin$/);
}

export function passwordFor(role: "customer" | "worker" | "admin"): string {
  return getTestPasswords()[role];
}

export async function signInFixture(page: Page, role: keyof typeof TEST_ACCOUNTS): Promise<void> {
  const account = TEST_ACCOUNTS[role];
  const password =
    role === "worker"
      ? passwordFor("worker")
      : role === "admin"
        ? passwordFor("admin")
        : passwordFor("customer");
  await signIn(page, account.email, password);
}

export async function selectAvailableHours(page: Page, count: number): Promise<string[]> {
  const dates = page.locator('section[aria-label="Choose a booking date"] button');
  await expect(dates.nth(1)).toBeVisible();
  await dates.nth(1).click();
  const hours = page.locator('section[aria-label="Choose available hours"] button');
  await expect(hours.first()).toBeVisible();
  const availableCount = await hours.count();
  if (availableCount < count)
    throw new Error(`Only ${availableCount} available test hours were rendered.`);
  const labels: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const button = hours.nth(index);
    labels.push((await button.innerText()).trim());
    await button.click();
  }
  return labels;
}

export function parseRandAmount(text: string): number {
  const match = text.match(/R\s*([\d,]+(?:\.\d{2})?)/i);
  if (!match?.[1]) throw new Error(`Could not parse Rand amount from visible text: ${text}`);
  return Number(match[1].replaceAll(",", ""));
}
