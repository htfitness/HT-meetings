import { and, asc, eq } from "drizzle-orm";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  actionItems,
  decisions,
  groupMembers,
  groups,
  meetingItems,
  meetingSections,
  meetings,
  nextMeetingTopics,
  notes,
  templateItems,
  templateSections,
  transcripts,
  users,
} from "../drizzle/schema";
import {
  clearSessionCookie,
  createSessionToken,
  requireAuth,
  requireSiteAdmin,
  setSessionCookie,
} from "./auth";
import { getDb } from "./db";
import * as domain from "./domain";

export const api = Router();

const asyncHandler =
  (fn: (req: any, res: any) => Promise<void>) =>
  (req: any, res: any, next: any) =>
    fn(req, res).catch(next);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Ensures the user can access the group (member or site admin). */
async function canAccessGroup(
  groupId: number,
  user: { id: number; role: string },
) {
  if (user.role === "admin") return true;
  return domain.isGroupMember(groupId, user.id);
}

async function canAdminGroup(
  groupId: number,
  user: { id: number; role: string },
) {
  if (user.role === "admin") return true;
  return domain.isGroupAdmin(groupId, user.id);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

api.get(
  "/auth/status",
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const all = await db.select({ id: users.id }).from(users).limit(1);
    res.json({ needsSetup: all.length === 0 });
  }),
);

api.post(
  "/auth/setup",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        name: z.string().min(1),
        username: z.string().min(3).max(64),
        password: z.string().min(8),
      })
      .parse(req.body);
    const db = getDb();
    const existing = await db.select({ id: users.id }).from(users).limit(1);
    if (existing.length > 0) {
      res.status(403).json({ error: "Setup already completed" });
      return;
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        username: input.username.toLowerCase(),
        passwordHash,
        role: "admin",
        lastSignedIn: new Date(),
      })
      .returning();
    const token = await createSessionToken(user.id);
    setSessionCookie(res, token);
    res.json({ ok: true });
  }),
);

api.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const input = z
      .object({ username: z.string(), password: z.string() })
      .parse(req.body);
    const db = getDb();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, input.username.toLowerCase()))
      .limit(1);
    const user = rows[0];
    if (!user || !user.active) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));
    const token = await createSessionToken(user.id);
    setSessionCookie(res, token);
    res.json({ ok: true });
  }),
);

api.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

api.get(
  "/auth/me",
  asyncHandler(async (req, res) => {
    if (!req.user) {
      res.json({ user: null });
      return;
    }
    const { passwordHash: _ph, ...safe } = req.user;
    const myGroups = await domain.groupsForUser(
      req.user.id,
      req.user.role === "admin",
    );
    res.json({ user: safe, groups: myGroups });
  }),
);

api.post(
  "/auth/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })
      .parse(req.body);
    const valid = await bcrypt.compare(
      input.currentPassword,
      req.user.passwordHash,
    );
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const db = getDb();
    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, req.user.id));
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Users (site admin)
// ---------------------------------------------------------------------------

api.get(
  "/users",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const all = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        active: users.active,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .orderBy(asc(users.name));
    res.json(all);
  }),
);

api.post(
  "/users",
  requireSiteAdmin,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        name: z.string().min(1),
        username: z.string().min(3).max(64),
        password: z.string().min(8),
        role: z.enum(["user", "admin"]).default("user"),
      })
      .parse(req.body);
    const db = getDb();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, input.username.toLowerCase()))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        username: input.username.toLowerCase(),
        passwordHash,
        role: input.role,
      })
      .returning();
    res.json({ id: user.id, name: user.name });
  }),
);

api.post(
  "/users/:id/reset-password",
  requireSiteAdmin,
  asyncHandler(async (req, res) => {
    const input = z.object({ newPassword: z.string().min(8) }).parse(req.body);
    const db = getDb();
    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, Number(req.params.id)));
    res.json({ ok: true });
  }),
);

