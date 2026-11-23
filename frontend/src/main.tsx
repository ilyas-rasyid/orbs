import "./app/config/env";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { AppProviders } from "./app/providers/AppProviders";
import { router } from "./router/router";
import "./styles/globals.css";

const element = document.getElementById("root");
if (!element) throw new Error("Missing application root element");

createRoot(element).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
