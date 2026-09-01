import { describe, expect, it } from "vitest";
import { CORPORATE_TEMPLATE, MANAGER_TEMPLATE } from "./template";

describe("corporate master agenda template", () => {
  it("contains the eight sections from the HT Fitness weekly agenda spreadsheet", () => {
    expect(CORPORATE_TEMPLATE).toHaveLength(8);
    expect(CORPORATE_TEMPLATE.map((s) => s.title)).toEqual([
      "Review Last Week Agenda and Meeting",
      "KPI's",
      "How to Improve the Member Experience / Grow HT",
      "Marketing",
      "New Locations / Projects",
      "Everything Else",
      "What is our 20 this week?",
      "Training",
    ]);
  });

  it("every section has a purpose, a time allocation, and talking points", () => {
    for (const section of CORPORATE_TEMPLATE) {
      expect(section.purpose.length).toBeGreaterThan(0);
      expect(section.defaultMinutes).toBeGreaterThan(0);
      expect(section.items.length).toBeGreaterThan(0);
    }
  });
});

describe("manager meeting template", () => {
  it("is a lighter agenda with a review section first", () => {
    expect(MANAGER_TEMPLATE.length).toBeGreaterThanOrEqual(4);
    expect(MANAGER_TEMPLATE[0].title).toContain("Review Last Week");
    for (const section of MANAGER_TEMPLATE) {
      expect(section.items.length).toBeGreaterThan(0);
    }
  });
});