api.post(
  "/users/:id/active",
  requireSiteAdmin,
  asyncHandler(async (req, res) => {
    const input = z.object({ active: z.boolean() }).parse(req.body);
    const db = getDb();
    await db
      .update(users)
      .set({ active: input.active })
      .where(eq(users.id, Number(req.params.id)));
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Groups & membership
// ---------------------------------------------------------------------------

api.get(
  "/groups",
  requireAuth,
  asyncHandler(async (req, res) => {
    const myGroups = await domain.groupsForUser(
      req.user.id,
      req.user.role === "admin",
    );
    res.json(myGroups);
  }),
);

api.post(
  "/groups",
  requireSiteAdmin,
  asyncHandler(async (req, res) => {
    const input = z
      .object({ name: z.string().min(1), description: z.string().optional() })
      .parse(req.body);
    const db = getDb();
    const [group] = await db
      .insert(groups)
      .values({ name: input.name, description: input.description ?? null })
      .returning();
    res.json(group);
  }),
);

api.get(
  "/groups/:id/members",
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.id);
    if (!(await canAccessGroup(groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    res.json(await domain.listGroupMembers(groupId));
  }),
);

api.post(
  "/groups/:id/members",
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.id);
    if (!(await canAdminGroup(groupId, req.user))) {
      res.status(403).json({ error: "Group admin required" });
      return;
    }
    const input = z
      .object({
        userId: z.number(),
        role: z.enum(["member", "group_admin"]).default("member"),
      })
      .parse(req.body);
    const db = getDb();
    const existing = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, input.userId),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      await db
        .update(groupMembers)
        .set({ role: input.role })
        .where(eq(groupMembers.id, existing[0].id));
    } else {
      await db
        .insert(groupMembers)
        .values({ groupId, userId: input.userId, role: input.role });
    }
    res.json({ ok: true });
  }),
);

api.delete(
  "/groups/:id/members/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.id);
    if (!(await canAdminGroup(groupId, req.user))) {
      res.status(403).json({ error: "Group admin required" });
      return;
    }
    const db = getDb();
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, Number(req.params.userId)),
        ),
      );
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

api.get(
  "/groups/:id/template",
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.id);
    if (!(await canAccessGroup(groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    res.json(await domain.getTemplate(groupId));
  }),
);

api.put(
  "/template/sections/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        title: z.string().min(1),
        purpose: z.string().optional(),
        defaultMinutes: z.number().min(1).max(180),
      })
      .parse(req.body);
    const db = getDb();
    const section = await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.id, Number(req.params.id)))
      .limit(1);
    if (!section[0] || !(await canAdminGroup(section[0].groupId, req.user))) {
      res.status(403).json({ error: "Group admin required" });
      return;
    }
    await db
      .update(templateSections)
      .set({
        title: input.title,
        purpose: input.purpose ?? null,
        defaultMinutes: input.defaultMinutes,
      })
      .where(eq(templateSections.id, section[0].id));
    res.json({ ok: true });
  }),
);

api.post(
  "/template/sections/:id/items",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z.object({ content: z.string().min(1) }).parse(req.body);
    const db = getDb();
    const section = await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.id, Number(req.params.id)))
      .limit(1);
    if (!section[0] || !(await canAdminGroup(section[0].groupId, req.user))) {
      res.status(403).json({ error: "Group admin required" });
      return;
    }
    const items = await db
      .select()
      .from(templateItems)
      .where(eq(templateItems.sectionId, section[0].id));
    await db.insert(templateItems).values({
      sectionId: section[0].id,
      content: input.content,
      sortOrder: items.length,
    });
    res.json({ ok: true });
  }),
);

api.put(
  "/template/items/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z.object({ content: z.string().min(1) }).parse(req.body);
    const db = getDb();
    const item = await db
      .select()
      .from(templateItems)
      .where(eq(templateItems.id, Number(req.params.id)))
      .limit(1);
    if (!item[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const section = await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.id, item[0].sectionId))
      .limit(1);
    if (!section[0] || !(await canAdminGroup(section[0].groupId, req.user))) {
      res.status(403).json({ error: "Group admin required" });
      return;
    }
    await db
      .update(templateItems)
      .set({ content: input.content })
      .where(eq(templateItems.id, item[0].id));
    res.json({ ok: true });
  }),
);

