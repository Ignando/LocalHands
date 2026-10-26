import { prepareTestDatabase } from "./support/test-database";

export default async function globalSetup(): Promise<void> {
  await prepareTestDatabase();
}
