import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";

type MeAdminResponse = {
  isAdmin: boolean;
};

/** Whether the signed-in user may access operator admin routes and chrome. */
export function useIsAdmin() {
  const query = useQuery({
    queryKey: ["me-admin"],
    staleTime: 60_000,
    queryFn: () =>
      customFetch<MeAdminResponse>(apiUrl("/api/me/admin"), { method: "GET", responseType: "json" }),
  });

  return {
    isAdmin: Boolean(query.data?.isAdmin),
    isLoading: query.isLoading,
  };
}
