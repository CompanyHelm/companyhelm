import { ApiServer } from "./src/server/api_server.ts";

try {
  await new ApiServer().start();
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to start API.";
  console.error(message);
  process.exit(1);
}
