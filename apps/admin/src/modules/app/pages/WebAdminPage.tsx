import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { CollapsiblePageSection } from "../components/CollapsiblePageSection";
import { LandingSitePackagesSection } from "../components/LandingSitePackagesSection";
import {
  WEB_ADMIN_SCROLL_SECTION_IDS,
  WebAdminPageSubnav,
  type WebAdminScrollSectionId
} from "../components/WebAdminPageSubnav";
import { useStickySectionNavigation } from "../hooks/useStickySectionNavigation";
import { adminSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
import { apiRequest } from "../services/api";
import type {
  AdminBlogPost,
  AdminExercise,
  AdminExerciseCategory,
  AdminExerciseDifficulty,
  AdminRelaxationPlaylist,
  AdminReview,
  WebContentResponse,
  WebLandingSettings
} from "../types";
import { compressImageDataUrl, fileToDataUrl, normalizeWebLandingSettings } from "../utils/media";

const EXERCISE_CATEGORY_OPTIONS: Array<{ value: AdminExerciseCategory; label: string }> = [
  { value: "respiracion", label: "Respiración" },
  { value: "postura", label: "Postura" },
  { value: "grounding", label: "Anclaje (grounding)" },
  { value: "movimiento", label: "Movimiento" },
  { value: "relajacion", label: "Relajación" },
  { value: "mindfulness", label: "Mindfulness" }
];

const EXERCISE_DIFFICULTY_OPTIONS: Array<{ value: AdminExerciseDifficulty; label: string }> = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" }
];

function exerciseLinesToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function listToExerciseLines(items: string[]): string {
  return Array.isArray(items) ? items.join("\n") : "";
}

function csvToList(text: string): string[] {
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function formatRelativeDateFromReviewDate(reviewDate: string): string {
  if (!reviewDate) {
    return "hace 0 dias";
  }
  const from = new Date(`${reviewDate}T00:00:00`);
  if (Number.isNaN(from.getTime())) {
    return "hace 0 dias";
  }
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - from.getTime());
  const days = Math.floor(diffMs / 86400000);
  return `hace ${days} dias`;
}

