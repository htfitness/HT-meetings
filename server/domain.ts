import { and, asc, desc, eq, inArray, like, lte, ne, or } from "drizzle-orm";
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
import { getDb } from "./db";
import { CORPORATE_TEMPLATE, MANAGER_TEMPLATE } from "./template";

type TemplateDef = typeof CORPORATE_TEMPLATE;

async function seedTemplateForGroup(groupId: number, def: TemplateDef) {
  const db = getDb();
  for (let i = 0; i < def.length; i++) {
    const section = def[i];
    const [inserted] = await db
      .insert(templateSections)
      .values({
        groupId,
        title: section.title,
        purpose: section.purpose,
        defaultMinutes: section.defaultMinutes,
        sortOrder: i,
      })
      .returning();
    for (let j = 0; j < section.items.length; j++) {
      await db.insert(templateItems).values({
        sectionId: inserted.id,
        content: section.items[j],
        sortOrder: j,
      });
    }
  }
}

/** Create the three default groups with their templates if none exist. */
export async function ensureDefaultGroups() {
  const db = getDb();
  const existing = await db.select().from(groups).limit(1);
  if (existing.length > 0) return;

  const seeds: Array<{ name: string; description: string; def: TemplateDef }> = [
    {
      name: "Corporate Leadership",
      description: "Weekly leadership meeting",
      def: CORPORATE_TEMPLATE,
    },
    {
      name: "Managers Meeting",
      description: "Weekly managers meeting",
      def: MANAGER_TEMPLATE,
    },
    {
      name: "Assistant Managers Meeting",
      description: "Weekly assistant managers meeting",
      def: MANAGER_TEMPLATE,
    },
  ];

  for (const seed of seeds) {
    const [group] = await db
      .insert(groups)
      .values({ name: seed.name, description: seed.description })
      .returning();
    await seedTemplateForGroup(group.id, seed.def);
  }
  console.log("[db] Seeded default groups and templates");
}

/** Groups the given user belongs to (all groups for site admins). */
export async function groupsForUser(userId: number, isSiteAdmin: boolean) {
  const db = getDb();
  if (isSiteAdmin) {
    const all = await db.select().from(groups).orderBy(asc(groups.name));
    return all.map((g) => ({ ...g, memberRole: "group_admin" as const }));
  }
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      createdAt: groups.createdAt,
      memberRole: groupMembers.role,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId))
    .orderBy(asc(groups.name));
  return rows;
}

