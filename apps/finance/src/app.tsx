import { useRoutes } from "react-router-dom";

import { financeManifest } from "./remote/manifest";

export function App() {
  return useRoutes(financeManifest.routes);
}
