/** Set `VITE_AUTH_STUB_MODE=1` with API `AUTH_STUB_MODE=1` to run without Clerk on the client. */
export const AUTH_STUB_MODE = import.meta.env.VITE_AUTH_STUB_MODE === "1";
