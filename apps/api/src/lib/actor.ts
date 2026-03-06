import { prisma } from "./prisma.js";
import type { AuthContext } from "./auth.js";

export interface ActorContext {
  userId: string;
  role: "PATIENT" | "PROFESSIONAL" | "ADMIN";
  email: string;
  fullName: string;
  patientProfileId: string | null;
  professionalProfileId: string | null;
}

export async function getActorContext(auth: AuthContext): Promise<ActorContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: {
      patient: { select: { id: true } },
      professional: { select: { id: true } }
    }
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    patientProfileId: user.patient?.id ?? null,
    professionalProfileId: user.professional?.id ?? null
  };
}
