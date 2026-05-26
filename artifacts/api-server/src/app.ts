import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { isLlmConfigured } from "@workspace/llm";
import router from "./routes";
import { logger } from "./lib/logger";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import { stripeWebhookHandler } from "./billingWebhook";
import { isAuthStubMode } from "./lib/authStub";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Clerk proxy must be mounted before body parsers: it streams raw bytes.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));

app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    void stripeWebhookHandler(req, res).catch((err) => {
      logger.error({ err }, "Stripe webhook uncaught error");
      if (!res.headersSent) res.status(500).send("Internal error");
    });
  },
);

// Allow JSON bodies up to 8MB so a ~5MB photo (base64-inflated to ~6.7MB) fits
// while bounding abuse on heavier valuation endpoints.
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

if (isAuthStubMode()) {
  logger.warn(
    "AUTH_STUB_MODE is on: Clerk auth is bypassed (fixed user id). Do not use in public deployments.",
  );
} else {
  app.use(clerkMiddleware());
}

if (!isLlmConfigured()) {
  logger.warn(
    "LLM API keys are not set (ANTHROPIC_API_KEY, OPENAI_API_KEY, or LLM_API_KEY). Photo extract returns 503 until you add keys on this API service (e.g. Railway Variables).",
  );
}

app.use("/api", router);

export default app;
