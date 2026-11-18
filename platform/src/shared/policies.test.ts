import { describe, expect, it } from "vitest";
import {
  canCreateProject, canManageMembers, canReadAuditLog,
  canTransitionProjectStatus, canUpdateProject
} from "./policies.js";

describe("organization role policies", () => {
  it("allows managers to create and update projects but not manage membership", () => {
    expect(canCreateProject("MANAGER")).toBe(true);
    expect(canUpdateProject("MANAGER")).toBe(true);
    expect(canManageMembers("MANAGER")).toBe(false);
  });

  it("restricts audit history and member administration to owners and admins", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      expect(canReadAuditLog(role)).toBe(true);
      expect(canManageMembers(role)).toBe(true);
    }
    for (const role of ["MANAGER", "MEMBER", "VIEWER"] as const) {
      expect(canReadAuditLog(role)).toBe(false);
      expect(canManageMembers(role)).toBe(false);
    }
  });

  it("keeps viewers read-only", () => {
    expect(canCreateProject("VIEWER")).toBe(false);
    expect(canUpdateProject("MEMBER")).toBe(false);
  });
});

describe("project lifecycle", () => {
  it("allows only declared forward transitions", () => {
    expect(canTransitionProjectStatus("PLANNING", "ACTIVE")).toBe(true);
    expect(canTransitionProjectStatus("ACTIVE", "ON_HOLD")).toBe(true);
    expect(canTransitionProjectStatus("ACTIVE", "COMPLETED")).toBe(true);
    expect(canTransitionProjectStatus("ON_HOLD", "ACTIVE")).toBe(true);
  });

  it("prevents reopening completed or archived projects", () => {
    expect(canTransitionProjectStatus("COMPLETED", "ACTIVE")).toBe(false);
    expect(canTransitionProjectStatus("ARCHIVED", "ACTIVE")).toBe(false);
    expect(canTransitionProjectStatus("PLANNING", "COMPLETED")).toBe(false);
  });
});
