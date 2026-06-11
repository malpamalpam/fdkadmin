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

  // Test cases only in development
  if (process.env.NODE_ENV !== "production") {
    const now = new Date();

    await prisma.case.create({
      data: {
        channel: "PHONE", taker: "Marta", client: "Kowalski Jan",
        topic: "Problem z umową zlecenie", dept: "KADRY", owner: "Kasia",
        deadline: new Date(now.getTime() + 2 * 60 * 60 * 1000), status: "PRZYJETA",
      },
    });

    await prisma.case.create({
      data: {
        channel: "EMAIL", taker: "Alina", client: "Nowak Anna",
        topic: "Zapytanie o dokumenty do ZUS", dept: "ADMINISTRACJA", owner: "Przemek",
        deadline: new Date(now.getTime() + 20 * 60 * 1000), status: "KONTAKT_WSTEPNY",
        firstContactAt: new Date(now.getTime() - 30 * 60 * 1000),
      },
    });

    console.log("Seed completed: 5 workers, 1 settings, 2 test cases (dev only)");
  } else {
    console.log("Seed completed: 5 workers, 1 settings (production — no test cases)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
