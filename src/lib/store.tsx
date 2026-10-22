import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthenticatedAccount } from "@/lib/auth-types";
import {
  type Application,
  type ApplicationStatus,
  type RequestStatus,
  type Review,
  type ServiceRequest,
  type Worker,
} from "./mock-data";
import {
  signOut as signOutOnServer,
} from "@/lib/server/auth";
import {
  createServiceRequest,
  removeWorker as removeWorkerOnServer,
  setApplicationStatus as setApplicationStatusOnServer,
  submitApplication,
  updateRequestStatus,
  updateWorkerProfile,
} from "@/lib/server/workflows";

export type Role = "customer" | "worker" | "admin";

type Store = {
  account: AuthenticatedAccount | null;
  role: Role | null;
  setAccount: (account: AuthenticatedAccount | null) => void;
  signOut: () => Promise<void>;
  requests: ServiceRequest[];
  addRequest: (request: { workerId: string; service: string; startsAt: string; notes?: string }) => Promise<ServiceRequest>;
  setRequestStatus: (id: string, status: Exclude<RequestStatus, "Pending" | "Rescheduling">) => Promise<void>;
  applications: Application[];
  setApplicationStatus: (id: string, status: Exclude<ApplicationStatus, "Application Submitted">) => Promise<void>;
  addApplication: (application: Omit<Application, "id" | "date" | "status" | "name" | "email" | "idVerified" | "qualification" | "references">) => Promise<Application>;
  workers: Worker[];
  updateWorker: (id: string, patch: Partial<Worker>) => Promise<void>;
  removeWorker: (id: string) => Promise<void>;
  recentlyViewed: string[];
  markViewed: (id: string) => void;
  featuredReviews: Review[];
  locations: string[];
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({
  children,
  initialAccount,
  initialApplications,
  initialRequests,
  initialWorkers,
  initialReviews,
  initialLocations,
}: {
  children: ReactNode;
  initialAccount: AuthenticatedAccount | null;
  initialApplications: Application[];
  initialRequests: ServiceRequest[];
  initialWorkers: Worker[];
  initialReviews: Review[];
  initialLocations: string[];
}) {
  const [account, setAccount] = useState(initialAccount);
  const [requests, setRequests] = useState(initialRequests);
  const [applications, setApplications] = useState(initialApplications);
  const [workers, setWorkers] = useState(initialWorkers);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [locations, setLocations] = useState(initialLocations);

  useEffect(() => setAccount(initialAccount), [initialAccount]);
  useEffect(() => setRequests(initialRequests), [initialRequests]);
  useEffect(() => setApplications(initialApplications), [initialApplications]);
  useEffect(() => setWorkers(initialWorkers), [initialWorkers]);
  useEffect(() => setLocations(initialLocations), [initialLocations]);

  const value: Store = {
    account,
    role: account?.role ?? null,
    setAccount,
    signOut: async () => {
      await signOutOnServer();
      setAccount(null);
      setApplications([]);
      setRequests([]);
      setRecentlyViewed([]);
    },
    requests,
    addRequest: async ({ workerId, service, startsAt, notes }) => {
      const request = await createServiceRequest({
        data: { workerPublicId: workerId, service, startsAt, notes: notes ?? "" },
      });
      setRequests((previous) => [request, ...previous]);
      return request;
    },
    setRequestStatus: async (id, status) => {
      const request = await updateRequestStatus({ data: { requestId: Number(id), status } });
      setRequests((previous) => previous.map((item) => item.id === id ? request : item));
    },
    applications,
    setApplicationStatus: async (id, status) => {
      const application = await setApplicationStatusOnServer({
        data: { applicationId: Number(id), status },
      });
      setApplications((previous) => previous.map((item) => item.id === id ? application : item));
    },
    addApplication: async (application) => {
      const saved = await submitApplication({
        data: {
          phone: application.phone,
          category: application.category,
          service: application.services[0] ?? "",
          location: application.location,
          years: application.years,
          description: application.description,
          startPrice: application.startPrice,
        },
      });
      setApplications((previous) => [saved, ...previous]);
      return saved;
    },
    workers,
    updateWorker: async (id, patch) => {
      const updated = await updateWorkerProfile({
        data: {
          id,
          name: patch.name ?? "",
          location: patch.location ?? "",
          years: patch.years ?? 0,
          startPrice: patch.startPrice ?? 0,
          travelFee: patch.travelFee ?? 0,
          bio: patch.bio ?? "",
          services: patch.services ?? [],
        },
      });
      setWorkers((previous) => previous.map((worker) => worker.id === id ? updated : worker));
      setAccount((previous) => previous ? { ...previous, name: updated.name } : previous);
    },
    removeWorker: async (id) => {
      await removeWorkerOnServer({ data: id });
      setWorkers((previous) => previous.filter((worker) => worker.id !== id));
    },
    recentlyViewed,
    markViewed: (id) => setRecentlyViewed((previous) => [id, ...previous.filter((item) => item !== id)].slice(0, 4)),
    featuredReviews: initialReviews,
    locations,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useStore outside StoreProvider");
  return value;
}
