// ─── Enums ───────────────────────────────────

export type SuggestionCategory =
  | 'WORKPLACE'
  | 'PROCESS'
  | 'TOOLS'
  | 'CULTURE'
  | 'COMPENSATION'
  | 'OTHER';

export type SuggestionStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'IMPLEMENTED'
  | 'DECLINED'
  | 'ARCHIVED';

// ─── Embedded refs ──────────────────────────

export interface SuggestionEmployeeRef {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  userId: string | null;
}

// ─── Suggestion ──────────────────────────────
//
// When `isAnonymous` is true the server zeroes out `authorId` and `author`
// before serialising — admins literally never see who wrote it.

export interface Suggestion {
  id: string;
  organizationId: string;
  authorId: string | null;
  isAnonymous: boolean;
  category: SuggestionCategory;
  title: string;
  body: string;
  status: SuggestionStatus;
  responseBody: string | null;
  respondedById: string | null;
  respondedAt: string | null;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
  author?: SuggestionEmployeeRef | null;
  respondedBy?: SuggestionEmployeeRef | null;
}

// ─── Payloads ───────────────────────────────

export interface CreateSuggestionPayload {
  title: string;
  body: string;
  category?: SuggestionCategory;
  isAnonymous?: boolean;
}

export interface RespondSuggestionPayload {
  responseBody: string;
  status?: SuggestionStatus;
}

export interface UpdateSuggestionStatusPayload {
  status: SuggestionStatus;
}
