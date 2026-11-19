import { describe, expect, it } from "vitest";
import type { MembershipRole, ProjectStatus } from "@prisma/client";
import {
  canCreateProject,
  canManageMembers,
  canReadAuditLog,
  canTransitionProjectStatus,
  canUpdateProject
} from "./policies.js";

const roles: MembershipRole[] = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];
const projectWriters: MembershipRole[] = ["OWNER", "ADMIN", "MANAGER"];
const administrators: MembershipRole[] = ["OWNER", "ADMIN"];

describe("organization authorization matrix", () => {
  it.each(roles)("applies project creation policy to %s", role => {
    expect(canCreateProject(role)).toBe(projectWriters.includes(role));
  });

  it.each(roles)("applies project update policy to %s", role => {
    expect(canUpdateProject(role)).toBe(projectWriters.includes(role));
  });

  it.each(roles)("applies audit visibility policy to %s", role => {
    expect(canReadAuditLog(role)).toBe(administrators.includes(role));
  });

  it.each(roles)("applies member-management policy to %s", role => {
    expect(canManageMembers(role)).toBe(administrators.includes(role));
  });

  it("keeps the permission boundaries explicit", () => {
    expect(canCreateProject("VIEWER")).toBe(false);
    expect(canUpdateProject("MEMBER")).toBe(false);
    expect(canManageMembers("MANAGER")).toBe(false);
    expect(canReadAuditLog("MEMBER")).toBe(false);
  });
});

describe("project lifecycle state machine", () => {
  const allowed: Record<ProjectStatus, ProjectStatus[]> = {
    PLANNING: ["ACTIVE", "ARCHIVED"],
    ACTIVE: ["ON_HOLD", "COMPLETED", "ARCHIVED"],
    ON_HOLD: ["ACTIVE", "ARCHIVED"],
    COMPLETED: ["ARCHIVED"],
    ARCHIVED: []
  };

  const statuses = Object.keys(allowed) as ProjectStatus[];

  it.each(statuses)("allows only declared transitions from %s", from => {
    for (const to of statuses) {
      expect(canTransitionProjectStatus(from, to)).toBe(allowed[from].includes(to));
    }
  });

  it("does not allow a state to transition to itself", () => {
    for (const status of statuses) {
      expect(canTransitionProjectStatus(status, status)).toBe(false);
    }
  });

  it("does not allow completed or archived projects to become active again", () => {
    expect(canTransitionProjectStatus("COMPLETED", "ACTIVE")).toBe(false);
    expect(canTransitionProjectStatus("ARCHIVED", "ACTIVE")).toBe(false);
  });
});
