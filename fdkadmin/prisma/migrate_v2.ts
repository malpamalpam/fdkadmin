import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting v2 migration...");

  // 1. Create User records from Workers
  const workers = await prisma.worker.findMany();
  console.log(`Found ${workers.length} workers to migrate`);

  // Default password for all migrated users (admin should change these)
  const defaultPassword = await bcrypt.hash("zmien_haslo_123", 12);

  // Admin users
  const adminUsers = [
    { login: "marta", fullName: "Marta Niewiarowska", role: "ADMIN" as const, gender: "K" as const, dept: "ADMINISTRACJA" as const },
    { login: "grzegorz", fullName: "Grzegorz Stępień", role: "ADMIN" as const, gender: "M" as const, dept: "ADMINISTRACJA" as const },
  ];

  // Supervisor users
  const supervisorUsers = [
    { login: "alina", fullName: "Alina", role: "SUPERVISOR" as const, gender: "K" as const },
    { login: "przemek", fullName: "Przemek", role: "SUPERVISOR" as const, gender: "M" as const },
  ];

  // Create admin users
  for (const admin of adminUsers) {
    await prisma.user.upsert({
      where: { login: admin.login },
      update: { role: admin.role, fullName: admin.fullName, gender: admin.gender },
      create: {
        login: admin.login,
        passwordHash: defaultPassword,
        fullName: admin.fullName,
        role: admin.role,
        gender: admin.gender,
        dept: admin.dept,
      },
    });
    console.log(`Created/updated admin: ${admin.fullName}`);
  }

  // Create supervisor users
  for (const sup of supervisorUsers) {
    await prisma.user.upsert({
      where: { login: sup.login },
      update: { role: sup.role, fullName: sup.fullName, gender: sup.gender },
      create: {
        login: sup.login,
        passwordHash: defaultPassword,
        fullName: sup.fullName,
        role: sup.role,
        gender: sup.gender,
      },
    });
    console.log(`Created/updated supervisor: ${sup.fullName}`);
  }

  // Create User records for remaining workers not already handled
  const handledLogins = [...adminUsers, ...supervisorUsers].map(u => u.login);
  for (const worker of workers) {
    const login = worker.name.toLowerCase().replace(/\s+/g, ".");
    if (handledLogins.includes(login)) continue;

    await prisma.user.upsert({
      where: { login },
      update: {},
      create: {
        login,
        passwordHash: defaultPassword,
        fullName: worker.name,
        role: "EMPLOYEE",
        gender: "K", // Default, admin can change
        active: worker.active,
      },
    });
    console.log(`Created employee from worker: ${worker.name} -> login: ${login}`);
  }

  // 2. Link existing cases to users where possible
  const users = await prisma.user.findMany();
  const userByName: Record<string, string> = {};
  for (const u of users) {
    userByName[u.fullName.toLowerCase()] = u.id;
    // Also match by first name for existing cases
    const firstName = u.fullName.split(" ")[0].toLowerCase();
    if (!userByName[firstName]) {
      userByName[firstName] = u.id;
    }
  }

  const cases = await prisma.case.findMany();
  let linked = 0;
  for (const c of cases) {
    const updates: Record<string, string | null> = {};

    // Link taker
    const takerKey = c.taker.toLowerCase();
    if (userByName[takerKey] && !c.takerId) {
      updates.takerId = userByName[takerKey];
    }

    // Link owner
    if (c.owner) {
      const ownerKey = c.owner.toLowerCase();
      if (userByName[ownerKey] && !c.ownerId) {
        updates.ownerId = userByName[ownerKey];
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.case.update({
        where: { id: c.id },
        data: updates,
      });
      linked++;
    }
  }
  console.log(`Linked ${linked} cases to users`);

  // 3. Existing cases with deadlines: keep status as-is
  // Only new cases will use OCZEKUJE_NA_DEADLINE
  console.log("Existing cases with deadlines remain unchanged.");

  console.log("\n=== Migration complete ===");
  console.log("IMPORTANT: All migrated users have password 'zmien_haslo_123'");
  console.log("Admin should log in and change passwords for all users!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
