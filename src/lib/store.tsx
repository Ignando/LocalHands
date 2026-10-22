import { createContext, useContext, useState, type ReactNode } from "react";
import {
  APPLICATIONS,
  SEED_REQUESTS,
  type Worker,
  type Application,
  type ApplicationStatus,
  type RequestStatus,
  type ServiceRequest,
  type Review,
} from "./mock-data";

export type Role = "customer" | "worker" | "admin";

type Store = {
  role: Role;
  setRole: (r: Role) => void;
  requests: ServiceRequest[];
  addRequest: (r: Omit<ServiceRequest, "id" | "status" | "customer">) => ServiceRequest;
  setRequestStatus: (id: string, s: RequestStatus) => void;
  applications: Application[];
  setApplicationStatus: (id: string, s: ApplicationStatus) => void;
  addApplication: (a: Omit<Application, "id" | "date" | "status">) => void;
  workers: Worker[];
  updateWorker: (id: string, patch: Partial<Worker>) => void;
  removeWorker: (id: string) => void;
  recentlyViewed: string[];
  markViewed: (id: string) => void;
  featuredReviews: Review[];
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({
  children,
  initialWorkers,
  initialReviews,
}: {
  children: ReactNode;
  initialWorkers: Worker[];
  initialReviews: Review[];
}) {
  const [role, setRole] = useState<Role>("customer");
  const [requests, setRequests] = useState(SEED_REQUESTS);
  const [applications, setApplications] = useState(APPLICATIONS);
  const [workers, setWorkers] = useState(initialWorkers);
  const [recentlyViewed, setRecent] = useState<string[]>([]);

  const value: Store = {
    role,
    setRole,
    requests,
    addRequest: (r) => {
      const req: ServiceRequest = { ...r, id: `SR-${1040 + requests.length}`, status: "Pending", customer: "You (demo customer)" };
      setRequests((prev) => [req, ...prev]);
      return req;
    },
    setRequestStatus: (id, s) => setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: s } : r))),
    applications,
    setApplicationStatus: (id, s) => setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: s } : a))),
    addApplication: (a) =>
      setApplications((prev) => [{ ...a, id: `a${prev.length + 1}`, date: "5 Oct 2026", status: "Application Submitted" }, ...prev]),
    workers,
    updateWorker: (id, patch) => setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w))),
    removeWorker: (id) => setWorkers((prev) => prev.filter((w) => w.id !== id)),
    recentlyViewed,
    markViewed: (id) => setRecent((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 4)),
    featuredReviews: initialReviews,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}
