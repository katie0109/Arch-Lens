/** Exit codes: 0 = clean, 1 = rule violations, 2 = config/plugin/runtime error. */
export const EXIT_CODE = {
  OK: 0,
  VIOLATIONS: 1,
  ERROR: 2,
} as const;

/**
 * Reports a thrown error on stderr and sets the process exit code to 2. Rule violations are
 * NOT errors — those are surfaced by the scan command as exit code 1.
 */
export function handleCliError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`[Arch-Lens] ${message}`);
  process.exitCode = EXIT_CODE.ERROR;
}
