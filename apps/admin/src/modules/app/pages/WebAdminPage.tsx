import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { CollapsiblePageSection } from "../components/CollapsiblePageSection";
import {
  WEB_ADMIN_SCROLL_SECTION_IDS,
  WebAdminPageSubnav,
  type WebAdminScrollSectionId
} from "../components/WebAdminPageSubnav";
import { useStickySectionNavigation } from "../hooks/useStickySectionNavigation";
import { apiRequest } from "../services/api";
import type { AdminBlogPost, AdminReview, WebContentResponse, WebLandingSettings } from "../types";
import { compressImageDataUrl, fileToDataUrl, normalizeWebLandingSettings } from "../utils/media";

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
    body: ""
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
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<Omit<AdminReview, "id">>(emptyReview);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postForm, setPostForm] = useState<Omit<AdminBlogPost, "id">>(emptyPost);
  const [reviewSearch, setReviewSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
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
                body: String(item.body ?? "")
              }))
              .filter((item) => item.id.length > 0)
          : []
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load web content");
    } finally {
      setLoading(false);
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
      const rawMessage = requestError instanceof Error ? requestError.message : "Could not save settings";
      const message =
        rawMessage.includes("HTTP 413")
          ? t(language, {
              es: "La imagen es demasiado pesada. Prueba con una imagen mas liviana.",
              en: "Image is too large. Please try a lighter image.",
              pt: "A imagem e muito pesada. Tente uma imagem menor."
            })
          : rawMessage;
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
      setError(requestError instanceof Error ? requestError.message : "Could not load image");
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
      setError(requestError instanceof Error ? requestError.message : "No se pudo cargar la foto");
    } finally {
      event.target.value = "";
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (reviewForm.name.trim().length < 2) {
      setError("Nombre invalido");
      return;
    }
    if ((reviewForm.reviewDate ?? "").trim().length === 0) {
      setError("Selecciona fecha de review");
      return;
    }
    if (!reviewForm.avatar || reviewForm.avatar.trim().length === 0) {
      setError("Carga una foto para la review");
      return;
    }
    if (reviewForm.text.trim().length < 5) {
      setError("Texto demasiado corto");
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
      setError(requestError instanceof Error ? requestError.message : "Could not save review");
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
      setError(requestError instanceof Error ? requestError.message : "Could not delete review");
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
      setError(requestError instanceof Error ? requestError.message : "No se pudo cargar la imagen");
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
      setError(requestError instanceof Error ? requestError.message : "Could not save blog post");
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
      setError(requestError instanceof Error ? requestError.message : "Could not delete blog post");
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

  const hasPendingSettingsChanges = JSON.stringify(normalizeWebLandingSettings(settings)) !== JSON.stringify(savedSettings);

  const imageSlots: Array<{ key: keyof WebLandingSettings; label: string }> = [
    { key: "patientDesktopImageUrl", label: "Pacientes · laptop" },
    { key: "patientMobileImageUrl", label: "Pacientes · telefono" },
    { key: "professionalDesktopImageUrl", label: "Psicologos · laptop" },
    { key: "professionalMobileImageUrl", label: "Psicologos · telefono" }
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
            <h2>{t(language, { es: "Gestion Landing Page", en: "Landing Page Management", pt: "Gestao Landing Page" })}</h2>
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
            <button className="primary" type="button" onClick={openCreatePostModal}>Nuevo articulo</button>
          </div>
          <div className="stack web-admin-scroll-list">
            {filteredPosts.length === 0 ? (
              <p className="web-admin-empty-list">No hay articulos para mostrar con ese filtro.</p>
            ) : (
              filteredPosts.map((post) => (
                <article className="user-card web-admin-row-card" key={post.id}>
                  <header><h3>{post.title}</h3><span className="role-pill">{post.status}</span></header>
                  <p>{post.excerpt}</p>
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
    </>
  );

  if (embedded) {
    return <div className="ops-page finance-page web-admin-page web-admin-page--embedded">{webAdminMain}</div>;
  }

  return (
    <div className="ops-page finance-page web-admin-page">
      <section className="card stack finance-kpi-card finance-page-hero">
        <header className="toolbar">
          <h2>{t(language, { es: "Gestion Landing Page", en: "Landing Page Management", pt: "Gestao Landing Page" })}</h2>
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

