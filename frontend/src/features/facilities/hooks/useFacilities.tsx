import { facilitiesApi } from "../facilities.api";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../shared/auth/AuthProvider";

export function useFacilities() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => facilitiesApi.categories(),
    staleTime: 300_000,
  });
  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () => facilitiesApi.locations(),
    staleTime: 300_000,
  });
  const params = new URLSearchParams({ limit: "100" });
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (location) params.set("locationId", location);
  const facilities = useQuery({
    queryKey: ["facilities", category, location, search],
    queryFn: () => facilitiesApi.list(params),
    staleTime: 60_000,
  });
  return {
    user,
    search,
    setSearch,
    category,
    setCategory,
    location,
    setLocation,
    categories,
    locations,
    facilities,
  };
}
