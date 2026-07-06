import { fetchJson } from "@/lib/api/client";
import type { ActivityCreate, ActivityRead } from "@/lib/api/types";

export function createActivity(body: ActivityCreate): Promise<ActivityRead> {
  return fetchJson<ActivityRead>("/activities", {
    method: "POST",
    body,
  });
}
