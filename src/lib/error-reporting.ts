
type ErrorContext = Record<string, unknown>;

export function reportAppError(
  error: unknown,
  context: ErrorContext = {},
): void {
  const message =
    error instanceof Error ? error.message : String(error);

  console.error("[LocalHands Error]", {
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}
