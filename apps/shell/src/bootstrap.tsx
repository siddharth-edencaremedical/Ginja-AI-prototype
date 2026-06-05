import "@ginja/design-system/styles.css";

import { AuthProvider } from "@ginja/auth";
import { FeatureFlagsProvider } from "@ginja/feature-flags";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./app";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <FeatureFlagsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </FeatureFlagsProvider>
    </AuthProvider>
  </StrictMode>
);
