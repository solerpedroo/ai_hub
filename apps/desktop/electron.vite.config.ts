import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const shared = resolve(__dirname, "../../packages/shared/src");

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["@ai-hub/shared"] })],
    resolve: {
      alias: {
        "@ai-hub/shared": shared,
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["@ai-hub/shared"] })],
    resolve: {
      alias: {
        "@ai-hub/shared": shared,
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
    plugins: [react()],
  },
});
