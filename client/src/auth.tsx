import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, type GroupInfo, type SafeUser } from "./api";

interface AuthState {
  user: SafeUser | null;
  groups: GroupInfo[];
  loading: boolean;
  needsSetup: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  groups: [],
  loading: true,
  needsSetup: false,
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const status = await api.get<{ needsSetup: boolean }>("/auth/status");
      setNeedsSetup(status.needsSetup);
      const me = await api.get<{ user: SafeUser | null; groups: GroupInfo[] }>(
        "/auth/me",
      );
      setUser(me.user);
      setGroups(me.groups ?? []);
    } catch {
      setUser(null);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
    setGroups([]);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{ user, groups, loading, needsSetup, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
