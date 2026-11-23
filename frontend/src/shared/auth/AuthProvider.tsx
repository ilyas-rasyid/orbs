import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, resetCsrf, ApiError } from "../api/client";
import type { User } from "../types/domain";
import { setOrganizationTimezone } from "../utils/dates";

type Auth = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await api.get<{ user: User; timezone: string }>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (data?.timezone) setOrganizationTimezone(data.timezone);
  }, [data?.timezone]);
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["auth"] });
  };
  const logout = async () => {
    try {
      await api.mutate("/auth/logout");
    } finally {
      resetCsrf();
      client.clear();
      window.location.href = "/";
    }
  };
  return (
    <AuthContext.Provider value={{ user: data?.user ?? null, loading: isPending, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is missing.");
  return context;
}
