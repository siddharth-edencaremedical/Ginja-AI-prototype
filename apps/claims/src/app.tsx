import { useRoutes } from "react-router-dom";

import { claimsManifest } from "./remote/manifest";

export function App() {
  return useRoutes(claimsManifest.routes);
}
