export type Permission = string;

export interface PermissionSubject {
  permissions: readonly Permission[];
}

export function hasPermission(
  subject: PermissionSubject,
  permission: Permission
): boolean {
  return subject.permissions.includes(permission);
}

export function hasEveryPermission(
  subject: PermissionSubject,
  permissions: readonly Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(subject, permission));
}

export function hasAnyPermission(
  subject: PermissionSubject,
  permissions: readonly Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(subject, permission));
}