api.delete(
  "/template/items/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const item = await db
      .select()
      .from(templateItems)
      .where(eq(templateItems.id, Number(req.params.id)))
      .limit(1);
    if (!item[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const section = await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.id, item[0].sectionId))
      .limit(1);
    if (!section[0] || !(await canAdminGroup(section[0].groupId, req.user))) {
      res.status(403).json({ error: "Group admin required" });
      return;
    }
    await db.delete(templateItems).where(eq(templateItems.id, item[0].id));
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

api.get(
  "/groups/:id/meetings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.id);
    if (!(await canAccessGroup(groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    res.json(await domain.listMeetings(groupId));
  }),
);

api.post(
  "/groups/:id/meetings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.id);
    if (!(await canAccessGroup(groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    const input = z
      .object({
        title: z.string().min(1),
        meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(req.body);
    const meeting = await domain.createMeetingFromTemplate({
      groupId,
      title: input.title,
      meetingDate: input.meetingDate,
      createdById: req.user.id,
    });
    res.json(meeting);
  }),
);

async function meetingWithAccess(req: any, res: any): Promise<any | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, Number(req.params.id)))
    .limit(1);
  const meeting = rows[0];
  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return null;
  }
  if (!(await canAccessGroup(meeting.groupId, req.user))) {
    res.status(403).json({ error: "Not a member of this group" });
    return null;
  }
  return meeting;
}

api.get(
  "/meetings/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const meeting = await meetingWithAccess(req, res);
    if (!meeting) return;
    res.json(await domain.getMeetingDetail(meeting.id));
  }),
);

api.post(
  "/meetings/:id/start",
  requireAuth,
  asyncHandler(async (req, res) => {
    const meeting = await meetingWithAccess(req, res);
    if (!meeting) return;
    const db = getDb();
    const sections = await db
      .select()
      .from(meetingSections)
      .where(eq(meetingSections.meetingId, meeting.id))
      .orderBy(asc(meetingSections.sortOrder));
    const first = sections[0];
    await db
      .update(meetings)
      .set({
        status: "in_progress",
        startedAt: new Date(),
        currentSectionId: first?.id ?? null,
      })
      .where(eq(meetings.id, meeting.id));
    if (first) {
      await db
        .update(meetingSections)
        .set({ timerStartedAt: new Date() })
        .where(eq(meetingSections.id, first.id));
    }
    res.json({ ok: true });
  }),
);

api.post(
  "/meetings/:id/complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const meeting = await meetingWithAccess(req, res);
    if (!meeting) return;
    const db = getDb();
    const sections = await db
      .select()
      .from(meetingSections)
      .where(eq(meetingSections.meetingId, meeting.id));
    for (const s of sections) {
      if (s.timerStartedAt) {
        const extra = Math.floor(
          (Date.now() - new Date(s.timerStartedAt).getTime()) / 1000,
        );
        await db
          .update(meetingSections)
          .set({
            timerStartedAt: null,
            elapsedSeconds: s.elapsedSeconds + Math.max(0, extra),
          })
          .where(eq(meetingSections.id, s.id));
      }
    }
    await db
      .update(meetings)
      .set({ status: "completed", completedAt: new Date(), currentSectionId: null })
      .where(eq(meetings.id, meeting.id));
    res.json({ ok: true });
  }),
);

api.post(
  "/meetings/:id/current-section",
  requireAuth,
  asyncHandler(async (req, res) => {
    const meeting = await meetingWithAccess(req, res);
    if (!meeting) return;
    const input = z.object({ sectionId: z.number() }).parse(req.body);
    const db = getDb();
    const sections = await db
      .select()
      .from(meetingSections)
      .where(eq(meetingSections.meetingId, meeting.id));
    for (const s of sections) {
      if (s.timerStartedAt) {
        const extra = Math.floor(
          (Date.now() - new Date(s.timerStartedAt).getTime()) / 1000,
        );
        await db
          .update(meetingSections)
          .set({
            timerStartedAt: null,
            elapsedSeconds: s.elapsedSeconds + Math.max(0, extra),
          })
          .where(eq(meetingSections.id, s.id));
      }
    }
    await db
      .update(meetingSections)
      .set({ timerStartedAt: new Date() })
      .where(eq(meetingSections.id, input.sectionId));
    await db
      .update(meetings)
      .set({ currentSectionId: input.sectionId })
      .where(eq(meetings.id, meeting.id));
    res.json({ ok: true });
  }),
);

api.put(
  "/sections/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        title: z.string().min(1),
        purpose: z.string().optional(),
        plannedMinutes: z.number().min(1).max(180),
      })
      .parse(req.body);
    const db = getDb();
    const rows = await db
      .select()
      .from(meetingSections)
      .where(eq(meetingSections.id, Number(req.params.id)))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const meetingRows = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, rows[0].meetingId))
      .limit(1);
    if (!meetingRows[0] || !(await canAccessGroup(meetingRows[0].groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    await db
      .update(meetingSections)
      .set({
        title: input.title,
        purpose: input.purpose ?? null,
        plannedMinutes: input.plannedMinutes,
      })
      .where(eq(meetingSections.id, rows[0].id));
    res.json({ ok: true });
  }),
);

