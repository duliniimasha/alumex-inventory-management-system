import { Role } from '@prisma/client';

export const ROLE_SLUGS = [
  'system_admin',
  'procurement_officer',
  'production_supervisor',
  'qc_inspector',
  'warehouse_officer',
  'sales_executive',
  'export_coordinator',
  'management_viewer',
] as const;

export type RoleSlug = (typeof ROLE_SLUGS)[number];

const ROLE_SLUG_TO_ENUM: Record<RoleSlug, Role> = {
  system_admin: Role.SYSTEM_ADMIN,
  procurement_officer: Role.PROCUREMENT_OFFICER,
  production_supervisor: Role.PRODUCTION_SUPERVISOR,
  qc_inspector: Role.QC_INSPECTOR,
  warehouse_officer: Role.WAREHOUSE_OFFICER,
  sales_executive: Role.SALES_EXECUTIVE,
  export_coordinator: Role.EXPORT_COORDINATOR,
  management_viewer: Role.MANAGEMENT_VIEWER,
};

const ROLE_ENUM_TO_SLUG = new Map<Role, RoleSlug>(
  Object.entries(ROLE_SLUG_TO_ENUM).map(([slug, role]) => [
    role,
    slug as RoleSlug,
  ]),
);

export function roleSlugToEnum(role: string): Role {
  const normalized = role.trim().toLowerCase() as RoleSlug;
  const parsed = ROLE_SLUG_TO_ENUM[normalized];

  if (!parsed) {
    throw new Error(`Unsupported role value: ${role}`);
  }

  return parsed;
}

export function roleEnumToSlug(role: Role): RoleSlug {
  const slug = ROLE_ENUM_TO_SLUG.get(role);

  if (!slug) {
    throw new Error(`Unsupported role enum: ${role}`);
  }

  return slug;
}
