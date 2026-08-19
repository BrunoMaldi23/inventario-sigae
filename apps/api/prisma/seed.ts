import { PrismaClient } from '@prisma/client';
import type { Permission, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_STATUSES,
} from '@inventario/config';
import type { PermissionCode } from '@inventario/types';

// Seed de desarrollo: roles + permisos + catálogos + ubicaciones demo + admin demo.

const prisma = new PrismaClient();

const ALL_PERMISSIONS: PermissionCode[] = [
  'asset.read',
  'asset.create',
  'asset.update',
  'asset.transfer',
  'asset.dispose',
  'asset.status',
  'asset.delete',
  'movement.read',
  'movement.create',
  'attachment.upload',
  'attachment.delete',
  'location.manage',
  'category.manage',
  'status.manage',
  'responsible.manage',
  'report.export',
  'inventory.import',
  'inventory.count',
  'audit.read',
  'user.manage',
  'role.manage',
];

async function seedPermissions(): Promise<Map<string, Permission>> {
  const map = new Map<string, Permission>();
  for (const code of ALL_PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
    map.set(code, p);
  }
  return map;
}

async function seedRoles(perms: Map<string, Permission>): Promise<Map<string, Role>> {
  const roles = new Map<string, Role>();
  for (const [roleName, codes] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { description: `Rol ${roleName}` },
      create: { name: roleName, description: `Rol ${roleName}` },
    });
    roles.set(roleName, role);

    const permissionIds = codes.map((c) => perms.get(c)!.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const pid of permissionIds) {
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: pid },
      });
    }
  }
  return roles;
}

async function seedStatuses() {
  let order = 0;
  for (const s of DEFAULT_STATUSES) {
    await prisma.assetStatus.upsert({
      where: { name: s.name },
      update: { color: s.color, active: true },
      create: { name: s.name, color: s.color, sortOrder: order++ },
    });
  }
}

async function seedCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    const root = await findOrCreateCategory(cat.name, null);
    for (const child of cat.children ?? []) {
      await findOrCreateCategory(child, root.id);
    }
  }
}

async function findOrCreateCategory(name: string, parentId: string | null) {
  const existing = await prisma.assetCategory.findFirst({ where: { name, parentId: parentId ?? null } });
  if (existing) {
    return prisma.assetCategory.update({ where: { id: existing.id }, data: { active: true } });
  }
  return prisma.assetCategory.create({ data: { name, parentId: parentId ?? null } });
}

async function seedLocations() {
  const school = await findOrCreateLocation('Escuela', null, 'building', 'Recinto principal');
  const floor1 = await findOrCreateLocation('Primer piso', school.id, 'floor', null);
  const floor2 = await findOrCreateLocation('Segundo piso', school.id, 'floor', null);

  const rooms: { name: string; parentId: string; type: any }[] = [
    { name: '1° A', parentId: floor1.id, type: 'classroom' },
    { name: '1° B', parentId: floor1.id, type: 'classroom' },
    { name: 'Biblioteca', parentId: floor1.id, type: 'library' },
    { name: 'Inspectoría', parentId: floor1.id, type: 'office' },
    { name: '3° B', parentId: floor2.id, type: 'classroom' },
    { name: '5° A', parentId: floor2.id, type: 'classroom' },
    { name: 'Sala PIE', parentId: floor2.id, type: 'classroom' },
    { name: 'Laboratorio de computación', parentId: floor2.id, type: 'laboratory' },
  ];

  for (const r of rooms) {
    await findOrCreateLocation(r.name, r.parentId, r.type, null);
  }

  await findOrCreateLocation('Gimnasio', school.id, 'gym', null);
  await findOrCreateLocation('Casino', school.id, 'common_area', null);
  await findOrCreateLocation('Bodega', school.id, 'warehouse', null);
}

async function findOrCreateLocation(
  name: string,
  parentId: string | null,
  type: string,
  description: string | null,
) {
  const existing = await prisma.location.findFirst({ where: { name, parentId: parentId ?? null } });
  if (existing) {
    return prisma.location.update({ where: { id: existing.id }, data: { active: true } });
  }
  return prisma.location.create({ data: { name, type: type as any, parentId: parentId ?? null, description } });
}

