import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";

console.log('Main.tsx iniciando...');

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="system" storageKey="marine-seguros-theme">
    <App />
  </ThemeProvider>
);
