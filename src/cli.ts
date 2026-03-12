export function main(): void {
  process.stdout.write("");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
