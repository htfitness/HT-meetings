import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const meetingStatusEnum = pgEnum("meeting_status", [
  "scheduled",
  "in_progress",
  "completed",
]);
export const sectionStatusEnum = pgEnum("section_status", [
  "pending",
  "discussed",
  "deferred",
  "skipped",
]);
export const actionStatusEnum = pgEnum("action_status", [
  "open",
  "done",
  "cancelled",
]);
export const topicStatusEnum = pgEnum("topic_status", [
  "open",
  "added",
  "declined",
]);
export const memberRoleEnum = pgEnum("member_role", ["member", "group_admin"]);

/** Application users (email + password sign-in). */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  /** Site-wide admin: can manage all groups and users. */
  role: roleEnum("role").default("user").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in"),
});

export type User = typeof users.$inferSelect;

/** Meeting groups, e.g. Corporate Leadership, Managers, Assistant Managers. */
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Group = typeof groups.$inferSelect;

/** Membership: which users belong to which groups, with per-group role. */
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  role: memberRoleEnum("role").default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Master agenda template sections per group. */
export const templateSections = pgTable("template_sections", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  purpose: text("purpose"),
  defaultMinutes: integer("default_minutes").default(10).notNull(),
  sortOrder: integer("sort_order").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Default talking points belonging to a template section. */
export const templateItems = pgTable("template_items", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** A single dated meeting within a group. */
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  meetingDate: varchar("meeting_date", { length: 10 }).notNull(), // YYYY-MM-DD
  status: meetingStatusEnum("status").default("scheduled").notNull(),
  currentSectionId: integer("current_section_id"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;

/** Agenda sections for a specific meeting (copied from the group template). */
export const meetingSections = pgTable("meeting_sections", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  purpose: text("purpose"),
  plannedMinutes: integer("planned_minutes").default(10).notNull(),
  sortOrder: integer("sort_order").notNull(),
  status: sectionStatusEnum("status").default("pending").notNull(),
  timerStartedAt: timestamp("timer_started_at"),
  elapsedSeconds: integer("elapsed_seconds").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MeetingSection = typeof meetingSections.$inferSelect;

/** Talking points / discussion topics within a meeting section. */
export const meetingItems = pgTable("meeting_items", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull(),
  carriedOver: boolean("carried_over").default(false).notNull(),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Notes taken during or after a meeting, attributed to their author. */
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  sectionId: integer("section_id"),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Action items with an owner and due date. */
export const actionItems = pgTable("action_items", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  meetingId: integer("meeting_id"),
  sectionId: integer("section_id"),
  title: varchar("title", { length: 500 }).notNull(),
  ownerId: integer("owner_id"),
  dueDate: varchar("due_date", { length: 10 }), // YYYY-MM-DD
  status: actionStatusEnum("status").default("open").notNull(),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Decisions recorded during meetings. */
export const decisions = pgTable("decisions", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  sectionId: integer("section_id"),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** "Next Meeting Topics" — quick-add ideas captured between meetings. */
export const nextMeetingTopics = pgTable("next_meeting_topics", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull(),
  status: topicStatusEnum("status").default("open").notNull(),
  meetingId: integer("meeting_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Plaud plain-text transcripts attached to a meeting (stored as text). */
export const transcripts = pgTable("transcripts", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  uploadedById: integer("uploaded_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
