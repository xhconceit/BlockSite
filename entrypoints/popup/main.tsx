import "./style.css";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = document.getElementById("app");
if (root !== null) {
  createRoot(root).render(<App />);
}
