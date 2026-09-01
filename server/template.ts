/**
 * Default master agenda for the Corporate Leadership group, seeded from
 * "Master Weekly Meeting Agenda Lisa Jason Amanda.xlsx".
 */
export const CORPORATE_TEMPLATE: Array<{
  title: string;
  purpose: string;
  defaultMinutes: number;
  items: string[];
}> = [
  {
    title: "Review Last Week Agenda and Meeting",
    purpose:
      "Make sure we are staying on track and focused on the 20. Are you focused on the 20 or the 80? Signal or Noise? Needle Movers or Busy work? Let's agree on terminology.",
    defaultMinutes: 10,
    items: ["What did we get done?", "Which saying do we want to adopt?"],
  },
  {
    title: "KPI's",
    purpose:
      "Are we on track of hitting our Goals? With our plan we ask questions to guide them to come up with solutions and OWN the plan.",
    defaultMinutes: 10,
    items: [
      "Review HT KPIs.",
      "1st of Month - Review last month's Numbers",
      "1st of Month - Review P&L and Balance Sheets",
    ],
  },
  {
    title: "How to Improve the Member Experience / Grow HT",
    purpose:
      "CANI - We are constantly making little tweaks to improve and make HT Fitness better. We need to do this skillfully not to create Chaos. Maybe we go over the 7 forces here.",
    defaultMinutes: 10,
    items: [
      "What can we do to grow HT and better serve our Members?",
      "Are there systems / training we need to improve?",
    ],
  },
  {
    title: "Marketing",
    purpose:
      "What is working? What is not? Get our plan down to communicate with Team everything that is going out.",
    defaultMinutes: 10,
    items: [
      "What Marketing Campaigns are we currently doing",
      "What Promotions are coming up next",
      "What is our Signal this Week?",
    ],
  },
  {
    title: "New Locations / Projects",
    purpose:
      "Make sure we are making progress towards reaching our 20 Locations.",
    defaultMinutes: 10,
    items: [
      "Where are we are new locations?",
      "Review each current project and status.",
      "Do we have staff ready?",
    ],
  },
  {
    title: "Everything Else",
    purpose:
      "Get them to recognize when they make a mistake and learn from it so they don't make the same mistake again. Show them they are allowed to make mistakes as long as they fix and improve them.",
    defaultMinutes: 10,
    items: [
      "Staff Change?",
      "Misc Projects / Investments?",
      "What will you do different next time?",
    ],
  },
  {
    title: "What is our 20 this week?",
    purpose:
      "What our outcome this week? Make sure we all leave knowing EXACTLY what we need to focus on and accomplish.",
    defaultMinutes: 10,
    items: ["What is each of our's 20 this week?"],
  },
  {
    title: "Training",
    purpose:
      "I think we must get better. How about something small. We watch a short maximum 5 minute video and talk about it.",
    defaultMinutes: 5,
    items: [
      "Training to Improve - Something to think about this week and take action on.",
    ],
  },
];

/** Lighter default template for manager-level meetings. */
export const MANAGER_TEMPLATE: Array<{
  title: string;
  purpose: string;
  defaultMinutes: number;
  items: string[];
}> = [
  {
    title: "Review Last Week",
    purpose: "Follow up on last week's action items and commitments.",
    defaultMinutes: 10,
    items: ["What did we get done?", "What carried over and why?"],
  },
  {
    title: "Location KPI's",
    purpose: "Are we on track to hit our location goals?",
    defaultMinutes: 10,
    items: ["Review location KPIs.", "Where do we need support?"],
  },
  {
    title: "Member Experience",
    purpose: "Constantly improve how we serve our members.",
    defaultMinutes: 10,
    items: [
      "Member feedback this week?",
      "What can we do better on the floor?",
    ],
  },
  {
    title: "Staff & Training",
    purpose: "Build the team and fix issues early.",
    defaultMinutes: 10,
    items: ["Staffing changes or needs?", "Training focus for this week?"],
  },
  {
    title: "What is our 20 this week?",
    purpose:
      "Make sure everyone leaves knowing EXACTLY what to focus on and accomplish.",
    defaultMinutes: 10,
    items: ["What is each person's 20 this week?"],
  },
];
