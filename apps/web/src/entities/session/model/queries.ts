import { queryOptions } from "@tanstack/react-query";
import { getSupabaseClient } from "@/shared/api";

export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async () => {
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return null;

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    return data.session;
  },
  staleTime: Infinity,
  gcTime: Infinity,
  retry: false,
  networkMode: "always",
});
