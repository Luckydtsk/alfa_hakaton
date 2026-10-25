import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError, type Application, type Meta, type User } from "../api";
import type {
  ActionBody,
  ApplicationAction,
  ApplicationInput,
  CompanyProfile,
} from "../domain/models";
import {
  createDemoGateway,
  demoBankUser,
  demoUser,
} from "../services/demoGateway";
import { serverGateway, sessionApi } from "../services/gateway";
import { readStored, removeStored, writeStored } from "../services/storage";

type Session = { user: User; demo: boolean };
const SESSION_KEY = "alfa-buziness:demo-session:v1";
const emptyProfile: CompanyProfile = {
  businessType: "ООО",
  businessAge: "",
  jobsSupported: null,
  industryCode: "",
};
type CabinetContextValue = {
  user: User | null;
  demo: boolean;
  initializing: boolean;
  loading: boolean;
  error: string;
  meta: Meta | null;
  applications: Application[];
  profile: CompanyProfile;
  login: (login: string, password: string) => Promise<User>;
  enterDemo: (bank?: boolean) => void;
  createDemoAccount: (
    name: string,
    company: string,
    inn: string,
    profile: CompanyProfile,
  ) => void;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  saveProfile: (profile: CompanyProfile) => void;
  createApplication: (input: ApplicationInput) => Promise<Application>;
  act: (
    id: number,
    action: ApplicationAction,
    body?: ActionBody,
  ) => Promise<Application>;
};
const CabinetContext = createContext<CabinetContextValue | null>(null);

export function CabinetProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [initializing, setInitializing] = useState(true);
  const [meta, setMeta] = useState<Meta | null>(null),
    [applications, setApplications] = useState<Application[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const sessionEpoch = useRef(0);
  const loadRequest = useRef(0);
  const [profile, setProfile] = useState<CompanyProfile>(emptyProfile);
  const gateway = useMemo(
    () => (session?.demo ? createDemoGateway(session.user) : serverGateway),
    [session],
  );
  const profileKey = session
    ? `alfa-buziness:profile:${session.demo ? "demo" : "server"}:${session.user.id}`
    : "";

  useEffect(() => {
    let alive = true;
    const epoch = sessionEpoch.current;
    const stored = readStored<Session | null>(SESSION_KEY, null);
    if (
      stored?.demo &&
      stored.user?.id &&
      ["client", "bank"].includes(stored.user.role)
    ) {
      setSession(stored);
      setInitializing(false);
      return;
    }
    sessionApi
      .me()
      .then((user) => {
        if (alive && epoch === sessionEpoch.current) setSession({ user, demo: false });
      })
      .catch((reason) => {
        if (alive && epoch === sessionEpoch.current && !(reason instanceof ApiError && reason.status === 401))
          setError(
            "Сервер недоступен. Можно повторить вход или открыть деморежим.",
          );
      })
      .finally(() => {
        if (alive) setInitializing(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!session) return;
    const epoch = sessionEpoch.current;
    const request = ++loadRequest.current;
    const isCurrent = () => epoch === sessionEpoch.current && request === loadRequest.current;
    setLoading(true);
    setError("");
    try {
      const [nextMeta, items] = await Promise.all([
        gateway.getMeta(),
        gateway.listApplications(),
      ]);
      if (!isCurrent()) return;
      setMeta(nextMeta);
      setApplications(items);
    } catch (reason) {
      if (!isCurrent()) return;
      if (reason instanceof ApiError && reason.status === 401) {
        setSession(null);
        setApplications([]);
        setError("Сессия истекла. Войдите заново.");
      } else
        setError(
          reason instanceof Error
            ? reason.message
            : "Не удалось загрузить кабинет.",
        );
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [gateway, session]);
  useEffect(() => {
    if (session) void reload();
  }, [reload, session]);
  useEffect(() => {
    if (!session) {
      setProfile(emptyProfile);
      return;
    }
    const latest = applications.find(
      (a) => a.inn === session.user.company?.inn,
    );
    const inferred: CompanyProfile = latest
      ? {
          businessType: latest.businessType ?? "ООО",
          businessAge: latest.businessAge ?? "",
          jobsSupported: latest.jobsSupported,
          industryCode: latest.industryCode ?? "",
        }
      : emptyProfile;
    setProfile(readStored<CompanyProfile>(profileKey, inferred));
  }, [profileKey, applications, session]);

  function enterDemo(bank = false) {
    const next = { user: bank ? demoBankUser : demoUser, demo: true };
    writeStored(SESSION_KEY, next);
    sessionEpoch.current += 1;
    setApplications([]);
    setMeta(null);
    setSession(next);
    setError("");
  }
  function saveProfile(next: CompanyProfile) {
    writeStored(profileKey, next);
    setProfile(next);
  }
  function createDemoAccount(
    name: string,
    company: string,
    inn: string,
    nextProfile: CompanyProfile,
  ) {
    const user: User = {
      id: Date.now(),
      login: "demo.local",
      fullName: name,
      role: "client",
      company: { id: Date.now(), name: company, inn },
    };
    const next = { user, demo: true };
    writeStored(`alfa-buziness:profile:demo:${user.id}`, nextProfile);
    writeStored(SESSION_KEY, next);
    sessionEpoch.current += 1;
    setApplications([]);
    setMeta(null);
    setSession(next);
    setError("");
  }
  async function login(loginName: string, password: string) {
    sessionEpoch.current += 1;
    const user = await sessionApi.login(loginName, password);
    removeStored(SESSION_KEY);
    setApplications([]);
    setSession({ user, demo: false });
    return user;
  }
  async function logout() {
    if (!session?.demo) await sessionApi.logout();
    sessionEpoch.current += 1;
    removeStored(SESSION_KEY);
    setSession(null);
    setApplications([]);
    setMeta(null);
    setError("");
  }
  async function createApplication(input: ApplicationInput) {
    const epoch = sessionEpoch.current;
    const item = await gateway.createApplication(input);
    if (epoch === sessionEpoch.current) setApplications((items) => [item, ...items]);
    return item;
  }
  async function act(id: number, action: ApplicationAction, body?: ActionBody) {
    const epoch = sessionEpoch.current;
    const item = await gateway.act(id, action, body);
    if (epoch === sessionEpoch.current) setApplications((items) =>
      items.map((old) => (old.id === id ? item : old)),
    );
    return item;
  }
  return (
    <CabinetContext.Provider
      value={{
        user: session?.user ?? null,
        demo: session?.demo ?? false,
        initializing,
        loading,
        error,
        meta,
        applications,
        profile,
        login,
        enterDemo,
        createDemoAccount,
        logout,
        reload,
        saveProfile,
        createApplication,
        act,
      }}
    >
      {children}
    </CabinetContext.Provider>
  );
}

export function useCabinet() {
  const context = useContext(CabinetContext);
  if (!context) throw new Error("CabinetProvider is required");
  return context;
}
