import { PrismaClient, Department } from "@prisma/client";

const prisma = new PrismaClient();

const DEPT_NAMES: Record<string, string> = {
  KADRY: "Kadry",
  ADMINISTRACJA: "Administracja",
  KONTAKT: "Kontakt",
  HR: "HR",
  KSIEGOWOSC: "Księgowość",
  B2B: "B2B",
  OPLATY: "Opłaty",
  LEGALIZACJA: "Legalizacja",
  TUTLO: "Tutlo",
  INNY: "Inny",
};

async function main() {
  console.log("Starting v3 migration...");

  // 1. Create DepartmentConfig entries
  for (const [code, name] of Object.entries(DEPT_NAMES)) {
    await prisma.departmentConfig.upsert({
      where: { code: code as Department },
      update: { name },
      create: { code: code as Department, name },
    });
  }
  console.log("Created DepartmentConfig entries");

  // 2. Migrate case statuses: OCZEKUJE_NA_DEADLINE → ZGLOSZONA, NOWE → PRZYJETA
  const oczekujeCount = await prisma.case.updateMany({
    where: { status: "OCZEKUJE_NA_DEADLINE" },
    data: { status: "ZGLOSZONA" },
  });
  console.log(`Migrated ${oczekujeCount.count} cases OCZEKUJE_NA_DEADLINE → ZGLOSZONA`);

  const noweCount = await prisma.case.updateMany({
    where: { status: "NOWE" },
    data: { status: "PRZYJETA" },
  });
  console.log(`Migrated ${noweCount.count} cases NOWE → PRZYJETA`);

  // 3. For cases that have a deadline but no responseTime, estimate responseTime
  const casesWithDeadline = await prisma.case.findMany({
    where: {
      deadline: { not: null },
      responseTime: null,
    },
  });

  for (const c of casesWithDeadline) {
    if (c.deadline && c.createdAt) {
      const hours = Math.round(
        (c.deadline.getTime() - c.createdAt.getTime()) / (60 * 60 * 1000)
      );
      const responseTime = Math.min(Math.max(hours, 1), 3);
      await prisma.case.update({
        where: { id: c.id },
        data: {
          responseTime,
          acceptedAt: c.deadlineSetAt || c.createdAt,
          acceptedBy: c.deadlineSetBy || c.taker,
        },
      });
    }
  }
  console.log(`Set responseTime for ${casesWithDeadline.length} existing cases`);

  console.log("\n=== v3 Migration complete ===");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
