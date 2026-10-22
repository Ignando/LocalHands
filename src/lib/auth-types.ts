export type AccountRole = "customer" | "worker" | "admin";

export type AuthenticatedAccount = {
  name: string;
  email: string;
  role: AccountRole;
  workerPublicId: string | null;
};
