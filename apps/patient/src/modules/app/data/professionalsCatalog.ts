import type { Professional, TimeSlot } from "../types";

function buildSlot(professionalId: string, dayOffset: number, hour: number, minute: number): TimeSlot {
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(hour, minute, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 50);

  return {
    id: `${professionalId}-${dayOffset}-${hour}-${minute}`,
    startsAt: start.toISOString(),
    endsAt: end.toISOString()
  };
}

function buildProfessionals(): Professional[] {
  return [
    {
      id: "pro-1",
      fullName: "Dr. Emma Collins",
      title: "Clinical Psychologist",
      yearsExperience: 11,
      compatibility: 92,
      specialties: ["Anxiety", "Stress", "Work burnout"],
      languages: ["English", "Spanish"],
      approach: "CBT + mindfulness protocols",
      bio: "Focus on anxiety regulation, cognitive reframing, and practical routines for sustained recovery.",
      rating: 4.9,
      reviewsCount: 128,
      verified: true,
      sessionPriceUsd: 58,
      activePatients: 46,
      introVideoUrl: "https://example.com/video/emma",
      slots: [
        buildSlot("pro-1", 1, 9, 0),
        buildSlot("pro-1", 1, 11, 0),
        buildSlot("pro-1", 2, 16, 30),
        buildSlot("pro-1", 3, 10, 0),
        buildSlot("pro-1", 4, 18, 0),
        buildSlot("pro-1", 5, 12, 30)
      ]
    },
    {
      id: "pro-2",
      fullName: "Dr. Michael Rivera",
      title: "Psychotherapist",
      yearsExperience: 14,
      compatibility: 88,
      specialties: ["Relationships", "Trauma", "Emotional regulation"],
      languages: ["English", "Spanish"],
      approach: "Integrative psychodynamic",
      bio: "Trabajo terapeutico de mediano y largo plazo con foco en vinculos y regulacion emocional.",
      rating: 4.8,
      reviewsCount: 97,
      verified: true,
      sessionPriceUsd: 52,
      activePatients: 39,
      introVideoUrl: "https://example.com/video/michael",
      slots: [
        buildSlot("pro-2", 1, 14, 0),
        buildSlot("pro-2", 2, 9, 30),
        buildSlot("pro-2", 3, 15, 30),
        buildSlot("pro-2", 4, 11, 0),
        buildSlot("pro-2", 6, 10, 30)
      ]
    },
    {
      id: "pro-3",
      fullName: "Dr. Sophia Nguyen",
      title: "Counseling Psychologist",
      yearsExperience: 9,
      compatibility: 85,
      specialties: ["Depression", "Life transitions", "Self esteem"],
      languages: ["English"],
      approach: "Evidence based integrative",
      bio: "Tratamiento breve con objetivos claros, seguimiento y avances medibles.",
      rating: 4.7,
      reviewsCount: 64,
      verified: true,
      sessionPriceUsd: 47,
      activePatients: 31,
      introVideoUrl: "https://example.com/video/sophia",
      slots: [
        buildSlot("pro-3", 1, 13, 30),
        buildSlot("pro-3", 2, 17, 0),
        buildSlot("pro-3", 3, 8, 30),
        buildSlot("pro-3", 5, 9, 0),
        buildSlot("pro-3", 6, 16, 0)
      ]
    },
    {
      id: "pro-4",
      fullName: "Dr. Olivia Carter",
      title: "Trauma Specialist",
      yearsExperience: 12,
      compatibility: 83,
      specialties: ["Trauma recovery", "Anxiety", "Emotional resilience"],
      languages: ["English"],
      approach: "Trauma-informed CBT",
      bio: "Acompana procesos de regulacion del sistema nervioso y reconstruccion de seguridad emocional.",
      rating: 4.8,
      reviewsCount: 103,
      verified: true,
      sessionPriceUsd: 61,
      activePatients: 34,
      introVideoUrl: "https://example.com/video/olivia",
      slots: [
        buildSlot("pro-4", 1, 8, 30),
        buildSlot("pro-4", 2, 12, 0),
        buildSlot("pro-4", 3, 18, 0),
        buildSlot("pro-4", 4, 9, 30),
        buildSlot("pro-4", 5, 15, 0),
        buildSlot("pro-4", 6, 11, 30)
      ]
    }
  ];
}

export const professionalsCatalog = buildProfessionals();

export const professionalImageMap: Record<string, string> = {
  "pro-1": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80",
  "pro-2": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
  "pro-3": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
  "pro-4": "https://images.unsplash.com/photo-1594824804732-ca8db7d6e6f8?auto=format&fit=crop&w=900&q=80"
};

export const heroImage =
  "https://images.unsplash.com/photo-1590166045671-9bb0c0a76ea4?auto=format&fit=crop&w=1600&q=80";
