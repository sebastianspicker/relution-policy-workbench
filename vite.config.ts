// Build the React workbench from web/ into the static assets served by the local editor.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "web",
  plugins: [react()],
  build: {
    outDir: "../dist-web",
    emptyOutDir: true,
  },
});
