"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserContext } from "./context/UserContext";

export default function Provider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  const createOrGet = useMutation(api.users.createOrGet);
  const currentUser = useQuery(api.users.getMe, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      createOrGet()
        .then((result) => console.log("createOrGet success:", result))
        .catch((err) => console.error("createOrGet error:", err));
    }
  }, [isAuthenticated, isLoading, createOrGet]);

  return (
    <UserContext.Provider value={currentUser ?? null}>
      {children}
    </UserContext.Provider>
  );
}
