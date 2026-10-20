import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { writerApi } from "./server/api";

// Local-only: the writer never builds for production. `npm run dev` serves the
// editor and its file API on http://localhost:4310.
export default defineConfig({
  plugins: [react(), writerApi()],
  server: { port: 4310, strictPort: true, host: "localhost" },
});
