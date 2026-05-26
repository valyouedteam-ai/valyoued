export {};

declare global {
  namespace Express {
    interface Request {
      /**
       * Set in NODE_ENV development when trusted `X-Stub-Billing-*` headers are sent (dev Subscription strip).
       * Populated synchronously before route handlers because AsyncLocalStorage from middleware `next()` may not persist
       * across `await` inside Express handlers.
       */
      devStubBillingOverlay?: {
        planSlug: "none" | "everyday_plus" | "professional";
        inheritanceAddon: boolean;
      };
    }
  }
}
