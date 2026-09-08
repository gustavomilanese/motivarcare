import { describe, expect, it } from "vitest";
import {
  DRAFT_INLINE_MEDIA_MAX_BYTES,
  buildProfessionalOnboardingDraftData,
  droppedMediaMessage,
  restoreProfessionalOnboardingDraft,
  withMediaPresenceFlags,
  type ProfessionalDraftFormShape
} from "./professionalOnboardingDraft";

function makeForm(overrides: Partial<ProfessionalDraftFormShape> = {}): ProfessionalDraftFormShape & {
  firstName: string;
  about: string;
} {
  return {
    firstName: "Ana",
    about: "Trabajo con adultos",
    profilePhotoReady: false,
    profilePhotoPreview: "",
    videoReady: false,
    videoPreview: "",
    videoFileUrl: "",
    stripeVerified: false,
    stripeDocPreview: "",
    diplomas: [
      {
        institution: "UBA",
        degree: "Psicología",
        startYear: "2010",
        graduationYear: "2015",
        diplomaUploaded: false,
        diplomaPreview: ""
      }
    ],
    password: "SuperSecreta123",
    passwordConfirm: "SuperSecreta123",
    turnstileToken: "token-de-un-solo-uso",
    ...overrides
  };
}

const smallPhoto = `data:image/jpeg;base64,${"a".repeat(1000)}`;
const hugeVideo = `data:video/mp4;base64,${"v".repeat(DRAFT_INLINE_MEDIA_MAX_BYTES * 3)}`;

describe("borrador del onboarding profesional", () => {
  describe("qué se guarda", () => {
    it("conserva los campos de texto del formulario", () => {
      const data = buildProfessionalOnboardingDraftData(makeForm());
      expect(data.firstName).toBe("Ana");
      expect(data.about).toBe("Trabajo con adultos");
    });

    it("nunca guarda la contraseña ni el token antibot", () => {
      const data = buildProfessionalOnboardingDraftData(makeForm());
      expect(data).not.toHaveProperty("password");
      expect(data).not.toHaveProperty("passwordConfirm");
      expect(data).not.toHaveProperty("turnstileToken");
      expect(JSON.stringify(data)).not.toContain("SuperSecreta123");
    });

    it("guarda la foto de perfil si el comprimido es chico", () => {
      const data = buildProfessionalOnboardingDraftData(
        makeForm({ profilePhotoPreview: smallPhoto, profilePhotoReady: true })
      );
      expect(data.profilePhotoPreview).toBe(smallPhoto);
      expect(data.profilePhotoReady).toBe(true);
    });

    it("descarta una foto que excede el tope, y no la deja marcada como cargada", () => {
      const bigPhoto = `data:image/jpeg;base64,${"a".repeat(DRAFT_INLINE_MEDIA_MAX_BYTES + 10)}`;
      const data = buildProfessionalOnboardingDraftData(
        makeForm({ profilePhotoPreview: bigPhoto, profilePhotoReady: true })
      );
      expect(data.profilePhotoPreview).toBe("");
      expect(data.profilePhotoReady).toBe(false);
    });

    it("deja fuera el video, que pesaría decenas de MB en cada autoguardado", () => {
      const data = buildProfessionalOnboardingDraftData(
        makeForm({ videoFileUrl: hugeVideo, videoPreview: hugeVideo, videoReady: true })
      );
      expect(data.videoFileUrl).toBe("");
      expect(data.videoPreview).toBe("");
      expect(data.videoReady).toBe(false);
      expect(JSON.stringify(data).length).toBeLessThan(DRAFT_INLINE_MEDIA_MAX_BYTES);
    });

    it("conserva los datos escritos del diploma pero no el archivo", () => {
      const data = buildProfessionalOnboardingDraftData(
        makeForm({
          diplomas: [
            {
              institution: "UBA",
              degree: "Psicología",
              startYear: "2010",
              graduationYear: "2015",
              diplomaUploaded: true,
              diplomaPreview: "data:application/pdf;base64,AAAA"
            }
          ]
        })
      );
      const [diploma] = data.diplomas as Array<Record<string, unknown>>;
      expect(diploma.institution).toBe("UBA");
      expect(diploma.graduationYear).toBe("2015");
      expect(diploma.diplomaPreview).toBe("");
      expect(diploma.diplomaUploaded).toBe(false);
    });
  });

  describe("qué se restaura", () => {
    it("devuelve los valores para mezclar, sin la marca interna de archivos", () => {
      const form = makeForm();
      const saved = withMediaPresenceFlags(buildProfessionalOnboardingDraftData(form), form);

      const restored = restoreProfessionalOnboardingDraft<ReturnType<typeof makeForm>>(saved);
      expect(restored.values.firstName).toBe("Ana");
      expect(restored.values).not.toHaveProperty("__media");
      expect(restored.values).not.toHaveProperty("password");
    });

    it("avisa qué archivos hay que volver a subir", () => {
      const form = makeForm({
        videoFileUrl: hugeVideo,
        stripeDocPreview: "data:application/pdf;base64,AAAA",
        diplomas: [
          {
            institution: "UBA",
            degree: "Psicología",
            startYear: "2010",
            graduationYear: "2015",
            diplomaUploaded: true,
            diplomaPreview: "data:application/pdf;base64,BBBB"
          }
        ]
      });
      const saved = withMediaPresenceFlags(buildProfessionalOnboardingDraftData(form), form);

      const restored = restoreProfessionalOnboardingDraft(saved);
      expect(restored.droppedMedia).toEqual(["video", "diploma", "taxDocument"]);
    });

    it("no pide de nuevo la foto si entró en el borrador", () => {
      const form = makeForm({ profilePhotoPreview: smallPhoto, profilePhotoReady: true });
      const saved = withMediaPresenceFlags(buildProfessionalOnboardingDraftData(form), form);

      const restored = restoreProfessionalOnboardingDraft(saved);
      expect(restored.droppedMedia).toEqual([]);
      expect(restored.values.profilePhotoPreview).toBe(smallPhoto);
    });

    it("sí pide de nuevo la foto si era demasiado grande para guardarla", () => {
      const bigPhoto = `data:image/jpeg;base64,${"a".repeat(DRAFT_INLINE_MEDIA_MAX_BYTES + 10)}`;
      const form = makeForm({ profilePhotoPreview: bigPhoto, profilePhotoReady: true });
      const saved = withMediaPresenceFlags(buildProfessionalOnboardingDraftData(form), form);

      const restored = restoreProfessionalOnboardingDraft(saved);
      expect(restored.droppedMedia).toEqual(["photo"]);
    });

    it("tolera un borrador vacío o corrupto sin romper el wizard", () => {
      expect(restoreProfessionalOnboardingDraft(null)).toEqual({ values: {}, droppedMedia: [] });
      expect(restoreProfessionalOnboardingDraft("no soy un objeto")).toEqual({ values: {}, droppedMedia: [] });
    });
  });

  describe("mensaje de archivos a resubir", () => {
    it("no dice nada si no falta ningún archivo", () => {
      expect(droppedMediaMessage([], "es")).toBe("");
    });

    it("enumera los archivos faltantes en el idioma del profesional", () => {
      expect(droppedMediaMessage(["video", "diploma"], "es")).toBe(
        "Por el peso de los archivos, necesitamos que vuelvas a subir el video, los diplomas."
      );
      expect(droppedMediaMessage(["photo"], "en")).toBe(
        "Because of file size, you need to upload your profile photo again."
      );
    });
  });
});
