import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import {
  type AppLanguage,
  type LocalizedText,
  type SupportedCurrency,
  textByLanguage
} from "@therapy/i18n-config";
import { CollapsiblePageSection } from "../components/CollapsiblePageSection";
import { StickyPageSubnav } from "../components/StickyPageSubnav";
import { useStickySectionNavigation } from "../hooks/useStickySectionNavigation";
import { adminSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
import { apiRequest } from "../services/api";
import type {
  AdminSessionPackage,
  SessionPackagesResponse
} from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function computeReferencePriceCents(credits: number, discountPercent: number): number {
  const referenceSessionPriceUsd = 100;
  const listPriceCents = referenceSessionPriceUsd * credits * 100;
  return Math.max(0, Math.round(listPriceCents * (1 - discountPercent / 100)));
}

const PACKAGE_ADMIN_SECTION_IDS = ["pkg-overview", "pkg-catalogo"] as const;

export function SessionPackagesAdminPage(props: {
  token: string;
  language: AppLanguage;
  currency: SupportedCurrency;
  embedded?: boolean;
}) {
  const embedded = props.embedded ?? false;
  const emptyForm = {
    name: "",
    credits: "4",
    discountPercent: "30",
    currency: "usd",
    professionalId: "",
    stripePriceId: "",
    active: true
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [packages, setPackages] = useState<AdminSessionPackage[]>([]);
  const [search, setSearch] = useState("");
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [visibilityDraft, setVisibilityDraft] = useState<{ landing: string[]; patient: string[]; featuredLanding: string | null; featuredPatient: string | null }>({
    landing: [],
    patient: [],
    featuredLanding: null,
    featuredPatient: null
  });
  const [savedVisibility, setSavedVisibility] = useState<{ landing: string[]; patient: string[]; featuredLanding: string | null; featuredPatient: string | null }>({
    landing: [],
    patient: [],
    featuredLanding: null,
    featuredPatient: null
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const packagesResponse = await apiRequest<SessionPackagesResponse>("/api/admin/session-packages", {}, props.token);
      setPackages(packagesResponse.sessionPackages);
      setVisibilityDraft(packagesResponse.visibility);
      setSavedVisibility(packagesResponse.visibility);
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("session-packages-load", props.language, raw));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [props.token]);

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return packages;
    }
    return packages.filter((item) =>
      [item.name, item.professionalName ?? "", String(item.credits)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [packages, search]);

  const activePackages = packages.filter((item) => item.active);
  const inactivePackages = packages.length - activePackages.length;
  const totalCredits = packages.reduce((sum, item) => sum + item.credits, 0);
  const totalPurchases = packages.reduce((sum, item) => sum + item.purchasesCount, 0);
  const packagesById = useMemo(() => new Map(packages.map((item) => [item.id, item])), [packages]);
  const hasPendingVisibilityChanges =
    JSON.stringify(visibilityDraft) !== JSON.stringify(savedVisibility);
  const { activeSection, scrollToSection } = useStickySectionNavigation(PACKAGE_ADMIN_SECTION_IDS, {
    loading: loading || embedded
  });

  const saveVisibility = async () => {
    setError("");
    setSuccess("");
    setSavingVisibility(true);
    try {
      await apiRequest<{ visibility: { landing: string[]; patient: string[]; featuredLanding: string | null; featuredPatient: string | null } }>(
        "/api/admin/session-packages/visibility",
        {
          method: "PUT",
          body: JSON.stringify(visibilityDraft)
        },
        props.token
      );
      setSuccess("Publicacion actualizada");
      await load();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("session-packages-visibility", props.language, raw));
    } finally {
      setSavingVisibility(false);
    }
  };

  const togglePublished = (channel: "landing" | "patient", packageId: string, checked: boolean) => {
    if (checked && !visibilityDraft[channel].includes(packageId) && visibilityDraft[channel].length >= 3) {
      setError(
        t(props.language, {
          es: `En ${channel === "landing" ? "landing" : "paciente"} solo podés tener hasta 3 paquetes visibles. Sacá uno de la lista o desmarcá otro antes de agregar este.`,
          en: `You can only show up to 3 packages on ${channel === "landing" ? "landing" : "patient"}. Remove one from the list before adding this.`,
          pt: `So e possivel exibir ate 3 pacotes em ${channel === "landing" ? "landing" : "paciente"}. Remova outro antes de adicionar este.`
        })
      );
      return;
    }

    setVisibilityDraft((current) => {
      const currentIds = current[channel];
      if (checked) {
        if (currentIds.includes(packageId)) {
          return current;
        }
        return { ...current, [channel]: [...currentIds, packageId] };
      }
      const nextIds = currentIds.filter((id) => id !== packageId);
      const featuredKey = channel === "landing" ? "featuredLanding" : "featuredPatient";
      return {
        ...current,
        [channel]: nextIds,
        [featuredKey]: current[featuredKey] === packageId ? null : current[featuredKey]
      };
    });
  };

  const setFeatured = (channel: "landing" | "patient", packageId: string | null) => {
    setVisibilityDraft((current) => ({
      ...current,
      [channel === "landing" ? "featuredLanding" : "featuredPatient"]: packageId
    }));
  };

  const setPublishedOrder = (channel: "landing" | "patient", packageId: string, nextOrder: number) => {
    setVisibilityDraft((current) => {
      const currentIds = [...current[channel]];
      const currentIndex = currentIds.indexOf(packageId);
      const targetIndex = nextOrder - 1;
      if (currentIndex === -1 || targetIndex < 0 || targetIndex >= currentIds.length || currentIndex === targetIndex) {
        return current;
      }
      const [moved] = currentIds.splice(currentIndex, 1);
      currentIds.splice(targetIndex, 0, moved);
      return { ...current, [channel]: currentIds };
    });
  };

  const resetForm = () => {
    setEditingPackageId(null);
    setForm(emptyForm);
  };

  const closeModal = () => {
    setIsPackageModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setError("");
    setSuccess("");
    setIsPackageModalOpen(true);
  };

  const openEdit = (item: AdminSessionPackage) => {
    setEditingPackageId(item.id);
    setForm({
      name: item.name,
      credits: String(item.credits),
      discountPercent: String(item.discountPercent),
      currency: item.currency,
      professionalId: item.professionalId ?? "",
      stripePriceId: item.stripePriceId,
      active: item.active
    });
    setError("");
    setSuccess("");
    setIsPackageModalOpen(true);
  };

  const submit = async () => {
    const credits = Number(form.credits);
    const discountPercent = Number(form.discountPercent);
    const priceCents = computeReferencePriceCents(credits, discountPercent);
    if (form.name.trim().length < 2) {
      setError(
        t(props.language, {
          es: "Poné un nombre un poco más largo (al menos 2 caracteres) para identificar el paquete.",
          en: "Use a slightly longer name (at least 2 characters) so the package is easy to find.",
          pt: "Use um nome um pouco maior (pelo menos 2 caracteres) para identificar o pacote."
        })
      );
      return;
    }
    if (!Number.isInteger(credits) || credits <= 0) {
      setError(
        t(props.language, {
          es: "Las sesiones incluidas tienen que ser un número entero mayor que cero.",
          en: "Included sessions must be a whole number greater than zero.",
          pt: "As sessoes incluidas precisam ser um inteiro maior que zero."
        })
      );
      return;
    }
    if (!Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      setError(
        t(props.language, {
          es: "El descuento va en porcentaje entero entre 0 y 100.",
          en: "Discount must be a whole percent between 0 and 100.",
          pt: "O desconto deve ser um percentual inteiro entre 0 e 100."
        })
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        name: form.name.trim(),
        credits,
        priceCents,
        discountPercent,
        currency: form.currency.trim().toLowerCase() || "usd",
        professionalId: form.professionalId.trim().length > 0 ? form.professionalId : null,
        stripePriceId: form.stripePriceId.trim().length > 0 ? form.stripePriceId.trim() : undefined,
        active: form.active
      };

      if (editingPackageId) {
        await apiRequest<{ sessionPackage: AdminSessionPackage }>("/api/admin/session-packages/" + editingPackageId, { method: "PATCH", body: JSON.stringify(payload) }, props.token);
        setSuccess("Paquete actualizado");
      } else {
        await apiRequest<{ sessionPackage: AdminSessionPackage }>("/api/admin/session-packages", { method: "POST", body: JSON.stringify(payload) }, props.token);
        setSuccess("Paquete creado");
      }

      resetForm();
      setIsPackageModalOpen(false);
      await load();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("session-packages-save", props.language, raw));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: AdminSessionPackage) => {
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ sessionPackage: AdminSessionPackage }>("/api/admin/session-packages/" + item.id, { method: "PATCH", body: JSON.stringify({ active: !item.active }) }, props.token);
      setSuccess(item.active ? "Paquete desactivado" : "Paquete activado");
      await load();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("session-packages-status", props.language, raw));
    }
  };

  const removePackage = async (item: AdminSessionPackage) => {
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest<{ note?: string }>("/api/admin/session-packages/" + item.id, { method: "DELETE" }, props.token);
      setSuccess(response.note ?? "Paquete eliminado");
      if (editingPackageId === item.id) {
        resetForm();
      }
      await load();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("session-packages-delete", props.language, raw));
    }
  };

  const kpiRow = (
    <div className="package-admin-kpis">
      <article className="package-admin-kpi">
        <span>Activos</span>
        <strong>{activePackages.length}</strong>
      </article>
      <article className="package-admin-kpi">
        <span>Inactivos</span>
        <strong>{inactivePackages}</strong>
      </article>
      <article className="package-admin-kpi">
        <span>Sesiones total</span>
        <strong>{totalCredits}</strong>
      </article>
      <article className="package-admin-kpi">
        <span>Compras historicas</span>
        <strong>{totalPurchases}</strong>
      </article>
    </div>
  );

  const catalogCollapsible = (
      <CollapsiblePageSection
        sectionId="pkg-catalogo"
        summary={t(props.language, {
          es: "Catálogo y publicación",
          en: "Catalog and publishing",
          pt: "Catálogo e publicação"
        })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
      <section className="package-admin-grid">
        <section className="card stack package-admin-list-card">
          <div className="package-admin-section-head">
            <div>
              <h3>Catalogo actual</h3>
              <p>Marca que paquetes van a landing y cuales a patient. Maximo 3 por canal. El orden tambien se define desde este catalogo.</p>
            </div>
            <button className="package-admin-secondary-button" type="button" onClick={openCreateModal}>Nuevo paquete</button>
          </div>
          <input className="package-admin-search" type="search" placeholder="Buscar por nombre, profesional o sesiones" value={search} onChange={(event) => setSearch(event.target.value)} />

          {loading ? <p>Cargando paquetes...</p> : null}

          {!loading ? (
            <div className="package-admin-list">
              <div className="package-admin-list-head" aria-hidden="true">
                <span>Paquete</span>
                <span>Landing</span>
                <span>Orden</span>
                <span>Patient</span>
                <span>Orden</span>
                <span />
              </div>
              {filteredPackages.map((item) => (
                <article className={"package-admin-card " + (item.active ? "is-active" : "is-inactive")} key={item.id}>
                  <div className="package-admin-card-main">
                    <div className="package-admin-card-head">
                    <div>
                        <div className="package-admin-card-title-row">
                          <h4>{item.name}</h4>
                          <span className={"role-pill" + (item.active ? "" : " muted")}>{item.active ? "Activo" : "Inactivo"}</span>
                        </div>
                        {item.professionalName ? <p>{`Asignado a ${item.professionalName}`}</p> : null}
                        <strong className="package-admin-card-price">{`${item.credits} sesiones · ${item.discountPercent}% OFF`}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="package-admin-card-channel">
                    <div className="package-admin-channel-options">
                      <button
                        type="button"
                        className={"package-admin-publish-icon-button" + (visibilityDraft.landing.includes(item.id) ? " active" : "")}
                        aria-label={visibilityDraft.landing.includes(item.id) ? "Quitar de landing" : "Publicar en landing"}
                        title={visibilityDraft.landing.includes(item.id) ? "Quitar de landing" : "Publicar en landing"}
                        disabled={!item.active}
                        onClick={() => togglePublished("landing", item.id, !visibilityDraft.landing.includes(item.id))}
                      >
                        {visibilityDraft.landing.includes(item.id) ? "✓" : ""}
                      </button>
                    </div>
                  </div>

                  <div className="package-admin-card-channel package-admin-card-order-column">
                    <div className="package-admin-channel-options">
                      {visibilityDraft.landing.includes(item.id) ? (
                        <div className="package-admin-channel-order">
                          <select
                            className="package-admin-order-select"
                            aria-label="Orden en landing"
                            value={String(visibilityDraft.landing.indexOf(item.id) + 1)}
                            onChange={(event) => setPublishedOrder("landing", item.id, Number(event.target.value))}
                          >
                            {visibilityDraft.landing.map((_, index) => (
                              <option key={`landing-order-${index + 1}`} value={String(index + 1)}>
                                {index + 1}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={"package-admin-featured-icon-button" + (visibilityDraft.featuredLanding === item.id ? " active" : "")}
                            aria-label={visibilityDraft.featuredLanding === item.id ? "Quitar mas elegido en landing" : "Marcar mas elegido en landing"}
                            title={visibilityDraft.featuredLanding === item.id ? "Quitar mas elegido en landing" : "Marcar mas elegido en landing"}
                            onClick={() => setFeatured("landing", visibilityDraft.featuredLanding === item.id ? null : item.id)}
                          >
                            ★
                          </button>
                        </div>
                      ) : (
                        <span className="package-admin-order-placeholder">-</span>
                      )}
                    </div>
                  </div>

                  <div className="package-admin-card-channel">
                    <div className="package-admin-channel-options">
                      <button
                        type="button"
                        className={"package-admin-publish-icon-button" + (visibilityDraft.patient.includes(item.id) ? " active" : "")}
                        aria-label={visibilityDraft.patient.includes(item.id) ? "Quitar de patient" : "Publicar en patient"}
                        title={visibilityDraft.patient.includes(item.id) ? "Quitar de patient" : "Publicar en patient"}
                        disabled={!item.active}
                        onClick={() => togglePublished("patient", item.id, !visibilityDraft.patient.includes(item.id))}
                      >
                        {visibilityDraft.patient.includes(item.id) ? "✓" : ""}
                      </button>
                    </div>
                  </div>

                  <div className="package-admin-card-channel package-admin-card-order-column">
                    <div className="package-admin-channel-options">
                      {visibilityDraft.patient.includes(item.id) ? (
                        <div className="package-admin-channel-order">
                          <select
                            className="package-admin-order-select"
                            aria-label="Orden en patient"
                            value={String(visibilityDraft.patient.indexOf(item.id) + 1)}
                            onChange={(event) => setPublishedOrder("patient", item.id, Number(event.target.value))}
                          >
                            {visibilityDraft.patient.map((_, index) => (
                              <option key={`patient-order-${index + 1}`} value={String(index + 1)}>
                                {index + 1}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={"package-admin-featured-icon-button" + (visibilityDraft.featuredPatient === item.id ? " active" : "")}
                            aria-label={visibilityDraft.featuredPatient === item.id ? "Quitar mas elegido en patient" : "Marcar mas elegido en patient"}
                            title={visibilityDraft.featuredPatient === item.id ? "Quitar mas elegido en patient" : "Marcar mas elegido en patient"}
                            onClick={() => setFeatured("patient", visibilityDraft.featuredPatient === item.id ? null : item.id)}
                          >
                            ★
                          </button>
                        </div>
                      ) : (
                        <span className="package-admin-order-placeholder">-</span>
                      )}
                    </div>
                  </div>

                  <div className="package-admin-card-actions">
                    <div className="package-admin-icon-actions">
                      <button
                        className="package-admin-icon-button"
                        type="button"
                        title="Editar"
                        aria-label="Editar"
                        onClick={() => openEdit(item)}
                      >
                        ✏️
                      </button>
                      <button
                        className="package-admin-icon-button"
                        type="button"
                        title={item.active ? "Desactivar" : "Activar"}
                        aria-label={item.active ? "Desactivar" : "Activar"}
                        onClick={() => void toggleActive(item)}
                      >
                        {item.active ? "⏸" : "▶"}
                      </button>
                      <button
                        className="package-admin-icon-button danger"
                        type="button"
                        title="Eliminar"
                        aria-label="Eliminar"
                        onClick={() => void removePackage(item)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {filteredPackages.length === 0 ? <p className="web-admin-empty-list">No hay paquetes para mostrar.</p> : null}
            </div>
          ) : null}

          <div className="toolbar-actions package-admin-toolbar">
            <div className="package-admin-toolbar-status">
              <span className="role-pill">Landing: {visibilityDraft.landing.length}/3</span>
              <span className="role-pill">Patient: {visibilityDraft.patient.length}/3</span>
            </div>
            <button
              className={"primary" + (hasPendingVisibilityChanges ? " package-admin-save-pending" : "")}
              type="button"
              onClick={() => void saveVisibility()}
              disabled={savingVisibility || !hasPendingVisibilityChanges}
            >
              {savingVisibility ? "Guardando..." : hasPendingVisibilityChanges ? "Guardar publicacion" : "Publicacion guardada"}
            </button>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          {success ? <p className="success-text">{success}</p> : null}
        </section>
      </section>
      </CollapsiblePageSection>
  );

  const packageModal =
    isPackageModalOpen ? (
        <div className="patient-modal-backdrop" onClick={closeModal}>
          <section className="patient-modal patient-create-modal web-admin-form-modal package-admin-modal" onClick={(event) => event.stopPropagation()}>
            <header className="patient-modal-head">
              <div>
                <h3>{editingPackageId ? "Editar paquete" : "Nuevo paquete"}</h3>
                <p>Define nombre, sesiones y descuento. El precio se calcula dinámicamente según el valor hora del profesional seleccionado.</p>
              </div>
              <button type="button" onClick={closeModal}>Cerrar</button>
            </header>
            <div className="grid-form">
              <label>Nombre<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Sesiones incluidas<input type="number" min="1" value={form.credits} onChange={(event) => setForm((current) => ({ ...current, credits: event.target.value }))} /></label>
              <label>Descuento (%)<input type="number" min="0" max="100" step="1" value={form.discountPercent} onChange={(event) => setForm((current) => ({ ...current, discountPercent: event.target.value }))} /></label>
              <label className="inline-toggle package-admin-toggle"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />Activo para patient y landing</label>
            </div>
            <div className="toolbar-actions">
              <button className="primary" type="button" onClick={() => void submit()} disabled={saving}>{saving ? "Guardando..." : editingPackageId ? "Guardar cambios" : "Crear paquete"}</button>
              <button type="button" onClick={closeModal}>Cancelar</button>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            {success ? <p className="success-text">{success}</p> : null}
          </section>
        </div>
      ) : null;

  if (embedded) {
    return (
      <div className="stack-lg package-admin-page package-admin-page--embedded">
        {kpiRow}
        {catalogCollapsible}
        {packageModal}
      </div>
    );
  }

  return (
    <div className="stack-lg package-admin-page ops-page finance-page">
      <section id="pkg-overview" className="card stack package-admin-hero finance-page-hero">
        <div className="package-admin-hero-copy">
          <p className="admin-eyebrow">Comercial</p>
          <h2>Planes y paquetes de sesiones</h2>
          <p>Administra el catalogo que consume el portal de pacientes y que tambien puede mostrarse en la landing.</p>
        </div>
        {kpiRow}
      </section>

      <div className="finance-page-subnav-sticky">
        <StickyPageSubnav
          language={props.language}
          activeId={activeSection}
          onSectionClick={(id) => scrollToSection(id)}
          items={[
            { id: "pkg-overview", label: { es: "Resumen", en: "Overview", pt: "Resumo" } },
            { id: "pkg-catalogo", label: { es: "Catálogo", en: "Catalog", pt: "Catálogo" } }
          ]}
          ariaLabel={{ es: "Secciones de paquetes", en: "Package sections", pt: "Seções de pacotes" }}
        />
      </div>

      {catalogCollapsible}
      {packageModal}
    </div>
  );
}
