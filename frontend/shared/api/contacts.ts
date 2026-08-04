import { apiRequest } from "./httpClient";
import type { ApiContact } from "./types";

export const listContacts = () => apiRequest<{ contacts: ApiContact[] }>("/contacts");

export const createContact = (input: { contactUserId: string; source: ApiContact["source"] }) =>
  apiRequest<{ contact: ApiContact }>("/contacts", { method: "POST", body: input });

export const deleteContact = (id: string) => apiRequest<void>(`/contacts/${id}`, { method: "DELETE" });
