import { resetTestFixtures } from "./support/test-database";

export default async function globalTeardown(): Promise<void> {
  await resetTestFixtures();
}
