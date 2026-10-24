import { randomBytes } from "node:crypto";

const PUBLIC_REFERENCE_PREFIX = "SR-";
const PUBLIC_REFERENCE_BYTES = 10;
const PUBLIC_REFERENCE_SUFFIX_LENGTH = 16;

export function generatePublicReference(): string {
  const randomValue = BigInt(`0x${randomBytes(PUBLIC_REFERENCE_BYTES).toString("hex")}`);
  const suffix = randomValue.toString(36).toUpperCase().padStart(PUBLIC_REFERENCE_SUFFIX_LENGTH, "0");
  return `${PUBLIC_REFERENCE_PREFIX}${suffix}`;
}
