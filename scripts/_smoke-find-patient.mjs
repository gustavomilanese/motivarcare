import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config();

const prisma = new PrismaClient();
const p = await prisma.patientProfile.findFirst({
  where: { intake: null },
  include: { user: { select: { id: true, email: true, role: true, fullName: true } } }
});
if (!p) {
  const all = await prisma.patientProfile.findMany({
    take: 3,
    include: { user: { select: { email: true } }, intake: { select: { id: true } } }
  });
  console.log("No patient sin intake. Patients existentes:", JSON.stringify(all, null, 2));
} else {
  console.log(JSON.stringify({ patientProfileId: p.id, userId: p.user.id, email: p.user.email, role: p.user.role, fullName: p.user.fullName }, null, 2));
}
await prisma.$disconnect();