export async function isGroupMember(groupId: number, userId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function isGroupAdmin(groupId: number, userId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
        eq(groupMembers.role, "group_admin"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function getTemplate(groupId: number) {
  const db = getDb();
  const sections = await db
    .select()
    .from(templateSections)
    .where(eq(templateSections.groupId, groupId))
    .orderBy(asc(templateSections.sortOrder));
  const ids = sections.map((s) => s.id);
  const items =
    ids.length > 0
      ? await db
          .select()
          .from(templateItems)
          .where(inArray(templateItems.sectionId, ids))
          .orderBy(asc(templateItems.sortOrder))
      : [];
  return sections.map((s) => ({
    ...s,
    items: items.filter((it) => it.sectionId === s.id),
  }));
}

export async function listMeetings(groupId: number) {
  const db = getDb();
  return db
    .select()
    .from(meetings)
    .where(eq(meetings.groupId, groupId))
    .orderBy(desc(meetings.meetingDate));
}

export async function getMeetingDetail(meetingId: number) {
  const db = getDb();
  const meetingRows = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .limit(1);
  const meeting = meetingRows[0];
  if (!meeting) return undefined;

  const sections = await db
    .select()
    .from(meetingSections)
    .where(eq(meetingSections.meetingId, meetingId))
    .orderBy(asc(meetingSections.sortOrder));

  const sectionIds = sections.map((s) => s.id);
  const items =
    sectionIds.length > 0
      ? await db
          .select()
          .from(meetingItems)
          .where(inArray(meetingItems.sectionId, sectionIds))
          .orderBy(asc(meetingItems.sortOrder))
      : [];

  const meetingNotes = await db
    .select({
      id: notes.id,
      meetingId: notes.meetingId,
      sectionId: notes.sectionId,
      content: notes.content,
      authorId: notes.authorId,
      authorName: users.name,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .leftJoin(users, eq(notes.authorId, users.id))
    .where(eq(notes.meetingId, meetingId))
    .orderBy(desc(notes.createdAt));

  const meetingActions = await db
    .select({
      id: actionItems.id,
      meetingId: actionItems.meetingId,
      sectionId: actionItems.sectionId,
      title: actionItems.title,
      ownerId: actionItems.ownerId,
      ownerName: users.name,
      dueDate: actionItems.dueDate,
      status: actionItems.status,
      createdById: actionItems.createdById,
      createdAt: actionItems.createdAt,
    })
    .from(actionItems)
    .leftJoin(users, eq(actionItems.ownerId, users.id))
    .where(eq(actionItems.meetingId, meetingId))
    .orderBy(asc(actionItems.dueDate));

  const meetingDecisions = await db
    .select({
      id: decisions.id,
      meetingId: decisions.meetingId,
      sectionId: decisions.sectionId,
      content: decisions.content,
      authorId: decisions.authorId,
      authorName: users.name,
      createdAt: decisions.createdAt,
    })
    .from(decisions)
    .leftJoin(users, eq(decisions.authorId, users.id))
    .where(eq(decisions.meetingId, meetingId))
    .orderBy(desc(decisions.createdAt));

  const meetingTranscripts = await db
    .select({
      id: transcripts.id,
      meetingId: transcripts.meetingId,
      fileName: transcripts.fileName,
      content: transcripts.content,
      uploadedById: transcripts.uploadedById,
      uploaderName: users.name,
      createdAt: transcripts.createdAt,
    })
    .from(transcripts)
    .leftJoin(users, eq(transcripts.uploadedById, users.id))
    .where(eq(transcripts.meetingId, meetingId))
    .orderBy(desc(transcripts.createdAt));

  return {
    ...meeting,
    sections: sections.map((s) => ({
      ...s,
      items: items.filter((it) => it.sectionId === s.id),
    })),
    notes: meetingNotes,
    actionItems: meetingActions,
    decisions: meetingDecisions,
    transcripts: meetingTranscripts,
  };
}

/**
 * Create a meeting from the group's template. Carries deferred sections from
 * the most recent prior meeting into "Review Last Week" as talking points.
 */
export async function createMeetingFromTemplate(input: {
  groupId: number;
  title: string;
  meetingDate: string;
  createdById: number;
}) {
  const db = getDb();
  const template = await getTemplate(input.groupId);

  const [meeting] = await db
    .insert(meetings)
    .values({
      groupId: input.groupId,
      title: input.title,
      meetingDate: input.meetingDate,
      createdById: input.createdById,
    })
    .returning();

  let reviewSectionId: number | null = null;

  for (const section of template) {
    if (!section.active) continue;
    const [sec] = await db
      .insert(meetingSections)
      .values({
        meetingId: meeting.id,
        title: section.title,
        purpose: section.purpose,
        plannedMinutes: section.defaultMinutes,
        sortOrder: section.sortOrder,
      })
      .returning();
    if (section.title.toLowerCase().startsWith("review last week")) {
      reviewSectionId = sec.id;
    }
    for (const item of section.items) {
      await db.insert(meetingItems).values({
        sectionId: sec.id,
        content: item.content,
        sortOrder: item.sortOrder,
      });
    }
  }

  // Carry over deferred sections from the most recent prior meeting.
  const prior = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.groupId, input.groupId), ne(meetings.id, meeting.id)))
    .orderBy(desc(meetings.meetingDate))
    .limit(1);

  if (prior.length > 0 && reviewSectionId) {
    const deferred = await db
      .select()
      .from(meetingSections)
      .where(
        and(
          eq(meetingSections.meetingId, prior[0].id),
          eq(meetingSections.status, "deferred"),
        ),
      );
    for (const ds of deferred) {
      await db.insert(meetingItems).values({
        sectionId: reviewSectionId,
        content: `Deferred from ${prior[0].meetingDate}: ${ds.title}`,
        sortOrder: 100 + ds.sortOrder,
        carriedOver: true,
      });
    }
  }

  return getMeetingDetail(meeting.id);
}

export async function listGroupActionItems(groupId: number, openOnly = false) {
  const db = getDb();
  const conditions = [eq(actionItems.groupId, groupId)];
  if (openOnly) conditions.push(eq(actionItems.status, "open"));
  return db
    .select({
      id: actionItems.id,
      groupId: actionItems.groupId,
      meetingId: actionItems.meetingId,
      title: actionItems.title,
      ownerId: actionItems.ownerId,
      ownerName: users.name,
      dueDate: actionItems.dueDate,
      status: actionItems.status,
      createdAt: actionItems.createdAt,
    })
    .from(actionItems)
    .leftJoin(users, eq(actionItems.ownerId, users.id))
    .where(and(...conditions))
    .orderBy(asc(actionItems.dueDate));
}

/** All open action items assigned to a user across every group. */
export async function myActionItems(userId: number) {
  const db = getDb();
  return db
    .select({
      id: actionItems.id,
      groupId: actionItems.groupId,
      groupName: groups.name,
      meetingId: actionItems.meetingId,
      title: actionItems.title,
      ownerId: actionItems.ownerId,
      dueDate: actionItems.dueDate,
      status: actionItems.status,
      createdAt: actionItems.createdAt,
    })
    .from(actionItems)
    .leftJoin(groups, eq(actionItems.groupId, groups.id))
    .where(and(eq(actionItems.ownerId, userId), eq(actionItems.status, "open")))
    .orderBy(asc(actionItems.dueDate));
}

/** Open items due today or earlier, for in-app reminders. */
export async function dueReminders(userId: number, today: string) {
  const db = getDb();
  return db
    .select({
      id: actionItems.id,
      groupId: actionItems.groupId,
      groupName: groups.name,
      title: actionItems.title,
      dueDate: actionItems.dueDate,
    })
    .from(actionItems)
    .leftJoin(groups, eq(actionItems.groupId, groups.id))
    .where(
      and(
        eq(actionItems.ownerId, userId),
        eq(actionItems.status, "open"),
        lte(actionItems.dueDate, today),
      ),
    )
    .orderBy(asc(actionItems.dueDate));
}

export async function listTopics(groupId: number) {
  const db = getDb();
  return db
    .select({
      id: nextMeetingTopics.id,
      groupId: nextMeetingTopics.groupId,
      content: nextMeetingTopics.content,
      authorId: nextMeetingTopics.authorId,
      authorName: users.name,
      status: nextMeetingTopics.status,
      meetingId: nextMeetingTopics.meetingId,
      createdAt: nextMeetingTopics.createdAt,
    })
    .from(nextMeetingTopics)
    .leftJoin(users, eq(nextMeetingTopics.authorId, users.id))
    .where(eq(nextMeetingTopics.groupId, groupId))
    .orderBy(desc(nextMeetingTopics.createdAt));
}

export async function searchGroup(groupId: number, query: string) {
  const db = getDb();
  const pattern = `%${query}%`;

  const groupMeetings = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.groupId, groupId), like(meetings.title, pattern)))
    .orderBy(desc(meetings.meetingDate))
    .limit(20);

  const meetingIds = (
    await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(eq(meetings.groupId, groupId))
  ).map((m) => m.id);

  if (meetingIds.length === 0) {
    return { meetings: groupMeetings, notes: [], decisions: [], actionItems: [], transcripts: [] };
  }

  const foundNotes = await db
    .select({
      id: notes.id,
      meetingId: notes.meetingId,
      content: notes.content,
      authorName: users.name,
      createdAt: notes.createdAt,
    })
    .from(notes)
    .leftJoin(users, eq(notes.authorId, users.id))
    .where(and(inArray(notes.meetingId, meetingIds), like(notes.content, pattern)))
    .orderBy(desc(notes.createdAt))
    .limit(50);

  const foundDecisions = await db
    .select({
      id: decisions.id,
      meetingId: decisions.meetingId,
      content: decisions.content,
      authorName: users.name,
      createdAt: decisions.createdAt,
    })
    .from(decisions)
    .leftJoin(users, eq(decisions.authorId, users.id))
    .where(and(inArray(decisions.meetingId, meetingIds), like(decisions.content, pattern)))
    .orderBy(desc(decisions.createdAt))
    .limit(50);

  const foundActions = await db
    .select({
      id: actionItems.id,
      meetingId: actionItems.meetingId,
      title: actionItems.title,
      ownerName: users.name,
      dueDate: actionItems.dueDate,
      status: actionItems.status,
    })
    .from(actionItems)
    .leftJoin(users, eq(actionItems.ownerId, users.id))
    .where(and(eq(actionItems.groupId, groupId), like(actionItems.title, pattern)))
    .limit(50);

  const foundTranscripts = await db
    .select({
      id: transcripts.id,
      meetingId: transcripts.meetingId,
      fileName: transcripts.fileName,
      createdAt: transcripts.createdAt,
    })
    .from(transcripts)
    .where(
      and(
        inArray(transcripts.meetingId, meetingIds),
        or(like(transcripts.fileName, pattern), like(transcripts.content, pattern)),
      ),
    )
    .limit(20);

  return {
    meetings: groupMeetings,
    notes: foundNotes,
    decisions: foundDecisions,
    actionItems: foundActions,
    transcripts: foundTranscripts,
  };
}

export async function listGroupMembers(groupId: number) {
  const db = getDb();
  return db
    .select({
      memberId: groupMembers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      memberRole: groupMembers.role,
      active: users.active,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(users.name));
}
