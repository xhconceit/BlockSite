import "./style.css";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "../../hooks/useI18n";
import App from "./App";

const root = document.getElementById("app");
if (root !== null) {
  createRoot(root).render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  );
}
