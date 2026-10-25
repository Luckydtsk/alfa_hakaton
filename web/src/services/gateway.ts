import { api, type Application, type Meta, type User } from "../api";
import type {
  ActionBody,
  ApplicationAction,
  ApplicationInput,
} from "../domain/models";

export interface CabinetGateway {
  getMeta(): Promise<Meta>;
  listApplications(): Promise<Application[]>;
  createApplication(input: ApplicationInput): Promise<Application>;
  act(
    id: number,
    action: ApplicationAction,
    body?: ActionBody,
  ): Promise<Application>;
}

export const serverGateway: CabinetGateway = {
  getMeta: () => api<Meta>("/api/meta"),
  listApplications: () => api<Application[]>("/api/applications"),
  createApplication: (input) =>
    api<Application>("/api/applications", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  act: (id, action, body) =>
    api<Application>(`/api/applications/${id}/${action}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
};

export const sessionApi = {
  me: () => api<User>("/api/me"),
  login: (login: string, password: string) =>
    api<User>("/api/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    }),
  logout: () => api<{ ok: boolean }>("/api/logout", { method: "POST" }),
};
