/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { localClaudePlugin } from "./vite-plugins/localClaude";

export default defineConfig({
  plugins: [vue(), localClaudePlugin()],
  base: "/GermanTrainer/",
  test: {
    globals: true,
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost/",
      },
    },
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
});
