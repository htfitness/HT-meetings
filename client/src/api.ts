/** Small fetch wrapper for the JSON API. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

// ---------------------------------------------------------------------------
// Shared types (mirror the server responses)
// ---------------------------------------------------------------------------

export interface SafeUser {
  id: number;
  username: string;
  name: string;
  role: "user" | "admin";
  active: boolean;
  lastSignedIn: string | null;
}

export interface GroupInfo {
  id: number;
  name: string;
  description: string | null;
  memberRole: "member" | "group_admin";
}

export interface TemplateItem {
  id: number;
  sectionId: number;
  content: string;
  sortOrder: number;
}

export interface TemplateSection {
  id: number;
  groupId: number;
  title: string;
  purpose: string | null;
  defaultMinutes: number;
  sortOrder: number;
  active: boolean;
  items: TemplateItem[];
}

export interface MeetingSummary {
  id: number;
  groupId: number;
  title: string;
  meetingDate: string;
  status: "scheduled" | "in_progress" | "completed";
  startedAt: string | null;
  completedAt: string | null;
}

export interface MeetingItem {
  id: number;
  sectionId: number;
  content: string;
  sortOrder: number;
  carriedOver: boolean;
}

export interface MeetingSection {
  id: number;
  meetingId: number;
  title: string;
  purpose: string | null;
  plannedMinutes: number;
  sortOrder: number;
  status: "pending" | "discussed" | "deferred" | "skipped";
  timerStartedAt: string | null;
  elapsedSeconds: number;
  items: MeetingItem[];
}

export interface NoteEntry {
  id: number;
  meetingId: number;
  sectionId: number | null;
  content: string;
  authorId: number;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItemEntry {
  id: number;
  groupId?: number;
  groupName?: string | null;
  meetingId: number | null;
  sectionId?: number | null;
  title: string;
  ownerId: number | null;
  ownerName?: string | null;
  dueDate: string | null;
  status: "open" | "done" | "cancelled";
  createdAt?: string;
}

export interface DecisionEntry {
  id: number;
  meetingId: number;
  sectionId: number | null;
  content: string;
  authorId: number;
  authorName: string | null;
  createdAt: string;
}

export interface TranscriptEntry {
  id: number;
  meetingId: number;
  fileName: string;
  content: string;
  uploadedById: number;
  uploaderName: string | null;
  createdAt: string;
}

export interface MeetingDetail extends MeetingSummary {
  currentSectionId: number | null;
  sections: MeetingSection[];
  notes: NoteEntry[];
  actionItems: ActionItemEntry[];
  decisions: DecisionEntry[];
  transcripts: TranscriptEntry[];
}

export interface TopicEntry {
  id: number;
  groupId: number;
  content: string;
  authorId: number;
  authorName: string | null;
  status: "open" | "added" | "declined";
  meetingId: number | null;
  createdAt: string;
}

export interface MemberEntry {
  memberId: number;
  userId: number;
  name: string;
  username: string;
  memberRole: "member" | "group_admin";
  active: boolean;
}

export interface SearchResults {
  meetings: MeetingSummary[];
  notes: Array<Pick<NoteEntry, "id" | "meetingId" | "content" | "authorName" | "createdAt">>;
  decisions: Array<Pick<DecisionEntry, "id" | "meetingId" | "content" | "authorName" | "createdAt">>;
  actionItems: Array<{
    id: number;
    meetingId: number | null;
    title: string;
    ownerName: string | null;
    dueDate: string | null;
    status: string;
  }>;
  transcripts: Array<{
    id: number;
    meetingId: number;
    fileName: string;
    createdAt: string;
  }>;
}
