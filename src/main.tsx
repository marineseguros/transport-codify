import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";

// Pós-mount: garante limpeza de Service Workers e caches que possam ter
// sobrevivido à carga inicial. Cobre o caso em que o HTML novo carregou,
// mas ainda restou registration/cache do SW antigo no navegador.
(function postMountSwCleanup() {
  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
    }
    if (typeof caches !== "undefined" && caches.keys) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
  } catch {}
})();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="system" storageKey="marine-seguros-theme">
    <App />
  </ThemeProvider>
);
