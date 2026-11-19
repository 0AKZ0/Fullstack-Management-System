import type { MembershipRole, ProjectStatus } from "@prisma/client";

const projectWriters: readonly MembershipRole[] = ["OWNER", "ADMIN", "MANAGER"];
const auditors: readonly MembershipRole[] = ["OWNER", "ADMIN"];

const projectTransitions: Record<ProjectStatus, readonly ProjectStatus[]> = {
  PLANNING: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["ON_HOLD", "COMPLETED", "ARCHIVED"],
  ON_HOLD: ["ACTIVE", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: []
};

export function canCreateProject(role: MembershipRole): boolean {
  return projectWriters.includes(role);
}

export function canUpdateProject(role: MembershipRole): boolean {
  return projectWriters.includes(role);
}

export function canTransitionProjectStatus(from: ProjectStatus, to: ProjectStatus): boolean {
  return projectTransitions[from].includes(to);
}

export function canReadAuditLog(role: MembershipRole): boolean {
  return auditors.includes(role);
}

export function canManageMembers(role: MembershipRole): boolean {
  return auditors.includes(role);
}
