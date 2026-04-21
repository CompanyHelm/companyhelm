import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  const graphqlProxyTarget = String(env.VITE_GRAPHQL_PROXY_TARGET || "").trim();

  return {
    plugins: [
      react({ babel: { plugins: ["babel-plugin-relay"] } }),
      tailwindcss(),
    ],
    server: {
      allowedHosts: [".e2b.app"],
      host: "0.0.0.0",
      proxy: graphqlProxyTarget.length > 0
        ? {
            "/graphql": {
              changeOrigin: true,
              target: graphqlProxyTarget,
              ws: true,
            },
          }
        : undefined,
    },
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
        "@radix-ui/react-alert-dialog": resolve(rootDir, "../../node_modules/@radix-ui/react-alert-dialog"),
      },
    },
  };
});
