import { describe, expect, it } from "vitest";
import { canCreateProject, canManageMembers, canReadAuditLog } from "./policies.js";

describe("organization role policies", () => {
  it("allows managers to create projects but not manage organization membership", () => {
    expect(canCreateProject("MANAGER")).toBe(true);
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
  });
});
