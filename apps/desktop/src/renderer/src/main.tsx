import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { App } from "./App";
import "./lib/i18n";
import "./index.css";
import "highlight.js/styles/github-dark.min.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element missing");
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <App />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
