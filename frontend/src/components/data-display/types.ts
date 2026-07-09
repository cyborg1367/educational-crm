/** Backend pagination contract — docs/frontend/AGENTS.md rule 5. */
export type PaginatedResponse<T> = {
  items: T[];
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
};
