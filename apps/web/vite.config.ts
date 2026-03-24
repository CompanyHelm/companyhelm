import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    react({ babel: { plugins: ["babel-plugin-relay"] } }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@radix-ui/react-alert-dialog": resolve(rootDir, "../../node_modules/@radix-ui/react-alert-dialog"),
    },
  },
});
