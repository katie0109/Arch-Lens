export function handleCliError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`[Arch-Lens] ${message}`);
  if (!process.exitCode || process.exitCode === 0) {
    process.exitCode = 1;
  }
}
