import type { MembershipRole } from "@prisma/client";

const projectWriters: readonly MembershipRole[] = ["OWNER", "ADMIN", "MANAGER"];
const auditors: readonly MembershipRole[] = ["OWNER", "ADMIN"];

export function canCreateProject(role: MembershipRole): boolean {
  return projectWriters.includes(role);
}

export function canReadAuditLog(role: MembershipRole): boolean {
  return auditors.includes(role);
}

export function canManageMembers(role: MembershipRole): boolean {
  return auditors.includes(role);
}
