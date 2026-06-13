import { useEffect, useState } from "react";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAuth = localStorage.getItem("auth") === "true";
    setUser(isAuth ? { id: "user" } : null);
    setLoading(false);
  }, []);

  return { session: null, user, loading };
}

export function useIsOwner(userId?: string) {
  return userId ? true : null;
}
