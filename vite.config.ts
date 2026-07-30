// Build the React workbench from web/ into the static assets served by the local editor.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const demo = mode === "demo";
  return {
    root: "web",
    base: demo ? "/rexp-studio/" : "/",
    plugins: [react()],
    build: {
      outDir: demo ? "../dist-demo" : "../dist-web",
      emptyOutDir: true,
    },
  };
});
