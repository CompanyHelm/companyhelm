import Fastify from "fastify";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT || 3001);

app.get("/", async () => {
  return { message: "hello world" };
});

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
