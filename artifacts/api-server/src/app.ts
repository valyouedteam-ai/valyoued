import express, {
  type NextFunction,
  type Request,
  type Response,
  type Express,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { ZodError } from "zod";
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

// Photo extract sends base64 (~4/3 the raw JPEG). A 6–7MB decoded image needs ~9MB JSON;
// leave headroom beyond the client's 5MB raw cap so the route can return readable errors instead of dropping the body mid-parse.
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

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

/** Default Express HTML errors break SPA clients expecting JSON from `/api`. */
app.use((err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  if (res.headersSent) {
    return;
  }

  logger.error({ err }, "Unhandled request error");

  const pathRaw = typeof req.originalUrl === "string" ? req.originalUrl : req.url ?? "";
  const pathOnly = pathRaw.split("?", 1)[0] ?? "";
  const api = pathOnly.startsWith("/api");

  if (!api) {
    res.status(500).send("Internal Server Error");
    return;
  }

  let status = 500;
  let payload: { error: string; issues?: unknown; code?: string } = {
    error: "Internal Server Error",
  };

  if (err instanceof ZodError) {
    payload = {
      error: "API response validation failed",
      issues: err.flatten(),
      code: "API_RESPONSE_SCHEMA",
    };
  } else if (err && typeof err === "object") {
    const o = err as { status?: unknown; statusCode?: unknown };
    const raw = o.status ?? o.statusCode;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(n) && n >= 400 && n < 600) {
      status = n;
    }
    const msg =
      err instanceof Error
        ? err.message
        : "message" in err && typeof (err as { message?: unknown }).message === "string"
          ? String((err as { message: string }).message)
          : "Internal Server Error";
    payload = { ...payload, error: msg };
  } else if (typeof err === "string" && err.trim()) {
    payload = { ...payload, error: err };
  }

  res.status(status).json(payload);
});

export default app;
