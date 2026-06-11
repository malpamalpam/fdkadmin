import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting v4 migration...");

  // 1. Migrate DepartmentConfig.email → emails[]
  const depts = await prisma.departmentConfig.findMany();
  let migrated = 0;
  for (const d of depts) {
    if (d.email && (!d.emails || d.emails.length === 0)) {
      await prisma.departmentConfig.update({
        where: { id: d.id },
        data: { emails: [d.email] },
      });
      migrated++;
    }
  }
  console.log(`Migrated ${migrated} department emails to emails[]`);

  // 2. Delete seed/test cases (from v1 seed: 3 test cases)
  // Only delete if they look like seed data
  const seedClients = ["Kowalski Jan", "Nowak Anna", "Wiśniewski Piotr"];
  const seedCases = await prisma.case.findMany({
    where: { client: { in: seedClients } },
  });

  if (seedCases.length > 0) {
    for (const c of seedCases) {
      await prisma.caseHistory.deleteMany({ where: { caseId: c.id } });
      await prisma.case.delete({ where: { id: c.id } });
    }
    console.log(`Deleted ${seedCases.length} seed/test cases`);
  } else {
    console.log("No seed cases found to delete");
  }

  console.log("\n=== v4 Migration complete ===");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
