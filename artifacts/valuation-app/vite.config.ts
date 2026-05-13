import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const envDir = path.resolve(import.meta.dirname, "../..");

// Replit sets PORT + BASE_PATH in dev. CI / Vercel builds omit them; use safe defaults.
const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig(async ({ mode }) => {
  const loaded = loadEnv(mode, envDir, "");
  const hasClerkKey = Boolean(loaded.VITE_CLERK_PUBLISHABLE_KEY?.trim());
  const stubExplicitOn = loaded.VITE_AUTH_STUB_MODE === "1";
  const stubExplicitOff = loaded.VITE_AUTH_STUB_MODE === "0";
  /** Local dev without Clerk: stub auth unless a publishable key exists or stub was explicitly disabled. */
  const autoStubDev =
    mode === "development" && !hasClerkKey && !stubExplicitOn && !stubExplicitOff;

  const proxyTarget =
    (loaded.VITE_DEV_API_PROXY || "http://127.0.0.1:3001").replace(/\/$/, "");

  const replitPlugins =
    process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : [];

  return {
    envDir,
    base: basePath,
    define: autoStubDev
      ? { "import.meta.env.VITE_AUTH_STUB_MODE": JSON.stringify("1") }
      : {},
    plugins: [
      react(),
      tailwindcss({ optimize: false }),
      runtimeErrorOverlay(),
      ...replitPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
      ...(mode === "development"
        ? {
            proxy: {
              "/api": {
                target: proxyTarget,
                changeOrigin: true,
                configure(proxy) {
                  proxy.on("error", () => {
                    console.warn(
                      `\n  [vite] /api proxy → ${proxyTarget} failed (is the backend running?). From repo root try: pnpm dev\n`,
                    );
                  });
                },
              },
            },
          }
        : {}),
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
