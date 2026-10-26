export const TEST_DATABASE_NAME = "LocalHandsDB_Test";
export const TEST_WORKER_PUBLIC_ID = "pw-worker";
export const TEST_STANDARD_SERVICE = "Playwright Standard Service";
export const TEST_PREMIUM_SERVICE = "Playwright Premium Service";

export const TEST_ACCOUNTS = {
  customer: { email: "pw.customer@localhands.test", role: "Customer" as const },
  applicant: { email: "pw.applicant@localhands.test", role: "Customer" as const },
  worker: { email: "pw.worker@localhands.test", role: "Worker" as const },
  admin: { email: "pw.admin@localhands.test", role: "Admin" as const },
};

function requiredTestValue(name: string): string {
  const value = process.env[name]?.trim();
  if (
    !value ||
    value.startsWith("REPLACE_") ||
    value.startsWith("CHANGE_ME_") ||
    value.startsWith("YOUR_")
  ) {
    throw new Error(`Set ${name} in your local .env for the isolated Playwright test environment.`);
  }
  return value;
}

export function getTestDatabaseSettings() {
  const database = process.env["LH_TEST_DB_DATABASE"]?.trim();
  if (database !== TEST_DATABASE_NAME) {
    throw new Error(
      `Refusing test database use: LH_TEST_DB_DATABASE must equal ${TEST_DATABASE_NAME}. ` +
        "Do not point tests at the development/demo database.",
    );
  }
  return {
    server: requiredTestValue("LH_TEST_DB_SERVER"),
    database,
    driver: requiredTestValue("LH_TEST_DB_DRIVER"),
  };
}

export function getTestPasswords() {
  const passwords = {
    customer: requiredTestValue("LH_TEST_CUSTOMER_PASSWORD"),
    worker: requiredTestValue("LH_TEST_WORKER_PASSWORD"),
    admin: requiredTestValue("LH_TEST_ADMIN_PASSWORD"),
  };
  for (const [role, password] of Object.entries(passwords)) {
    if (password.length < 12 || password.length > 128) {
      throw new Error(`LH_TEST_${role.toUpperCase()}_PASSWORD must be 12–128 characters.`);
    }
  }
  return passwords;
}
