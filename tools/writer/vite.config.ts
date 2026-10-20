import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { writerApi } from "./server/api.ts";

// Local-only: the writer never builds for production. `npm run dev` serves the
// editor and its file API on http://localhost:4310.
export default defineConfig({
  plugins: [react(), writerApi()],
  server: {
    port: 4310,
    strictPort: true,
    host: "localhost",
    fs: {
      // Drafts are served only through the writer's own /drafts/ route (assets
      // and figures, never meta.json, doc.json or the trash). Denying the
      // folder to Vite too means no spelling of the URL reaches the raw files.
      // Setting `deny` replaces Vite's defaults, so they're repeated here.
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/drafts/**"],
    },
  },
});
