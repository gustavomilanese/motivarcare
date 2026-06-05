import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { redirectLegacyPatientHostToCanonical } from "./canonicalPatientOrigin";
import { App } from "./App";
import "./styles.css";
import "./modules/emotional-diary/emotional-diary.css";

redirectLegacyPatientHostToCanonical();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
