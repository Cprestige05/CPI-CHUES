
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { runStorageMigrations } from "./app/data/storageMigration";
  import "./styles/index.css";

  // Purge ciblée et versionnée des anciennes clés `cpi_*` de démonstration/test
  // (aucun effacement global du localStorage). S'exécute une seule fois.
  runStorageMigrations();

  createRoot(document.getElementById("root")!).render(<App />);
  