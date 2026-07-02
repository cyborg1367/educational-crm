import { fetchJson } from "@/lib/api/client";
import type { OrganizationRead } from "@/lib/api/types";

export function getMyOrg(): Promise<OrganizationRead> {
  return fetchJson<OrganizationRead>("/organizations/me");
}
