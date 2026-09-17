import type { AdminProfessionalOps } from "../types";

export type PendingReviewCheckItemId =
  | "identity"
  | "diplomas"
  | "photo"
  | "video";

export type PendingReviewCheckItem = {
  id: PendingReviewCheckItemId;
  ok: boolean;
  missingLabelEs: string;
  missingLabelEn: string;
  missingLabelPt: string;
};

export function buildPendingReviewChecklist(
  professional: AdminProfessionalOps
): PendingReviewCheckItem[] {
  const diplomas = professional.diplomas ?? [];
  const missingDiplomaDocs = diplomas.filter((diploma) => !diploma.documentUrl?.trim()).length;
  const diplomasOk = diplomas.length > 0 && missingDiplomaDocs === 0;

  return [
    {
      id: "identity",
      ok: Boolean(professional.stripeDocUrl?.trim()),
      missingLabelEs: "Documento de identidad / fiscal",
      missingLabelEn: "Identity / tax document",
      missingLabelPt: "Documento de identidade / fiscal"
    },
    {
      id: "diplomas",
      ok: diplomasOk,
      missingLabelEs:
        diplomas.length === 0
          ? "Diplomas (ninguno cargado)"
          : `${missingDiplomaDocs} diploma${missingDiplomaDocs === 1 ? "" : "s"} sin archivo`,
      missingLabelEn:
        diplomas.length === 0
          ? "Diplomas (none uploaded)"
          : `${missingDiplomaDocs} diploma${missingDiplomaDocs === 1 ? "" : "s"} missing file`,
      missingLabelPt:
        diplomas.length === 0
          ? "Diplomas (nenhum enviado)"
          : `${missingDiplomaDocs} diploma${missingDiplomaDocs === 1 ? "" : "s"} sem arquivo`
    },
    {
      id: "photo",
      ok: Boolean(professional.photoUrl?.trim()),
      missingLabelEs: "Foto de perfil",
      missingLabelEn: "Profile photo",
      missingLabelPt: "Foto de perfil"
    },
    {
      id: "video",
      ok: Boolean(professional.videoUrl?.trim()),
      missingLabelEs: "Video de presentación",
      missingLabelEn: "Intro video",
      missingLabelPt: "Video de apresentacao"
    }
  ];
}

export function missingDocumentRequestItems(professional: AdminProfessionalOps): string[] {
  const items: string[] = [];
  if (!professional.stripeDocUrl?.trim()) {
    items.push("Documento de identidad o fiscal (JPG, PNG o PDF)");
  }
  const diplomas = professional.diplomas ?? [];
  if (diplomas.length === 0) {
    items.push("Al menos un diploma con archivo adjunto");
  } else {
    diplomas.forEach((diploma, index) => {
      if (!diploma.documentUrl?.trim()) {
        const label = diploma.degree?.trim() || `Diploma ${index + 1}`;
        items.push(`Archivo del diploma: ${label}`);
      }
    });
  }
  return items;
}