function inferReviewDate(relativeDate: string): string {
  const match = relativeDate.match(/(\d+)/);
  const days = match ? Number(match[1]) : 0;
  const date = new Date();
  date.setDate(date.getDate() - (Number.isFinite(days) ? days : 0));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function WebAdminPage({
  token,
  language,
  embedded = false
}: {
  token: string;
  language: AppLanguage;
  embedded?: boolean;
}) {
  const emptySettings: WebLandingSettings = {
    patientHeroImageUrl: null,
    patientDesktopImageUrl: null,
    patientMobileImageUrl: null,
    professionalDesktopImageUrl: null,
    professionalMobileImageUrl: null
  };
  const emptyReview: Omit<AdminReview, "id"> = {
    name: "",
    role: "Paciente",
    reviewDate: new Date().toISOString().slice(0, 10),
    relativeDate: "hace 0 dias",
    text: "",
    rating: 5,
    avatar: "",
    accent: "#7a5cff"
  };
  const emptyPost: Omit<AdminBlogPost, "id"> = {
    title: "",
    subtitle: "",
    slug: "",
    excerpt: "",
    category: "Ansiedad",
    coverImage: "",
    authorName: "Equipo MotivarCare",
    authorRole: "Psicologa clinica",
    authorAvatar: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    readTime: 6,
    likes: 30,
    tags: ["salud mental"],
    status: "published",
    featured: false,
    seoTitle: "",
    seoDescription: "",
    body: "",
    showOnPatientPortal: true,
    showOnLanding: true
  };
  const emptyExercise: Omit<AdminExercise, "id"> = {
    slug: "",
    title: "",
    summary: "",
    description: "",
    category: "respiracion",
    durationMinutes: 5,
    difficulty: "principiante",
    emoji: "🌬️",
    steps: [],
    tips: [],
    benefits: [],
    contraindications: "",
    tags: [],
    status: "published",
    featured: false,
    publishedAt: new Date().toISOString().slice(0, 10),
    sortOrder: 100
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [settings, setSettings] = useState<WebLandingSettings>(emptySettings);
  const [savedSettings, setSavedSettings] = useState<WebLandingSettings>(emptySettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [exercises, setExercises] = useState<AdminExercise[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<Omit<AdminReview, "id">>(emptyReview);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postForm, setPostForm] = useState<Omit<AdminBlogPost, "id">>(emptyPost);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseForm, setExerciseForm] = useState<Omit<AdminExercise, "id">>(emptyExercise);
  const [reviewSearch, setReviewSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [relaxationJson, setRelaxationJson] = useState("[]");
  const [relaxationSaving, setRelaxationSaving] = useState(false);
  const [relaxationFeedback, setRelaxationFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const { activeSection: activeWebSection, scrollToSection: scrollToWebSection } = useStickySectionNavigation(
    WEB_ADMIN_SCROLL_SECTION_IDS,
    { loading: loading || embedded }
  );

  async function loadWebContent() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<WebContentResponse>("/api/admin/web-content", {}, token);
      const normalizedLoadedSettings = normalizeWebLandingSettings(data.settings ?? emptySettings);
      setSettings(normalizedLoadedSettings);
      setSavedSettings(normalizedLoadedSettings);
      setReviews(
        Array.isArray(data.reviews)
          ? data.reviews
              .filter((item): item is AdminReview => Boolean(item && typeof item === "object"))
              .map((item) => ({
                ...item,
                id: String(item.id ?? ""),
                name: String(item.name ?? "Sin nombre"),
                role: String(item.role ?? "Paciente"),
                relativeDate: String(item.relativeDate ?? "hace 0 dias"),
                text: String(item.text ?? ""),
                rating: Number(item.rating ?? 5),
                avatar: String(item.avatar ?? ""),
                accent: String(item.accent ?? "#7a5cff")
              }))
              .filter((item) => item.id.length > 0)
          : []
      );
      setPosts(
        Array.isArray(data.blogPosts)
          ? data.blogPosts
              .filter((item): item is AdminBlogPost => Boolean(item && typeof item === "object"))
              .map((item) => ({
                ...item,
                id: String(item.id ?? ""),
                title: String(item.title ?? "Sin titulo"),
                slug: String(item.slug ?? ""),
                excerpt: String(item.excerpt ?? ""),
                category: String(item.category ?? "General"),
                coverImage: String(item.coverImage ?? ""),
                authorName: String(item.authorName ?? "Equipo MotivarCare"),
                authorRole: String(item.authorRole ?? "Psicologa clinica"),
                authorAvatar: String(item.authorAvatar ?? ""),
                publishedAt: String(item.publishedAt ?? new Date().toISOString().slice(0, 10)),
                readTime: Number(item.readTime ?? 1),
                likes: Number(item.likes ?? 0),
                tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
                status: (item.status === "draft" ? "draft" : "published") as "draft" | "published",
                featured: Boolean(item.featured),
                seoTitle: String(item.seoTitle ?? ""),
                seoDescription: String(item.seoDescription ?? ""),
                body: String(item.body ?? ""),
                showOnPatientPortal: item.showOnPatientPortal !== false,
                showOnLanding: item.showOnLanding !== false
              }))
              .filter((item) => item.id.length > 0)
          : []
      );
      setExercises(
        Array.isArray(data.exercises)
          ? data.exercises
              .filter((item): item is AdminExercise => Boolean(item && typeof item === "object"))
              .map((item) => ({
                ...item,
                id: String(item.id ?? ""),
                slug: String(item.slug ?? ""),
                title: String(item.title ?? "Sin título"),
                summary: String(item.summary ?? ""),
                description: String(item.description ?? ""),
                category: ((["respiracion", "postura", "grounding", "movimiento", "relajacion", "mindfulness"] as const)
                  .includes(item.category as AdminExerciseCategory)
                  ? item.category
                  : "respiracion") as AdminExerciseCategory,
                durationMinutes: Number(item.durationMinutes ?? 5),
                difficulty: ((["principiante", "intermedio", "avanzado"] as const)
                  .includes(item.difficulty as AdminExerciseDifficulty)
                  ? item.difficulty
                  : "principiante") as AdminExerciseDifficulty,
                emoji: String(item.emoji ?? "🌟"),
                steps: Array.isArray(item.steps) ? item.steps.map((step) => String(step)) : [],
                tips: Array.isArray(item.tips) ? item.tips.map((tip) => String(tip)) : [],
                benefits: Array.isArray(item.benefits) ? item.benefits.map((b) => String(b)) : [],
                contraindications: String(item.contraindications ?? ""),
                tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
                status: (item.status === "draft" ? "draft" : "published") as "draft" | "published",
                featured: Boolean(item.featured),
                publishedAt: String(item.publishedAt ?? new Date().toISOString().slice(0, 10)),
                sortOrder: Number(item.sortOrder ?? 100)
              }))
              .filter((item) => item.id.length > 0)
          : []
      );
      const normalizeRelaxation = (raw: unknown): AdminRelaxationPlaylist[] => {
        if (!Array.isArray(raw)) {
          return [];
        }
        return raw
          .filter((item): item is AdminRelaxationPlaylist => Boolean(item && typeof item === "object"))
          .map((item) => ({
            id: String(item.id ?? ""),
            title: {
              es: String((item.title as { es?: string })?.es ?? ""),
              en: String((item.title as { en?: string })?.en ?? ""),
              pt: String((item.title as { pt?: string })?.pt ?? "")
            },
            blurb: {
              es: String((item.blurb as { es?: string })?.es ?? ""),
              en: String((item.blurb as { en?: string })?.en ?? ""),
              pt: String((item.blurb as { pt?: string })?.pt ?? "")
            },
            embedType: (item.embedType === "youtube" ? "youtube" : "spotify") as AdminRelaxationPlaylist["embedType"],
            embedSrc: String(item.embedSrc ?? ""),
            openUrl: String(item.openUrl ?? "")
          }))
          .filter((item) => item.id.length > 0 && item.embedSrc.length > 0);
      };
      const storedRelax = normalizeRelaxation(data.relaxationPlaylists);
      const bundledRelax = normalizeRelaxation(data.relaxationPlaylistsBundledDefaults);
      const editorRelax = storedRelax.length > 0 ? storedRelax : bundledRelax;
      setRelaxationJson(JSON.stringify(editorRelax.length > 0 ? editorRelax : [], null, 2));
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-load", language, raw));
    } finally {
      setLoading(false);
    }
  }

  async function saveRelaxationPlaylistsFromEditor() {
    setRelaxationFeedback(null);
    setError("");
    setRelaxationSaving(true);
    let parsed: unknown;
    try {
      parsed = JSON.parse(relaxationJson);
    } catch {
      setRelaxationFeedback({
        type: "error",
        message: t(language, { es: "El JSON no es válido.", en: "JSON is not valid.", pt: "O JSON não é válido." })
      });
      setRelaxationSaving(false);
      return;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      setRelaxationFeedback({
        type: "error",
        message: t(language, {
          es: "El editor debe contener un arreglo JSON con al menos una playlist.",
          en: "The editor must contain a JSON array with at least one playlist.",
          pt: "O editor deve conter um array JSON com pelo menos uma playlist."
        })
      });
      setRelaxationSaving(false);
      return;
    }
    try {
      await apiRequest(
        "/api/admin/web-content/relaxation-playlists",
        { method: "PUT", body: JSON.stringify({ playlists: parsed }) },
        token
      );
      setRelaxationFeedback({
        type: "ok",
        message: t(language, {
          es: "Listas de música guardadas.",
          en: "Relaxation playlists saved.",
          pt: "Playlists de relaxamento salvas."
        })
      });
      await loadWebContent();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setRelaxationFeedback({
        type: "error",
        message: adminSurfaceMessage("web-admin-save", language, raw)
      });
    } finally {
      setRelaxationSaving(false);
    }
  }

  async function deleteRelaxationPlaylistsConfig() {
    setRelaxationFeedback(null);
    setError("");
    setRelaxationSaving(true);
    try {
      await apiRequest("/api/admin/web-content/relaxation-playlists", { method: "DELETE" }, token);
      setRelaxationFeedback({
        type: "ok",
        message: t(language, {
          es: "Se quitó la configuración guardada; el portal vuelve a la plantilla del servidor.",
          en: "Saved config removed; the portal uses the server default template again.",
          pt: "Configuração salva removida; o portal volta ao modelo do servidor."
        })
      });
      await loadWebContent();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setRelaxationFeedback({
        type: "error",
        message: adminSurfaceMessage("web-admin-save", language, raw)
      });
    } finally {
      setRelaxationSaving(false);
    }
  }

  useEffect(() => {
    void loadWebContent();
  }, [token]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setIsReviewModalOpen(false);
      setIsPostModalOpen(false);
      setIsExerciseModalOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function saveSettings() {
    setError("");
    setSuccess("");
    setSettingsFeedback(null);
    setSavingSettings(true);

    const normalizedSettings = normalizeWebLandingSettings(settings);
    try {
      await apiRequest(
        "/api/admin/landing-settings",
        {
          method: "PUT",
          body: JSON.stringify(normalizedSettings)
        },
        token
      );
      setSettings(normalizedSettings);
      setSavedSettings(normalizedSettings);
      setSuccess(t(language, { es: "Configuracion de imagenes guardada.", en: "Image settings saved.", pt: "Configuracao de imagens salva." }));
      setSettingsFeedback({
        type: "ok",
        message: t(language, {
          es: "Imagenes publicadas correctamente.",
          en: "Images published successfully.",
          pt: "Imagens publicadas com sucesso."
        })
      });
    } catch (requestError) {
      const rawMessage = requestError instanceof Error ? requestError.message : "";
      const message = rawMessage.includes("HTTP 413")
        ? t(language, {
            es: "La imagen es demasiado pesada. Probá con una más liviana o comprimila antes de subirla.",
            en: "That image is too heavy. Try a smaller file or compress it before uploading.",
            pt: "A imagem esta pesada demais. Tente um arquivo menor ou comprima antes."
          })
        : adminSurfaceMessage("web-admin-save", language, rawMessage);
      setError(message);
      setSettingsFeedback({ type: "error", message });
    } finally {
      setSavingSettings(false);
    }
  }

  async function setImageFromFile(
    event: ChangeEvent<HTMLInputElement>,
    key: keyof WebLandingSettings
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const originalDataUrl = await fileToDataUrl(file);
      const dataUrl = await compressImageDataUrl(originalDataUrl);
      setSettings((current) => ({
        ...current,
        [key]: dataUrl,
        ...(key === "patientDesktopImageUrl" ? { patientHeroImageUrl: dataUrl } : {})
      }));
      setSuccess(t(language, { es: "Imagen cargada. Guarda para aplicar cambios.", en: "Image loaded. Save to apply changes.", pt: "Imagem carregada. Salve para aplicar as mudancas." }));
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-image-load", language, raw));
    } finally {
      event.target.value = "";
    }
  }

  async function setReviewAvatarFromFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const originalDataUrl = await fileToDataUrl(file);
      const dataUrl = await compressImageDataUrl(originalDataUrl, 420, 0.86);
      setReviewForm((current) => ({ ...current, avatar: dataUrl }));
      setSuccess("Foto de review cargada.");
      setError("");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-image-load", language, raw));
    } finally {
      event.target.value = "";
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (reviewForm.name.trim().length < 2) {
      setError(
        t(language, {
          es: "Agregá un nombre un poco más largo para la review (al menos 2 caracteres).",
          en: "Add a slightly longer name for the review (at least 2 characters).",
          pt: "Adicione um nome um pouco maior para a review (pelo menos 2 caracteres)."
        })
      );
      return;
    }
    if ((reviewForm.reviewDate ?? "").trim().length === 0) {
      setError(
        t(language, {
          es: "Elegí la fecha en que corresponde mostrar la review.",
          en: "Pick the date this review should reflect.",
          pt: "Escolha a data em que a review deve aparecer."
        })
      );
      return;
    }
    if (!reviewForm.avatar || reviewForm.avatar.trim().length === 0) {
      setError(
        t(language, {
          es: "Subí una foto de perfil para la review; ayuda a que se vea humana y confiable.",
          en: "Upload a profile photo for the review so it feels trustworthy.",
          pt: "Envie uma foto de perfil para a review."
        })
      );
      return;
    }
    if (reviewForm.text.trim().length < 5) {
      setError(
        t(language, {
          es: "El texto de la review es muy corto; sumá una frase más para que tenga contexto.",
          en: "The review text is too short—add a bit more context.",
          pt: "O texto da review e curto demais; acrescente mais uma frase."
        })
      );
      return;
    }

    try {
      const payload = {
        ...reviewForm,
        reviewDate: reviewForm.reviewDate,
        relativeDate: formatRelativeDateFromReviewDate(reviewForm.reviewDate ?? inferReviewDate(reviewForm.relativeDate))
      };

      if (editingReviewId) {
        await apiRequest(
          `/api/admin/web-content/reviews/${editingReviewId}`,
          { method: "PUT", body: JSON.stringify(payload) },
          token
        );
      } else {
        await apiRequest("/api/admin/web-content/reviews", { method: "POST", body: JSON.stringify(payload) }, token);
      }
      setReviewForm(emptyReview);
      setEditingReviewId(null);
      setIsReviewModalOpen(false);
      setSuccess(t(language, { es: "Review guardada.", en: "Review saved.", pt: "Review salva." }));
      await loadWebContent();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-review-save", language, raw));
    }
  }

  async function removeReview(reviewId: string) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/web-content/reviews/${reviewId}`, { method: "DELETE" }, token);
      setSuccess(t(language, { es: "Review eliminada.", en: "Review deleted.", pt: "Review removida." }));
      await loadWebContent();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-review-delete", language, raw));
    }
  }

  async function setPostImageFromFile(
    event: ChangeEvent<HTMLInputElement>,
    key: "coverImage" | "authorAvatar"
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const originalDataUrl = await fileToDataUrl(file);
      const dataUrl = await compressImageDataUrl(originalDataUrl, 1600, 0.84);
      setPostForm((current) => ({ ...current, [key]: dataUrl }));
      setSuccess(key === "coverImage" ? "Portada cargada." : "Avatar de autor cargado.");
      setError("");
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-blog-image-load", language, raw));
    } finally {
      event.target.value = "";
    }
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const payload = { ...postForm, tags: postForm.tags.filter((tag) => tag.trim().length > 0) };
    try {
      if (editingPostId) {
        await apiRequest(`/api/admin/web-content/blog-posts/${editingPostId}`, { method: "PUT", body: JSON.stringify(payload) }, token);
      } else {
        await apiRequest("/api/admin/web-content/blog-posts", { method: "POST", body: JSON.stringify(payload) }, token);
      }
      setPostForm(emptyPost);
      setEditingPostId(null);
      setIsPostModalOpen(false);
      setSuccess(t(language, { es: "Articulo guardado.", en: "Article saved.", pt: "Artigo salvo." }));
      await loadWebContent();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-blog-save", language, raw));
    }
  }

  async function removePost(postId: string) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/web-content/blog-posts/${postId}`, { method: "DELETE" }, token);
      setSuccess(t(language, { es: "Articulo eliminado.", en: "Article deleted.", pt: "Artigo removido." }));
      await loadWebContent();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-blog-delete", language, raw));
    }
  }

  async function togglePostAudience(post: AdminBlogPost, audience: "patient" | "landing") {
    setError("");
    setSuccess("");
    const field = audience === "patient" ? "showOnPatientPortal" : "showOnLanding";
    const nextValue = !post[field];
    try {
      await apiRequest(
        `/api/admin/web-content/blog-posts/${post.id}`,
        { method: "PUT", body: JSON.stringify({ [field]: nextValue }) },
        token
      );
      setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, [field]: nextValue } : item)));
      setSuccess(
        nextValue
          ? t(language, {
              es: audience === "patient" ? "Nota visible para pacientes." : "Nota visible en la landing.",
              en: audience === "patient" ? "Article visible to patients." : "Article visible on the landing.",
              pt: audience === "patient" ? "Nota visível para pacientes." : "Nota visível na landing."
            })
          : t(language, {
              es: audience === "patient" ? "Nota oculta para pacientes." : "Nota oculta en la landing.",
              en: audience === "patient" ? "Article hidden from patients." : "Article hidden from the landing.",
              pt: audience === "patient" ? "Nota oculta para pacientes." : "Nota oculta na landing."
            })
      );
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-blog-save", language, raw));
    }
  }

  async function seedDefaultBlogPosts() {
    setError("");
    setSuccess("");
    const confirmed = window.confirm(
      t(language, {
        es: "Vas a importar las 18 notas iniciales del catálogo MotivarCare. Después podés editarlas o borrarlas como cualquier otra. ¿Continuar?",
        en: "You will import the 18 initial articles from the MotivarCare catalog. You can edit or delete them afterwards. Continue?",
        pt: "Vai importar as 18 notas iniciais do catálogo MotivarCare. Depois pode editá-las ou removê-las normalmente. Continuar?"
      })
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await apiRequest<{ imported: number }>(
        "/api/admin/web-content/blog-posts/seed-defaults",
        { method: "POST", body: JSON.stringify({}) },
        token
      );
      setSuccess(
        t(language, {
          es: `Catálogo inicial cargado: ${response.imported} notas.`,
          en: `Initial catalog imported: ${response.imported} articles.`,
          pt: `Catálogo inicial carregado: ${response.imported} notas.`
        })
      );
      await loadWebContent();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-blog-save", language, raw));
    }
  }

  async function saveExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (exerciseForm.title.trim().length < 3) {
      setError(
        t(language, {
          es: "El título del ejercicio es muy corto (mínimo 3 caracteres).",
          en: "The exercise title is too short (minimum 3 characters).",
          pt: "O título do exercício é muito curto (mínimo 3 caracteres)."
        })
      );
      return;
    }
    if (exerciseForm.slug.trim().length < 2) {
      setError(
        t(language, {
          es: "El slug es muy corto. Usá un identificador como 'respiracion-4-7-8'.",
          en: "Slug too short. Use an identifier like 'breathing-4-7-8'.",
          pt: "Slug muito curto. Use um identificador como 'respiracao-4-7-8'."
        })
      );
      return;
    }
    if (exerciseForm.summary.trim().length < 10) {
      setError(
        t(language, {
          es: "Agregá un resumen un poco más descriptivo (mínimo 10 caracteres).",
          en: "Add a slightly longer summary (at least 10 characters).",
          pt: "Acrescente um resumo um pouco mais descritivo (mínimo 10 caracteres)."
        })
      );
      return;
    }
    if (exerciseForm.description.trim().length < 20) {
      setError(
        t(language, {
          es: "La descripción es muy corta (mínimo 20 caracteres).",
          en: "Description is too short (at least 20 characters).",
          pt: "A descrição é muito curta (mínimo 20 caracteres)."
        })
      );
      return;
    }
    if (exerciseForm.steps.length === 0) {
      setError(
        t(language, {
          es: "Agregá al menos un paso al ejercicio.",
          en: "Add at least one step to the exercise.",
          pt: "Adicione pelo menos um passo ao exercício."
        })
      );
      return;
    }

    const payload = {
      ...exerciseForm,
      tags: exerciseForm.tags.filter((tag) => tag.trim().length > 0),
      steps: exerciseForm.steps.filter((step) => step.trim().length > 0),
      tips: exerciseForm.tips.filter((tip) => tip.trim().length > 0),
      benefits: exerciseForm.benefits.filter((benefit) => benefit.trim().length > 0)
    };

    try {
      if (editingExerciseId) {
        await apiRequest(
          `/api/admin/web-content/exercises/${editingExerciseId}`,
          { method: "PUT", body: JSON.stringify(payload) },
          token
        );
      } else {
        await apiRequest("/api/admin/web-content/exercises", { method: "POST", body: JSON.stringify(payload) }, token);
      }
      setExerciseForm(emptyExercise);
      setEditingExerciseId(null);
      setIsExerciseModalOpen(false);
      setSuccess(t(language, { es: "Ejercicio guardado.", en: "Exercise saved.", pt: "Exercício salvo." }));
      await loadWebContent();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-exercise-save", language, raw));
    }
  }

  async function removeExercise(exerciseId: string) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/web-content/exercises/${exerciseId}`, { method: "DELETE" }, token);
      setSuccess(t(language, { es: "Ejercicio eliminado.", en: "Exercise deleted.", pt: "Exercício removido." }));
      await loadWebContent();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-exercise-delete", language, raw));
    }
  }

  const filteredReviews = useMemo(() => {
    const search = reviewSearch.trim().toLowerCase();
    if (!search) {
      return reviews;
    }
    return reviews.filter((review) => {
      const values = [review.name, review.role, review.text].map((value) => String(value ?? "").toLowerCase());
      return values.some((value) => value.includes(search));
    });
  }, [reviewSearch, reviews]);

  const filteredPosts = useMemo(() => {
    const search = postSearch.trim().toLowerCase();
    if (!search) {
      return posts;
    }
    return posts.filter((post) => {
      const tagText = Array.isArray(post.tags) ? post.tags.join(" ") : "";
      const values = [post.title, post.slug, post.excerpt, post.subtitle ?? "", tagText].map((value) => String(value ?? "").toLowerCase());
      return values.some((value) => value.includes(search));
    });
  }, [postSearch, posts]);

  const filteredExercises = useMemo(() => {
    const search = exerciseSearch.trim().toLowerCase();
    const sorted = [...exercises].sort((a, b) => {
      if (a.featured !== b.featured) {
        return Number(b.featured) - Number(a.featured);
      }
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.title.localeCompare(b.title);
    });
    if (!search) {
      return sorted;
    }
    return sorted.filter((exercise) => {
      const tagText = Array.isArray(exercise.tags) ? exercise.tags.join(" ") : "";
      const values = [exercise.title, exercise.slug, exercise.summary, exercise.description, exercise.category, tagText].map((value) =>
        String(value ?? "").toLowerCase()
      );
      return values.some((value) => value.includes(search));
    });
  }, [exerciseSearch, exercises]);

  const hasPendingSettingsChanges = JSON.stringify(normalizeWebLandingSettings(settings)) !== JSON.stringify(savedSettings);

  const imageSlots: Array<{ key: keyof WebLandingSettings; label: string }> = [
    { key: "patientDesktopImageUrl", label: "Pacientes · laptop" },
    { key: "patientMobileImageUrl", label: "Pacientes · teléfono" },
    { key: "professionalDesktopImageUrl", label: "Psicologos · laptop" },
    { key: "professionalMobileImageUrl", label: "Psicólogos · teléfono" }
  ];

  function openCreateReviewModal() {
    setEditingReviewId(null);
    setReviewForm(emptyReview);
    setIsReviewModalOpen(true);
  }

  function openEditReviewModal(review: AdminReview) {
    setEditingReviewId(review.id);
    setReviewForm({
      name: review.name,
      role: review.role,
      reviewDate: review.reviewDate ?? inferReviewDate(review.relativeDate),
      relativeDate: review.relativeDate,
      text: review.text,
      rating: review.rating,
      avatar: review.avatar,
      accent: review.accent ?? "#7a5cff"
    });
    setIsReviewModalOpen(true);
  }

  function openCreatePostModal() {
    setEditingPostId(null);
    setPostForm(emptyPost);
    setIsPostModalOpen(true);
  }

  function openEditPostModal(post: AdminBlogPost) {
    setEditingPostId(post.id);
    setPostForm({ ...post });
    setIsPostModalOpen(true);
  }

  function openCreateExerciseModal() {
    setEditingExerciseId(null);
    setExerciseForm({
      ...emptyExercise,
      publishedAt: new Date().toISOString().slice(0, 10),
      sortOrder: exercises.length > 0 ? Math.max(...exercises.map((e) => e.sortOrder)) + 10 : 100
    });
    setIsExerciseModalOpen(true);
  }

  function openEditExerciseModal(exercise: AdminExercise) {
    setEditingExerciseId(exercise.id);
    setExerciseForm({ ...exercise });
    setIsExerciseModalOpen(true);
  }

  if (loading) {
    if (embedded) {
      return (
        <p className="settings-section-lead">
          {t(language, { es: "Cargando contenido web…", en: "Loading web content…", pt: "Carregando conteudo web…" })}
        </p>
      );
    }
    return (
      <div className="ops-page finance-page web-admin-page">
        <section className="card stack finance-kpi-card finance-page-hero">
          <header className="toolbar">
            <h2>{t(language, { es: "Administración de contenido", en: "Content management", pt: "Administração de conteúdo" })}</h2>
          </header>
          <p className="settings-section-lead">
            {t(language, { es: "Cargando contenido web…", en: "Loading web content…", pt: "Carregando conteudo web…" })}
          </p>
        </section>
      </div>
    );
  }

  const webAdminMain = (
    <>
      <CollapsiblePageSection
        sectionId="web-paquetes-site"
        summary={t(language, {
          es: "Paquetes en la web (landings)",
          en: "Web packages (landings)",
          pt: "Pacotes na web (landings)"
        })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <LandingSitePackagesSection token={token} language={language} />
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="web-imagenes"
        summary={t(language, { es: "Imágenes hero", en: "Hero images", pt: "Imagens hero" })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <p className="settings-section-lead">
          {t(language, {
            es: "Las cuatro imágenes de la landing: pacientes y psicólogos (laptop y teléfono).",
            en: "The four landing images: patients and psychologists (laptop and phone).",
            pt: "As quatro imagens da landing: pacientes e psicólogos (laptop e telefone)."
          })}
        </p>
          <div className="upload-grid">
            {imageSlots.map((slot) => {
              const inputId = `upload-${slot.key}`;
              const imageValue = settings[slot.key];
              return (
                <article className="upload-card" key={slot.key}>
                  <header>
                    <h3>{slot.label}</h3>
                    <span className={`upload-status ${imageValue ? "ok" : ""}`}>{imageValue ? "Imagen cargada" : "Sin imagen"}</span>
                  </header>
                  <label className="upload-trigger" htmlFor={inputId}>
                    Seleccionar imagen
                  </label>
                  <input
                    id={inputId}
                    className="upload-input-hidden"
                    type="file"
                    accept="image/*"
                    onChange={(event) => void setImageFromFile(event, slot.key)}
                  />
                  {imageValue ? (
                    <div className="upload-preview">
                      <img src={imageValue} alt={`Preview ${slot.label}`} loading="lazy" />
                    </div>
                  ) : (
                    <div className="upload-preview empty">Preview disponible al cargar imagen</div>
                  )}
                </article>
              );
            })}
          </div>
          <button className="primary" type="button" onClick={() => void saveSettings()} disabled={savingSettings || !hasPendingSettingsChanges}>
            {savingSettings
              ? t(language, { es: "Guardando imagenes...", en: "Saving images...", pt: "Salvando imagens..." })
              : hasPendingSettingsChanges
                ? t(language, { es: "Guardar imagenes", en: "Save images", pt: "Salvar imagens" })
                : t(language, { es: "Sin cambios por guardar", en: "No changes to save", pt: "Sem alteracoes para salvar" })}
          </button>
          {settingsFeedback ? (
            <p className={settingsFeedback.type === "ok" ? "success-text" : "error-text"}>{settingsFeedback.message}</p>
          ) : null}
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="web-reviews"
        summary={t(language, {
          es: `Reviews (${reviews.length})`,
          en: `Reviews (${reviews.length})`,
          pt: `Reviews (${reviews.length})`
        })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <p className="settings-section-lead">
          {t(language, {
            es: "Crear, editar o eliminar reviews de la landing.",
            en: "Create, edit, or delete landing reviews.",
            pt: "Criar, editar ou excluir reviews da landing."
          })}
        </p>
          <div className="web-admin-list-toolbar">
            <input
              type="search"
              placeholder="Buscar review por nombre, rol o texto"
              value={reviewSearch}
              onChange={(event) => setReviewSearch(event.target.value)}
            />
            <button className="primary" type="button" onClick={openCreateReviewModal}>Nueva review</button>
          </div>
          <div className="stack web-admin-scroll-list">
            {filteredReviews.length === 0 ? (
              <p className="web-admin-empty-list">No hay reviews para mostrar con ese filtro.</p>
            ) : (
              filteredReviews.map((review) => (
                <article className="user-card web-admin-row-card" key={review.id}>
                  <header>
                    <h3>{review.name}</h3>
                    <span className="role-pill">{review.rating}★</span>
                  </header>
                  <p>{review.text}</p>
                  <div className="user-card-footer">
                    <small>{review.role} · {review.relativeDate}</small>
                    <div className="package-admin-icon-actions">
                      <button
                        className="package-admin-icon-button"
                        type="button"
                        title="Editar"
                        aria-label="Editar"
                        onClick={() => openEditReviewModal(review)}
                      >
                        ✏️
                      </button>
                      <button
                        className="package-admin-icon-button danger"
                        type="button"
                        title="Eliminar"
                        aria-label="Eliminar"
                        onClick={() => void removeReview(review.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="web-articulos"
        summary={t(language, {
          es: `Artículos (${posts.length})`,
          en: `Articles (${posts.length})`,
          pt: `Artigos (${posts.length})`
        })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <p className="settings-section-lead">
          {t(language, {
            es: "Artículos del blog y metadatos SEO.",
            en: "Blog posts and SEO metadata.",
            pt: "Artigos do blog e metadados SEO."
          })}
        </p>
          <div className="web-admin-list-toolbar">
            <input
              type="search"
              placeholder="Buscar articulo por titulo, slug, texto o tags"
              value={postSearch}
              onChange={(event) => setPostSearch(event.target.value)}
            />
            {posts.length === 0 ? (
              <button
                className="ghost"
                type="button"
                onClick={() => void seedDefaultBlogPosts()}
                title={t(language, {
                  es: "Importa las 18 notas del catálogo de la landing como punto de partida.",
                  en: "Import the 18 articles from the landing catalog as a starting point.",
                  pt: "Importa as 18 notas do catálogo da landing como ponto de partida."
                })}
              >
                {t(language, {
                  es: "Importar 18 notas iniciales",
                  en: "Import 18 starter articles",
                  pt: "Importar 18 notas iniciais"
                })}
              </button>
            ) : null}
            <button className="primary" type="button" onClick={openCreatePostModal}>Nuevo articulo</button>
          </div>
          {posts.length === 0 ? (
            <p className="web-admin-helper-note">
              {t(language, {
                es: "Aún no hay notas cargadas. Mientras tanto, los pacientes y la landing ven el catálogo de cortesía (las 18 notas de MotivarCare). Hacé clic en \"Importar 18 notas iniciales\" para tomarlas como propias y poder editarlas o borrarlas.",
                en: "No articles loaded yet. In the meantime, patients and the landing show the courtesy catalog (the 18 MotivarCare articles). Click \"Import 18 starter articles\" to take ownership and edit or delete them.",
                pt: "Ainda não há notas carregadas. Enquanto isso, pacientes e a landing veem o catálogo de cortesia (as 18 notas MotivarCare). Clique em \"Importar 18 notas iniciais\" para assumi-las e editá-las ou removê-las."
              })}
            </p>
          ) : null}
          <div className="stack web-admin-scroll-list">
            {filteredPosts.length === 0 ? (
              <p className="web-admin-empty-list">No hay articulos para mostrar con ese filtro.</p>
            ) : (
              filteredPosts.map((post) => (
                <article className="user-card web-admin-row-card" key={post.id}>
                  <header><h3>{post.title}</h3><span className="role-pill">{post.status}</span></header>
                  <p>{post.excerpt}</p>
                  <div className="web-admin-audience-row">
                    <button
                      type="button"
                      className={`web-admin-audience-chip${post.showOnPatientPortal ? " is-on" : ""}`}
                      onClick={() => void togglePostAudience(post, "patient")}
                      aria-pressed={post.showOnPatientPortal}
                      title={post.showOnPatientPortal
                        ? "Visible en el portal del paciente. Tocá para ocultar."
                        : "Oculto para pacientes. Tocá para mostrar."}
                    >
                      <span aria-hidden="true">{post.showOnPatientPortal ? "✓" : "✗"}</span>
                      Pacientes
                    </button>
                    <button
                      type="button"
                      className={`web-admin-audience-chip${post.showOnLanding ? " is-on" : ""}`}
                      onClick={() => void togglePostAudience(post, "landing")}
                      aria-pressed={post.showOnLanding}
                      title={post.showOnLanding
                        ? "Visible en la landing. Tocá para ocultar."
                        : "Oculto en la landing. Tocá para mostrar."}
                    >
                      <span aria-hidden="true">{post.showOnLanding ? "✓" : "✗"}</span>
                      Landing
                    </button>
                  </div>
                  <div className="user-card-footer">
                    <small>{post.publishedAt} · {post.likes} likes</small>
                    <div className="package-admin-icon-actions">
                      <button
                        className="package-admin-icon-button"
                        type="button"
                        title="Editar"
                        aria-label="Editar"
                        onClick={() => openEditPostModal(post)}
                      >
                        ✏️
                      </button>
                      <button
                        className="package-admin-icon-button danger"
                        type="button"
                        title="Eliminar"
                        aria-label="Eliminar"
                        onClick={() => void removePost(post.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="web-ejercicios"
        summary={t(language, {
          es: `Ejercicios (${exercises.length})`,
          en: `Exercises (${exercises.length})`,
          pt: `Exercícios (${exercises.length})`
        })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <p className="settings-section-lead">
          {t(language, {
            es: "Catálogo de ejercicios para el portal del paciente: respiración, postura, mindfulness y más.",
            en: "Exercise catalog for the patient portal: breathing, posture, mindfulness and more.",
            pt: "Catálogo de exercícios para o portal do paciente: respiração, postura, mindfulness e mais."
          })}
        </p>
        <p className="web-admin-helper-note">
          {t(language, {
            es: "Si no cargás ninguno, el portal muestra una selección por defecto de 10 ejercicios. En cuanto guardes uno propio, esa selección por defecto deja de aplicarse.",
            en: "If none are loaded, the portal shows a default selection of 10 exercises. As soon as you save your own, the default selection stops applying.",
            pt: "Se nenhum for carregado, o portal exibe uma seleção padrão de 10 exercícios. Assim que você salvar um, a seleção padrão deixa de ser aplicada."
          })}
        </p>
        <div className="web-admin-list-toolbar">
          <input
            type="search"
            placeholder={t(language, {
              es: "Buscar por título, slug, categoría o tags",
              en: "Search by title, slug, category or tags",
              pt: "Buscar por título, slug, categoria ou tags"
            })}
            value={exerciseSearch}
            onChange={(event) => setExerciseSearch(event.target.value)}
          />
          <button className="primary" type="button" onClick={openCreateExerciseModal}>
            {t(language, { es: "Nuevo ejercicio", en: "New exercise", pt: "Novo exercício" })}
          </button>
        </div>
        <div className="stack web-admin-scroll-list">
          {filteredExercises.length === 0 ? (
            <p className="web-admin-empty-list">
              {t(language, {
                es: "Todavía no hay ejercicios cargados. Creá uno con el botón de arriba.",
                en: "No exercises loaded yet. Create one using the button above.",
                pt: "Ainda não há exercícios carregados. Crie um com o botão acima."
              })}
            </p>
          ) : (
            filteredExercises.map((exercise) => (
              <article className="user-card web-admin-row-card" key={exercise.id}>
                <header>
                  <h3>
                    <span aria-hidden style={{ marginRight: 8 }}>{exercise.emoji}</span>
                    {exercise.title}
                  </h3>
                  <span className="role-pill">{exercise.status}</span>
                </header>
                <p>{exercise.summary}</p>
                <div className="user-card-footer">
                  <small>
                    {EXERCISE_CATEGORY_OPTIONS.find((opt) => opt.value === exercise.category)?.label ?? exercise.category} ·{" "}
                    {exercise.durationMinutes} min ·{" "}
                    {EXERCISE_DIFFICULTY_OPTIONS.find((opt) => opt.value === exercise.difficulty)?.label ?? exercise.difficulty}
                    {exercise.featured ? " · ★" : ""}
                  </small>
                  <div className="package-admin-icon-actions">
                    <button
                      className="package-admin-icon-button"
                      type="button"
                      title={t(language, { es: "Editar", en: "Edit", pt: "Editar" })}
                      aria-label={t(language, { es: "Editar", en: "Edit", pt: "Editar" })}
                      onClick={() => openEditExerciseModal(exercise)}
                    >
                      ✏️
                    </button>
                    <button
                      className="package-admin-icon-button danger"
                      type="button"
                      title={t(language, { es: "Eliminar", en: "Delete", pt: "Excluir" })}
                      aria-label={t(language, { es: "Eliminar", en: "Delete", pt: "Excluir" })}
                      onClick={() => void removeExercise(exercise.id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </CollapsiblePageSection>

      <CollapsiblePageSection
        sectionId="web-musica-relax"
        summary={t(language, {
          es: "Música relajante (portal paciente)",
          en: "Relaxation music (patient portal)",
          pt: "Música relaxante (portal do paciente)"
        })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <p className="settings-section-lead">
          {t(language, {
            es: "Playlists y streams embebidos en /bienestar/musica. Editá el JSON y guardá; el API valida la forma antes de publicar.",
            en: "Embedded playlists for /wellbeing/music. Edit the JSON and save; the API validates the shape before publishing.",
            pt: "Playlists embutidas em /bienestar/musica. Edite o JSON e salve; a API valida antes de publicar."
          })}
        </p>
        <p className="web-admin-helper-note">
          {t(language, {
            es: "Si borrás la configuración guardada, el portal vuelve a mostrar la plantilla que viene con el servidor hasta que guardes otra vez.",
            en: "If you clear saved config, the portal shows the bundled server template until you save again.",
            pt: "Se você limpar a config salva, o portal mostra o modelo embutido no servidor até salvar de novo."
          })}
        </p>
        {relaxationFeedback ? (
          <p className={relaxationFeedback.type === "ok" ? "success-text" : "error-text"} role="status">
            {relaxationFeedback.message}
          </p>
        ) : null}
        <label className="stack" style={{ gap: 8 }}>
          <strong>
            {t(language, { es: "Arreglo JSON de playlists", en: "Playlists JSON array", pt: "Array JSON de playlists" })}
          </strong>
          <textarea
            rows={18}
            spellCheck={false}
            style={{ width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}
            value={relaxationJson}
            onChange={(event) => setRelaxationJson(event.target.value)}
            aria-label={t(language, {
              es: "Editor JSON de playlists de relajación",
              en: "Relaxation playlists JSON editor",
              pt: "Editor JSON das playlists"
            })}
          />
        </label>
        <div className="web-admin-list-toolbar" style={{ marginTop: 12 }}>
          <button
            className="primary"
            type="button"
            disabled={relaxationSaving}
            onClick={() => void saveRelaxationPlaylistsFromEditor()}
          >
            {t(language, { es: "Guardar playlists", en: "Save playlists", pt: "Salvar playlists" })}
          </button>
          <button type="button" disabled={relaxationSaving} onClick={() => void deleteRelaxationPlaylistsConfig()}>
            {t(language, {
              es: "Quitar guardado (volver a plantilla servidor)",
              en: "Clear saved (revert to server template)",
              pt: "Limpar salvo (voltar ao modelo do servidor)"
            })}
          </button>
        </div>
      </CollapsiblePageSection>

      {isReviewModalOpen ? (
        <div className="patient-modal-backdrop" onClick={() => setIsReviewModalOpen(false)}>
          <section className="patient-modal patient-create-modal web-admin-form-modal" onClick={(event) => event.stopPropagation()}>
            <header className="patient-modal-head">
              <h2>{editingReviewId ? "Editar review" : "Nueva review"}</h2>
              <button type="button" onClick={() => setIsReviewModalOpen(false)}>Cerrar</button>
            </header>
            <form className="stack" onSubmit={(event) => void saveReview(event)}>
              <div className="grid-form">
                <label>Nombre<input value={reviewForm.name} onChange={(event) => setReviewForm((current) => ({ ...current, name: event.target.value }))} /></label>
                <label>Rol<input value={reviewForm.role} onChange={(event) => setReviewForm((current) => ({ ...current, role: event.target.value }))} /></label>
                <label>
                  Fecha de review
                  <input
                    className="review-date-input"
                    type="date"
                    value={reviewForm.reviewDate ?? ""}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(event) =>
                      setReviewForm((current) => ({
                        ...current,
                        reviewDate: event.target.value,
                        relativeDate: formatRelativeDateFromReviewDate(event.target.value)
                      }))
                    }
                  />
                </label>
                <label>
                  Rating
                  <select
                    value={String(reviewForm.rating)}
                    onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) || 5 }))}
                  >
                    <option value="5">★★★★★ (5)</option>
                    <option value="4">★★★★☆ (4)</option>
                    <option value="3">★★★☆☆ (3)</option>
                    <option value="2">★★☆☆☆ (2)</option>
                    <option value="1">★☆☆☆☆ (1)</option>
                  </select>
                </label>
                <label>
                  Foto
                  <input type="file" accept="image/*" onChange={(event) => void setReviewAvatarFromFile(event)} />
                </label>
              </div>
              {reviewForm.avatar ? (
                <div className="review-avatar-preview">
                  <img src={reviewForm.avatar} alt="Preview avatar review" loading="lazy" />
                  <button type="button" onClick={() => setReviewForm((current) => ({ ...current, avatar: "" }))}>Quitar foto</button>
                </div>
              ) : null}
              <label>Texto<textarea rows={3} value={reviewForm.text} onChange={(event) => setReviewForm((current) => ({ ...current, text: event.target.value }))} /></label>
              <div className="toolbar-actions">
                <button className="primary" type="submit">{editingReviewId ? "Actualizar review" : "Crear review"}</button>
                <button type="button" onClick={() => { setEditingReviewId(null); setReviewForm(emptyReview); }}>Limpiar</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isPostModalOpen ? (
        <div className="patient-modal-backdrop" onClick={() => setIsPostModalOpen(false)}>
          <section className="patient-modal web-admin-form-modal" onClick={(event) => event.stopPropagation()}>
            <header className="patient-modal-head">
              <h2>{editingPostId ? "Editar articulo" : "Nuevo articulo"}</h2>
              <button type="button" onClick={() => setIsPostModalOpen(false)}>Cerrar</button>
            </header>
            <form className="stack" onSubmit={(event) => void savePost(event)}>
              <div className="grid-form">
                <label>Titulo<input value={postForm.title} onChange={(event) => setPostForm((current) => ({ ...current, title: event.target.value }))} /></label>
                <label>Slug<input value={postForm.slug} onChange={(event) => setPostForm((current) => ({ ...current, slug: event.target.value }))} /></label>
                <label>Categoria<input value={postForm.category} onChange={(event) => setPostForm((current) => ({ ...current, category: event.target.value }))} /></label>
                <label>Fecha (YYYY-MM-DD)<input value={postForm.publishedAt} onChange={(event) => setPostForm((current) => ({ ...current, publishedAt: event.target.value }))} /></label>
                <label>Likes<input value={postForm.likes} onChange={(event) => setPostForm((current) => ({ ...current, likes: Number(event.target.value) || 0 }))} /></label>
                <label>Lectura (min)<input value={postForm.readTime} onChange={(event) => setPostForm((current) => ({ ...current, readTime: Number(event.target.value) || 1 }))} /></label>
                <label>Autor<input value={postForm.authorName} onChange={(event) => setPostForm((current) => ({ ...current, authorName: event.target.value }))} /></label>
                <label>Rol autor<input value={postForm.authorRole} onChange={(event) => setPostForm((current) => ({ ...current, authorRole: event.target.value }))} /></label>
                <label>
                  Portada (archivo)
                  <input type="file" accept="image/*" onChange={(event) => void setPostImageFromFile(event, "coverImage")} />
                </label>
                <label>
                  Avatar autor (archivo)
                  <input type="file" accept="image/*" onChange={(event) => void setPostImageFromFile(event, "authorAvatar")} />
                </label>
                <label>Cover image URL<input value={postForm.coverImage} onChange={(event) => setPostForm((current) => ({ ...current, coverImage: event.target.value }))} /></label>
                <label>Avatar autor URL<input value={postForm.authorAvatar} onChange={(event) => setPostForm((current) => ({ ...current, authorAvatar: event.target.value }))} /></label>
                <label>Status<select value={postForm.status} onChange={(event) => setPostForm((current) => ({ ...current, status: event.target.value as "draft" | "published" }))}><option value="published">published</option><option value="draft">draft</option></select></label>
                <label className="inline-toggle"><input type="checkbox" checked={postForm.featured} onChange={(event) => setPostForm((current) => ({ ...current, featured: event.target.checked }))} />Featured</label>
                <label className="inline-toggle"><input type="checkbox" checked={postForm.showOnPatientPortal} onChange={(event) => setPostForm((current) => ({ ...current, showOnPatientPortal: event.target.checked }))} />Mostrar a pacientes</label>
                <label className="inline-toggle"><input type="checkbox" checked={postForm.showOnLanding} onChange={(event) => setPostForm((current) => ({ ...current, showOnLanding: event.target.checked }))} />Mostrar en la landing</label>
              </div>
              {(postForm.coverImage || postForm.authorAvatar) ? (
                <div className="post-image-preview-row">
                  {postForm.coverImage ? (
                    <figure className="post-image-preview">
                      <figcaption>Preview portada</figcaption>
                      <img src={postForm.coverImage} alt="Preview portada" loading="lazy" />
                    </figure>
                  ) : null}
                  {postForm.authorAvatar ? (
                    <figure className="post-image-preview post-image-preview-avatar">
                      <figcaption>Preview avatar autor</figcaption>
                      <img src={postForm.authorAvatar} alt="Preview avatar autor" loading="lazy" />
                    </figure>
                  ) : null}
                </div>
              ) : null}
              <label>Subtitulo<input value={postForm.subtitle ?? ""} onChange={(event) => setPostForm((current) => ({ ...current, subtitle: event.target.value }))} /></label>
              <label>Excerpt<textarea rows={2} value={postForm.excerpt} onChange={(event) => setPostForm((current) => ({ ...current, excerpt: event.target.value }))} /></label>
              <label>SEO title<input value={postForm.seoTitle} onChange={(event) => setPostForm((current) => ({ ...current, seoTitle: event.target.value }))} /></label>
              <label>SEO description<textarea rows={2} value={postForm.seoDescription} onChange={(event) => setPostForm((current) => ({ ...current, seoDescription: event.target.value }))} /></label>
              <label>Tags (coma separadas)<input value={postForm.tags.join(", ")} onChange={(event) => setPostForm((current) => ({ ...current, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }))} /></label>
              <label>Contenido<textarea rows={8} value={postForm.body} onChange={(event) => setPostForm((current) => ({ ...current, body: event.target.value }))} /></label>
              <div className="toolbar-actions">
                <button className="primary" type="submit">{editingPostId ? "Actualizar articulo" : "Crear articulo"}</button>
                <button type="button" onClick={() => { setEditingPostId(null); setPostForm(emptyPost); }}>Limpiar</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isExerciseModalOpen ? (
        <div className="patient-modal-backdrop" onClick={() => setIsExerciseModalOpen(false)}>
          <section className="patient-modal web-admin-form-modal" onClick={(event) => event.stopPropagation()}>
            <header className="patient-modal-head">
              <h2>
                {editingExerciseId
                  ? t(language, { es: "Editar ejercicio", en: "Edit exercise", pt: "Editar exercício" })
                  : t(language, { es: "Nuevo ejercicio", en: "New exercise", pt: "Novo exercício" })}
              </h2>
              <button type="button" onClick={() => setIsExerciseModalOpen(false)}>
                {t(language, { es: "Cerrar", en: "Close", pt: "Fechar" })}
              </button>
            </header>
            <form className="stack" onSubmit={(event) => void saveExercise(event)}>
              <div className="grid-form">
                <label>
                  {t(language, { es: "Título", en: "Title", pt: "Título" })}
                  <input
                    value={exerciseForm.title}
                    onChange={(event) => setExerciseForm((current) => ({ ...current, title: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  {t(language, { es: "Slug (URL)", en: "Slug (URL)", pt: "Slug (URL)" })}
                  <input
                    value={exerciseForm.slug}
                    onChange={(event) => setExerciseForm((current) => ({ ...current, slug: event.target.value }))}
                    placeholder="respiracion-4-7-8"
                    required
                  />
                </label>
                <label>
                  {t(language, { es: "Emoji", en: "Emoji", pt: "Emoji" })}
                  <input
                    value={exerciseForm.emoji}
                    onChange={(event) => setExerciseForm((current) => ({ ...current, emoji: event.target.value }))}
                    placeholder="🌬️"
                  />
                </label>
                <label>
                  {t(language, { es: "Categoría", en: "Category", pt: "Categoria" })}
                  <select
                    value={exerciseForm.category}
                    onChange={(event) =>
                      setExerciseForm((current) => ({ ...current, category: event.target.value as AdminExerciseCategory }))
                    }
                  >
                    {EXERCISE_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t(language, { es: "Dificultad", en: "Difficulty", pt: "Dificuldade" })}
                  <select
                    value={exerciseForm.difficulty}
                    onChange={(event) =>
                      setExerciseForm((current) => ({ ...current, difficulty: event.target.value as AdminExerciseDifficulty }))
                    }
                  >
                    {EXERCISE_DIFFICULTY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t(language, { es: "Duración (min)", en: "Duration (min)", pt: "Duração (min)" })}
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={exerciseForm.durationMinutes}
                    onChange={(event) =>
                      setExerciseForm((current) => ({ ...current, durationMinutes: Number(event.target.value) || 1 }))
                    }
                  />
                </label>
                <label>
                  {t(language, { es: "Orden", en: "Order", pt: "Ordem" })}
                  <input
                    type="number"
                    min={0}
                    value={exerciseForm.sortOrder}
                    onChange={(event) =>
                      setExerciseForm((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))
                    }
                  />
                </label>
                <label>
                  {t(language, { es: "Fecha (YYYY-MM-DD)", en: "Date (YYYY-MM-DD)", pt: "Data (YYYY-MM-DD)" })}
                  <input
                    type="date"
                    value={exerciseForm.publishedAt}
                    onChange={(event) => setExerciseForm((current) => ({ ...current, publishedAt: event.target.value }))}
                  />
                </label>
                <label>
                  {t(language, { es: "Estado", en: "Status", pt: "Status" })}
                  <select
                    value={exerciseForm.status}
                    onChange={(event) =>
                      setExerciseForm((current) => ({
                        ...current,
                        status: event.target.value as "draft" | "published"
                      }))
                    }
                  >
                    <option value="published">published</option>
                    <option value="draft">draft</option>
                  </select>
                </label>
                <label className="inline-toggle">
                  <input
                    type="checkbox"
                    checked={exerciseForm.featured}
                    onChange={(event) => setExerciseForm((current) => ({ ...current, featured: event.target.checked }))}
                  />
                  {t(language, { es: "Destacado", en: "Featured", pt: "Destacado" })}
                </label>
              </div>
              <label>
                {t(language, { es: "Resumen (en tarjeta)", en: "Summary (on card)", pt: "Resumo (no card)" })}
                <textarea
                  rows={2}
                  value={exerciseForm.summary}
                  onChange={(event) => setExerciseForm((current) => ({ ...current, summary: event.target.value }))}
                />
              </label>
              <label>
                {t(language, { es: "Descripción larga", en: "Long description", pt: "Descrição longa" })}
                <textarea
                  rows={4}
                  value={exerciseForm.description}
                  onChange={(event) => setExerciseForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              <label>
                {t(language, {
                  es: "Pasos (uno por línea, en orden)",
                  en: "Steps (one per line, in order)",
                  pt: "Passos (um por linha, em ordem)"
                })}
                <textarea
                  rows={6}
                  value={listToExerciseLines(exerciseForm.steps)}
                  onChange={(event) =>
                    setExerciseForm((current) => ({ ...current, steps: exerciseLinesToList(event.target.value) }))
                  }
                  placeholder={t(language, {
                    es: "Sentate cómoda/o…\nApoyá la lengua detrás de los dientes…\nInhalá 4 segundos…",
                    en: "Sit comfortably…\nPlace tongue behind teeth…\nInhale for 4 seconds…",
                    pt: "Sente-se confortavelmente…\nPosicione a língua atrás dos dentes…\nInspire por 4 segundos…"
                  })}
                />
              </label>
              <label>
                {t(language, {
                  es: "Tips opcionales (uno por línea)",
                  en: "Optional tips (one per line)",
                  pt: "Dicas opcionais (uma por linha)"
                })}
                <textarea
                  rows={3}
                  value={listToExerciseLines(exerciseForm.tips)}
                  onChange={(event) =>
                    setExerciseForm((current) => ({ ...current, tips: exerciseLinesToList(event.target.value) }))
                  }
                />
              </label>
              <label>
                {t(language, {
                  es: "Beneficios (uno por línea)",
                  en: "Benefits (one per line)",
                  pt: "Benefícios (um por linha)"
                })}
                <textarea
                  rows={3}
                  value={listToExerciseLines(exerciseForm.benefits)}
                  onChange={(event) =>
                    setExerciseForm((current) => ({ ...current, benefits: exerciseLinesToList(event.target.value) }))
                  }
                />
              </label>
              <label>
                {t(language, {
                  es: "Contraindicaciones (opcional)",
                  en: "Contraindications (optional)",
                  pt: "Contraindicações (opcional)"
                })}
                <textarea
                  rows={2}
                  value={exerciseForm.contraindications}
                  onChange={(event) =>
                    setExerciseForm((current) => ({ ...current, contraindications: event.target.value }))
                  }
                />
              </label>
              <label>
                {t(language, { es: "Tags (separadas por coma)", en: "Tags (comma separated)", pt: "Tags (separadas por vírgula)" })}
                <input
                  value={exerciseForm.tags.join(", ")}
                  onChange={(event) => setExerciseForm((current) => ({ ...current, tags: csvToList(event.target.value) }))}
                />
              </label>
              <div className="toolbar-actions">
                <button className="primary" type="submit">
                  {editingExerciseId
                    ? t(language, { es: "Actualizar ejercicio", en: "Update exercise", pt: "Atualizar exercício" })
                    : t(language, { es: "Crear ejercicio", en: "Create exercise", pt: "Criar exercício" })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingExerciseId(null);
                    setExerciseForm(emptyExercise);
                  }}
                >
                  {t(language, { es: "Limpiar", en: "Clear", pt: "Limpar" })}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="ops-page finance-page web-admin-page web-admin-page--embedded">{webAdminMain}</div>;
  }

  return (
    <div className="ops-page finance-page web-admin-page">
      <section className="card stack finance-kpi-card finance-page-hero">
        <header className="toolbar">
          <h2>{t(language, { es: "Administración de contenido", en: "Content management", pt: "Administração de conteúdo" })}</h2>
        </header>
        <p className="settings-section-lead">
          {t(language, {
            es: "Gestiona imágenes hero, reviews y artículos de la landing desde un solo módulo.",
            en: "Manage hero images, reviews, and blog articles from one module.",
            pt: "Gerencie imagens hero, reviews e artigos da landing em um único módulo."
          })}
        </p>
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
      </section>

      <div className="finance-page-subnav-sticky">
        <WebAdminPageSubnav
          language={language}
          activeId={activeWebSection}
          onSectionClick={(id: WebAdminScrollSectionId) => scrollToWebSection(id)}
        />
      </div>

      {webAdminMain}
    </div>
  );
}

