import { createContext, useContext } from "react";

/** True when `VITE_AUTH_STUB_MODE=1`: UI behaves as signed-in without Clerk. */
export const AuthStubContext = createContext(false);

export function useAuthStubContext(): boolean {
  return useContext(AuthStubContext);
}
