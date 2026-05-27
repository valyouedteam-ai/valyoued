import { createRoot } from "react-dom/client";
import { setBaseUrl, setExtraRequestHeadersGetter } from "@workspace/api-client-react";
import App from "./App";
import { peekDevStubBillingFetchHeaders } from "./context/StubBillingPlanDevContext";
import { isDevBillingUiEnabled } from "./lib/dev-billing-ui";
import { getApiOrigin } from "./lib/api-url";
import "./index.css";

const apiOrigin = getApiOrigin();
setBaseUrl(apiOrigin || null);

if (typeof window !== "undefined" && isDevBillingUiEnabled()) {
  setExtraRequestHeadersGetter(() => peekDevStubBillingFetchHeaders());
}

createRoot(document.getElementById("root")!).render(<App />);