api.post(
  "/sections/:id/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z
      .object({ status: z.enum(["pending", "discussed", "deferred", "skipped"]) })
      .parse(req.body);
    const db = getDb();
    const rows = await db
      .select()
      .from(meetingSections)
      .where(eq(meetingSections.id, Number(req.params.id)))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const meetingRows = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, rows[0].meetingId))
      .limit(1);
    if (!meetingRows[0] || !(await canAccessGroup(meetingRows[0].groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    await db
      .update(meetingSections)
      .set({ status: input.status })
      .where(eq(meetingSections.id, rows[0].id));
    res.json({ ok: true });
  }),
);

api.post(
  "/sections/:id/items",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z.object({ content: z.string().min(1) }).parse(req.body);
    const db = getDb();
    const sectionRows = await db
      .select()
      .from(meetingSections)
      .where(eq(meetingSections.id, Number(req.params.id)))
      .limit(1);
    if (!sectionRows[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const meetingRows = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, sectionRows[0].meetingId))
      .limit(1);
    if (!meetingRows[0] || !(await canAccessGroup(meetingRows[0].groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    const items = await db
      .select()
      .from(meetingItems)
      .where(eq(meetingItems.sectionId, sectionRows[0].id));
    await db.insert(meetingItems).values({
      sectionId: sectionRows[0].id,
      content: input.content,
      sortOrder: items.length,
      createdById: req.user.id,
    });
    res.json({ ok: true });
  }),
);

api.put(
  "/items/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z.object({ content: z.string().min(1) }).parse(req.body);
    const db = getDb();
    await db
      .update(meetingItems)
      .set({ content: input.content })
      .where(eq(meetingItems.id, Number(req.params.id)));
    res.json({ ok: true });
  }),
);

api.delete(
  "/items/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = getDb();
    await db.delete(meetingItems).where(eq(meetingItems.id, Number(req.params.id)));
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Notes & decisions
// ---------------------------------------------------------------------------

api.post(
  "/meetings/:id/notes",
  requireAuth,
  asyncHandler(async (req, res) => {
    const meeting = await meetingWithAccess(req, res);
    if (!meeting) return;
    const input = z
      .object({
        content: z.string().min(1),
        sectionId: z.number().optional(),
      })
      .parse(req.body);
    const db = getDb();
    await db.insert(notes).values({
      meetingId: meeting.id,
      sectionId: input.sectionId ?? null,
      content: input.content,
      authorId: req.user.id,
    });
    res.json({ ok: true });
  }),
);

api.put(
  "/notes/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z.object({ content: z.string().min(1) }).parse(req.body);
    const db = getDb();
    const rows = await db
      .select()
      .from(notes)
      .where(eq(notes.id, Number(req.params.id)))
      .limit(1);
    if (!rows[0] || (rows[0].authorId !== req.user.id && req.user.role !== "admin")) {
      res.status(403).json({ error: "You can only edit your own notes" });
      return;
    }
    await db
      .update(notes)
      .set({ content: input.content, updatedAt: new Date() })
      .where(eq(notes.id, rows[0].id));
    res.json({ ok: true });
  }),
);

api.delete(
  "/notes/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(notes)
      .where(eq(notes.id, Number(req.params.id)))
      .limit(1);
    if (!rows[0] || (rows[0].authorId !== req.user.id && req.user.role !== "admin")) {
      res.status(403).json({ error: "You can only delete your own notes" });
      return;
    }
    await db.delete(notes).where(eq(notes.id, rows[0].id));
    res.json({ ok: true });
  }),
);

api.post(
  "/meetings/:id/decisions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const meeting = await meetingWithAccess(req, res);
    if (!meeting) return;
    const input = z
      .object({
        content: z.string().min(1),
        sectionId: z.number().optional(),
      })
      .parse(req.body);
    const db = getDb();
    await db.insert(decisions).values({
      meetingId: meeting.id,
      sectionId: input.sectionId ?? null,
      content: input.content,
      authorId: req.user.id,
    });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Action items
// ---------------------------------------------------------------------------

api.get(
  "/groups/:id/action-items",
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.id);
    if (!(await canAccessGroup(groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    res.json(await domain.listGroupActionItems(groupId));
  }),
);

api.get(
  "/action-items/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await domain.myActionItems(req.user.id));
  }),
);

