import { test as base, expect } from "@playwright/test";
import { resetTestFixtures } from "./test-database";

export const test = base.extend<{ isolatedTestFixtures: void }>({
  isolatedTestFixtures: [
    async ({ baseURL: _baseURL }, use) => {
      await resetTestFixtures();
      await use();
    },
    { auto: true },
  ],
});

export { expect };
