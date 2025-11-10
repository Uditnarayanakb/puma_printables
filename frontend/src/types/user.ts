import type { UserRole } from "./order";

export type ManagedUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  authProvider: "LOCAL" | "GOOGLE";
  fullName: string | null;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  loginCount: number | null;
};

export type UserAccount = {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
};

export type UserMetrics = {
  totalUsers: number;
  activeUsers: number;
  storeUsers: number;
  approvers: number;
  fulfillmentAgents: number;
  admins: number;
  lookbackDays: number;
};

export type CurrentUser = {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  authProvider: "LOCAL" | "GOOGLE";
  fullName: string | null;
  avatarUrl: string | null;
};
