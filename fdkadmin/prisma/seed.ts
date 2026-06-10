import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed workers
  const workers = ["Marta", "Kasia", "Alina", "Przemek", "Grzegorz"];
  for (const name of workers) {
    await prisma.worker.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Seed default settings
  await prisma.setting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      bccEmail: "administracja@firmadlakazdego.pl",
    },
  });

  // Seed 3 test cases with different deadline states
  const now = new Date();

  // Case 1: deadline in 2 hours (green - safe)
  await prisma.case.create({
    data: {
      channel: "PHONE",
      taker: "Marta",
      client: "Kowalski Jan",
      topic: "Problem z umową zlecenie",
      dept: "KADRY",
      owner: "Kasia",
      deadline: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      status: "NOWE",
    },
  });

  // Case 2: deadline in 20 minutes (yellow - warning)
  await prisma.case.create({
    data: {
      channel: "EMAIL",
      taker: "Alina",
      client: "Nowak Anna",
      topic: "Zapytanie o dokumenty do ZUS",
      dept: "ADMINISTRACJA",
      owner: "Przemek",
      deadline: new Date(now.getTime() + 20 * 60 * 1000),
      status: "KONTAKT_WSTEPNY",
      firstContactAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
  });

  // Case 3: deadline passed 15 minutes ago (red - overdue)
  await prisma.case.create({
    data: {
      channel: "SMS",
      taker: "Grzegorz",
      client: "Wiśniewski Piotr",
      topic: "Reklamacja szkolenia",
      dept: "TUTLO",
      owner: "Marta",
      deadline: new Date(now.getTime() - 15 * 60 * 1000),
      status: "W_TOKU",
      alert30Sent: true,
      alertOverSent: true,
    },
  });

  console.log("Seed completed: 5 workers, 1 settings, 3 test cases");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
