import { useRoutes } from "react-router-dom";

import { productConfigManifest } from "./remote/manifest";

export function App() {
  return useRoutes(productConfigManifest.routes);
}
