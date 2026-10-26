import "dotenv/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { getTestDatabaseSettings } from "./support/test-data";

const configDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(configDir, "..");
const testDatabase = getTestDatabaseSettings();
const databaseOnly = process.argv.some((argument) => argument === "--project=database");
const appEnv: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  ),
  DB_SERVER: testDatabase.server,
  DB_DATABASE: testDatabase.database,
  DB_DRIVER: testDatabase.driver,
};

export default defineConfig({
  testDir: configDir,
  testMatch: ["system/**/*.spec.ts", "database/**/*.spec.ts"],
  globalSetup: resolve(configDir, "global-setup.ts"),
  globalTeardown: resolve(configDir, "global-teardown.ts"),
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env["CI"]),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  outputDir: resolve(configDir, "reports/test-results"),
  reporter: [["html", { outputFolder: resolve(configDir, "reports/html"), open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "system",
      testMatch: "system/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "database",
      testMatch: "database/**/*.spec.ts",
    },
  ],
  ...(!databaseOnly
    ? {
        webServer: {
          command: "npm run dev -- --host 127.0.0.1 --port 3000",
          cwd: projectRoot,
          url: "http://127.0.0.1:3000",
          reuseExistingServer: false,
          timeout: 120_000,
          env: appEnv,
        },
      }
    : {}),
});
