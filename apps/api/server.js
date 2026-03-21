import Fastify from "fastify";
import { AppConfig } from "./src/config/config.ts";

const config = AppConfig.get();
const app = Fastify(config.getFastifyOptions());

app.get("/", async () => {
  return { message: "hello world" };
});

try {
  await app.listen(config.getListenOptions());
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
