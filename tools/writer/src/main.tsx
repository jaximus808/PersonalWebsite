// The writer: a local-only editor for jaxonp.com posts and projects.
// `npm run dev` here serves it on http://localhost:4310 (see SPEC.md).

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App";
import { ToastProvider } from "./app/ui/Toasts";
import "./styles/base.css";
import "./styles/prose.css";
import "./styles/app.css";

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing #root");

createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
