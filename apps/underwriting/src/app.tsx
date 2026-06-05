import { useRoutes } from "react-router-dom";

import { underwritingManifest } from "./remote/manifest";

export function App() {
  return useRoutes(underwritingManifest.routes);
}
