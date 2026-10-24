import { describe, expect, it } from "vitest";

import { generatePublicReference } from "@/lib/server/public-reference";

describe("generatePublicReference", () => {
  it("creates an SR-prefixed reference that fits the database column", () => {
    const reference = generatePublicReference();

    expect(reference).toMatch(/^SR-[0-9A-Z]{16}$/);
    expect(reference.length).toBeLessThanOrEqual(20);
  });

  it("generates distinct references for repeated booking attempts", () => {
    const references = Array.from({ length: 1000 }, generatePublicReference);

    expect(new Set(references).size).toBe(references.length);
  });
});