api.get(
  "/action-items/reminders",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await domain.dueReminders(req.user.id, todayStr()));
  }),
);

api.post(
  "/action-items",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        groupId: z.number(),
        title: z.string().min(1),
        meetingId: z.number().optional(),
        sectionId: z.number().optional(),
        ownerId: z.number().optional(),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(req.body);
    if (!(await canAccessGroup(input.groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    const db = getDb();
    await db.insert(actionItems).values({
      groupId: input.groupId,
      title: input.title,
      meetingId: input.meetingId ?? null,
      sectionId: input.sectionId ?? null,
      ownerId: input.ownerId ?? req.user.id,
      dueDate: input.dueDate ?? null,
      createdById: req.user.id,
    });
    res.json({ ok: true });
  }),
);

api.put(
  "/action-items/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        title: z.string().min(1).optional(),
        ownerId: z.number().nullable().optional(),
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        status: z.enum(["open", "done", "cancelled"]).optional(),
      })
      .parse(req.body);
    const db = getDb();
    const update: Record<string, unknown> = {};
    if (input.title !== undefined) update.title = input.title;
    if (input.ownerId !== undefined) update.ownerId = input.ownerId;
    if (input.dueDate !== undefined) update.dueDate = input.dueDate;
    if (input.status !== undefined) update.status = input.status;
    await db
      .update(actionItems)
      .set(update)
      .where(eq(actionItems.id, Number(req.params.id)));
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Next Meeting Topics
// ---------------------------------------------------------------------------

api.get(
  "/groups/:id/topics",
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.id);
    if (!(await canAccessGroup(groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    res.json(await domain.listTopics(groupId));
  }),
);

api.post(
  "/groups/:id/topics",
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.id);
    if (!(await canAccessGroup(groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    const input = z.object({ content: z.string().min(1) }).parse(req.body);
    const db = getDb();
    await db.insert(nextMeetingTopics).values({
      groupId,
      content: input.content,
      authorId: req.user.id,
    });
    res.json({ ok: true });
  }),
);

api.put(
  "/topics/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        status: z.enum(["open", "added", "declined"]).optional(),
        meetingId: z.number().nullable().optional(),
      })
      .parse(req.body);
    const db = getDb();
    const update: Record<string, unknown> = {};
    if (input.status !== undefined) update.status = input.status;
    if (input.meetingId !== undefined) update.meetingId = input.meetingId;
    await db
      .update(nextMeetingTopics)
      .set(update)
      .where(eq(nextMeetingTopics.id, Number(req.params.id)));
    res.json({ ok: true });
  }),
);

api.delete(
  "/topics/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(nextMeetingTopics)
      .where(eq(nextMeetingTopics.id, Number(req.params.id)))
      .limit(1);
    if (!rows[0] || (rows[0].authorId !== req.user.id && req.user.role !== "admin")) {
      res.status(403).json({ error: "Not allowed" });
      return;
    }
    await db.delete(nextMeetingTopics).where(eq(nextMeetingTopics.id, rows[0].id));
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Transcripts (plain text, stored in the database)
// ---------------------------------------------------------------------------

api.post(
  "/meetings/:id/transcripts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const meeting = await meetingWithAccess(req, res);
    if (!meeting) return;
    const input = z
      .object({
        fileName: z.string().min(1).max(255),
        content: z.string().min(1).max(2_000_000),
      })
      .parse(req.body);
    const db = getDb();
    await db.insert(transcripts).values({
      meetingId: meeting.id,
      fileName: input.fileName,
      content: input.content,
      uploadedById: req.user.id,
    });
    res.json({ ok: true });
  }),
);

api.delete(
  "/transcripts/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.id, Number(req.params.id)))
      .limit(1);
    if (!rows[0] || (rows[0].uploadedById !== req.user.id && req.user.role !== "admin")) {
      res.status(403).json({ error: "Not allowed" });
      return;
    }
    await db.delete(transcripts).where(eq(transcripts.id, rows[0].id));
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

api.get(
  "/groups/:id/search",
  requireAuth,
  asyncHandler(async (req, res) => {
    const groupId = Number(req.params.id);
    if (!(await canAccessGroup(groupId, req.user))) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }
    const q = String(req.query.q ?? "").trim();
    if (!q) {
      res.json({ meetings: [], notes: [], decisions: [], actionItems: [], transcripts: [] });
      return;
    }
    res.json(await domain.searchGroup(groupId, q));
  }),
);
