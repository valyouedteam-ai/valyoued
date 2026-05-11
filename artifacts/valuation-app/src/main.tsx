import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { getApiOrigin } from "./lib/api-url";
import "./index.css";

const apiOrigin = getApiOrigin();
setBaseUrl(apiOrigin || null);

createRoot(document.getElementById("root")!).render(<App />);
