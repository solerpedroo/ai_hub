import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const shared = resolve(__dirname, "../../packages/shared/src");
const db = resolve(__dirname, "../../packages/db/src");
const gateway = resolve(__dirname, "../../packages/ai-gateway/src");
const securityIndex = resolve(__dirname, "../../packages/security/src/index.ts");
const securityKeytar = resolve(__dirname, "../../packages/security/src/keytar-store.ts");
const files = resolve(__dirname, "../../packages/files/src");
const memory = resolve(__dirname, "../../packages/memory/src");
const tools = resolve(__dirname, "../../packages/tools/src");

const mainAliases = {
  "@ai-hub/shared/import": resolve(__dirname, "../../packages/shared/src/import/index.ts"),
  "@ai-hub/shared": shared,
  "@ai-hub/db": db,
  "@ai-hub/ai-gateway": gateway,
  "@ai-hub/security/keytar": securityKeytar,
  "@ai-hub/security": securityIndex,
  "@ai-hub/files": files,
  "@ai-hub/memory": memory,
  "@ai-hub/tools": tools,
};

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ["@ai-hub/shared", "@ai-hub/db", "@ai-hub/security", "@ai-hub/ai-gateway", "@ai-hub/files", "@ai-hub/memory", "@ai-hub/tools"],
      }),
    ],
    resolve: {
      alias: mainAliases,
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["@ai-hub/shared", "zod"] })],
    resolve: {
      alias: {
        "@ai-hub/shared": shared,
      },
    },
    build: {
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "index.cjs",
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve("src/renderer/src"),
        "@ai-hub/shared": shared,
      },
    },
    plugins: [
      react(),
      {
        name: "strip-crossorigin-for-file-protocol",
        transformIndexHtml(html) {
          return html.replaceAll(" crossorigin", "");
        },
      },
    ],
  },
});