async function seedUsers(roles: Map<string, Role>) {
  const findRole = (name: string) => {
    const role = roles.get(name);
    if (!role) throw new Error(`Rol no encontrado en seed: ${name}`);
    return role;
  };

  const adminRole = findRole('SUPER_ADMIN');

  await prisma.user.upsert({
    where: { email: 'admin@escuela.cl' },
    update: {},
    create: {
      email: 'admin@escuela.cl',
      name: 'Administrador Principal',
      passwordHash: await argon2.hash('Admin.1234'),
      roleId: adminRole.id,
    },
  });

  const encRole = findRole('ENCARGADO_INVENTARIO');
  await prisma.user.upsert({
    where: { email: 'encargado@escuela.cl' },
    update: {},
    create: {
      email: 'encargado@escuela.cl',
      name: 'Encargado de Inventario',
      passwordHash: await argon2.hash('Encargado.1234'),
      roleId: encRole.id,
    },
  });

  const funcRole = findRole('FUNCIONARIO');
  await prisma.user.upsert({
    where: { email: 'funcionario@escuela.cl' },
    update: {},
    create: {
      email: 'funcionario@escuela.cl',
      name: 'Funcionario Terreno',
      passwordHash: await argon2.hash('Funcionario.1234'),
      roleId: funcRole.id,
    },
  });
}

async function seedResponsables() {
  const librarian = await prisma.location.findFirst({ where: { name: 'Biblioteca' } });
  const p5a = await prisma.location.findFirst({ where: { name: '5° A' } });
  const lab = await prisma.location.findFirst({ where: { name: 'Laboratorio de computación' } });

  const list = [
    { name: 'Profesor jefe 5° A', locationId: p5a?.id ?? null },
    { name: 'Encargado TIC', locationId: lab?.id ?? null },
    { name: 'Bibliotecaria', locationId: librarian?.id ?? null },
  ];
  for (const r of list) {
    const existing = await prisma.responsible.findFirst({ where: { name: r.name } });
    if (!existing) {
      await prisma.responsible.create({ data: r });
    }
  }
}

async function seedDemoAssets() {
  const count = await prisma.asset.count();
  if (count > 0) return;

  const buenEstado = await prisma.assetStatus.findUnique({ where: { name: 'Bueno' } });
  const mob = await prisma.assetCategory.findFirst({ where: { name: 'Mobiliario', parentId: null } });
  const silla = await prisma.assetCategory.findFirst({ where: { name: 'Silla' } });
  const sala3B = await prisma.location.findFirst({ where: { name: '3° B' } });
  const admin = await prisma.user.findUnique({ where: { email: 'admin@escuela.cl' } });
  const enc = await prisma.user.findUnique({ where: { email: 'encargado@escuela.cl' } });

  const createdAt = new Date('2026-08-01T12:00:00Z');
  const asset = await prisma.asset.create({
    data: {
      assetCode: 'INV-000001',
      name: 'Silla escolar',
      description: 'Silla azul de plástico',
      brand: 'MarcaDemo',
      model: 'S-2020',
      serialNumber: 'SN-SILLA-001',
      qrCode: 'INV-000001',
      statusId: buenEstado!.id,
      categoryId: (silla ?? mob)!.id,
      locationId: sala3B!.id,
      createdById: admin!.id,
      updatedById: enc!.id,
      createdAt,
      updatedAt: createdAt,
    },
  });
  await prisma.asset.update({
    where: { id: asset.id },
    data: { qrCode: `inventario://asset/${asset.id}` },
  });

  const biblio = await prisma.location.findFirst({ where: { name: 'Biblioteca' } });
  await prisma.assetMovement.create({
    data: {
      assetId: asset.id,
      type: 'TRANSFER',
      fromLocationId: biblio!.id,
      toLocationId: sala3B!.id,
      reason: 'Reubicación',
      notes: 'Movido desde Biblioteca como ejemplo',
      performedById: enc!.id,
      createdAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin!.id,
      action: 'ASSET_CREATE',
      entityType: 'Asset',
      entityId: asset.id,
      newValues: { assetCode: 'INV-000001', name: 'Silla escolar' },
    },
  });
}

async function main() {
  console.log('Seed iniciado...');
  const permissions = await seedPermissions();
  console.log(`Permisos: ${permissions.size}`);
  const roles = await seedRoles(permissions);
  console.log(`Roles: ${roles.size}`);
  await seedStatuses();
  console.log('Estados listos');
  await seedCategories();
  console.log('Categorías listas');
  await seedLocations();
  console.log('Ubicaciones listas');
  await seedUsers(roles);
  console.log('Usuarios demo listos');
  await seedResponsables();
  console.log('Responsables listos');
  await seedDemoAssets();
  console.log('Bienes demo listos');
  console.log('Seed completado ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());