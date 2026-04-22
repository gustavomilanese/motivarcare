import { Fragment, type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
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
  AdminMarket,
  AdminPackagePaymentProvider,
  AdminSessionPackage,
  SessionPackagesResponse,
  SessionPackagesVisibilityPayload
} from "../types";

const ADMIN_PATIENT_MARKETS: readonly AdminMarket[] = ["AR", "US", "BR", "ES"];
type PatientPortalPublishChannel = AdminMarket;
type PackagePublishChannel = "landing" | PatientPortalPublishChannel;

const patientPortalChannelLabel = (language: AppLanguage, market: AdminMarket): string => {
  const labels: Record<AdminMarket, LocalizedText> = {
    AR: { es: "portal AR", en: "AR portal", pt: "portal AR" },
    US: { es: "portal US (USD)", en: "US portal (USD)", pt: "portal US (USD)" },
    BR: { es: "portal BR", en: "BR portal", pt: "portal BR" },
    ES: { es: "portal ES", en: "ES portal", pt: "portal ES" }
  };
  return t(language, labels[market]);
};

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function computeReferencePriceCents(credits: number, discountPercent: number): number {
  const referenceSessionPriceUsd = 100;
  const listPriceCents = referenceSessionPriceUsd * credits * 100;
  return Math.max(0, Math.round(listPriceCents * (1 - discountPercent / 100)));
}

/** API antigua o payload parcial puede omitir mercados → normalizar a AR/US/BR/ES. */
function normalizeSessionPackagesVisibility(raw: unknown): SessionPackagesVisibilityPayload {
  const empty: SessionPackagesVisibilityPayload = {
    landing: [],
    patient: [],
    patientByMarket: { AR: [], US: [], BR: [], ES: [] },
    featuredLanding: null,
    featuredPatient: null,
    featuredPatientByMarket: { AR: null, US: null, BR: null, ES: null }
  };
  if (!raw || typeof raw !== "object") {
    return empty;
  }
  const v = raw as Partial<SessionPackagesVisibilityPayload>;
  const patientLegacy = Array.isArray(v.patient) ? v.patient : [];
  const pbm = v.patientByMarket;
  const arList = Array.isArray(pbm?.AR) ? pbm.AR : patientLegacy;
  const usList = Array.isArray(pbm?.US) ? pbm.US : [];
  const brList = Array.isArray(pbm?.BR) ? pbm.BR : usList;
  const esList = Array.isArray(pbm?.ES) ? pbm.ES : usList;
  const fpm = v.featuredPatientByMarket;
  return {
    landing: Array.isArray(v.landing) ? v.landing : empty.landing,
    patient: arList,
    patientByMarket: { AR: arList, US: usList, BR: brList, ES: esList },
    featuredLanding: v.featuredLanding ?? null,
    featuredPatient: v.featuredPatient ?? null,
    featuredPatientByMarket: {
      AR: (fpm && typeof fpm === "object" ? fpm.AR : undefined) ?? v.featuredPatient ?? null,
      US: (fpm && typeof fpm === "object" ? fpm.US : undefined) ?? null,
      BR: (fpm && typeof fpm === "object" ? fpm.BR : undefined) ?? null,
      ES: (fpm && typeof fpm === "object" ? fpm.ES : undefined) ?? null
    }
  };
}

const PACKAGE_ADMIN_SECTION_IDS = ["pkg-overview", "pkg-catalogo"] as const;

export function SessionPackagesAdminPage(props: {
  token: string;
  language: AppLanguage;
  currency: SupportedCurrency;
  embedded?: boolean;
}) {
  const embedded = props.embedded ?? false;
  const emptyForm: {
    name: string;
    credits: string;
    discountPercent: string;
    currency: string;
    professionalId: string;
    stripePriceId: string;
    market: AdminMarket;
    paymentProvider: AdminPackagePaymentProvider;
    active: boolean;
  } = {
    name: "",
    credits: "4",
    discountPercent: "30",
    currency: "usd",
    professionalId: "",
    stripePriceId: "",
    market: "AR",
    paymentProvider: "MERCADOPAGO",
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
  const emptyVisibility = (): SessionPackagesVisibilityPayload => ({
    landing: [],
    patient: [],
    patientByMarket: { AR: [], US: [], BR: [], ES: [] },
    featuredLanding: null,
    featuredPatient: null,
    featuredPatientByMarket: { AR: null, US: null, BR: null, ES: null }
  });
  const [visibilityDraft, setVisibilityDraft] = useState<SessionPackagesVisibilityPayload>(emptyVisibility);
  const [savedVisibility, setSavedVisibility] = useState<SessionPackagesVisibilityPayload>(emptyVisibility);

  const withSafeMarketFields = (current: SessionPackagesVisibilityPayload): SessionPackagesVisibilityPayload => ({
    ...current,
    patientByMarket: current.patientByMarket ?? { AR: [], US: [], BR: [], ES: [] },
    featuredPatientByMarket: current.featuredPatientByMarket ?? { AR: null, US: null, BR: null, ES: null }
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const packagesResponse = await apiRequest<SessionPackagesResponse>("/api/admin/session-packages", {}, props.token);
      setPackages(packagesResponse.sessionPackages);
      const visibility = normalizeSessionPackagesVisibility(packagesResponse.visibility);
      setVisibilityDraft(visibility);
      setSavedVisibility(visibility);
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
      [item.name, item.professionalName ?? "", String(item.credits), item.market, item.paymentProvider]
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
      const visibilityPayload = {
        landing: visibilityDraft.landing,
        patient: visibilityDraft.patientByMarket.AR,
        patientByMarket: visibilityDraft.patientByMarket,
        featuredLanding: visibilityDraft.featuredLanding,
        featuredPatient: visibilityDraft.featuredPatientByMarket.AR ?? visibilityDraft.featuredPatient,
        featuredPatientByMarket: visibilityDraft.featuredPatientByMarket
      };
      await apiRequest<{ visibility: SessionPackagesVisibilityPayload }>(
        "/api/admin/session-packages/visibility",
        {
          method: "PUT",
          body: JSON.stringify(visibilityPayload)
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

  const togglePublished = (channel: PackagePublishChannel, packageId: string, checked: boolean) => {
    const channelLabel =
      channel === "landing" ? "landing" : patientPortalChannelLabel(props.language, channel);
    if (checked && channel !== "landing") {
      const market = channel;
      const pkg = packagesById.get(packageId);
      if (pkg && pkg.market !== market) {
        setError(
          t(props.language, {
            es: "Ese paquete es de otro mercado. Publicá solo paquetes del mismo mercado en cada portal.",
            en: "That package belongs to another market. Publish packages only to the portal that matches their market.",
            pt: "Esse pacote e de outro mercado."
          })
        );
        return;
      }
    }
    const draftSafe = withSafeMarketFields(visibilityDraft);
    const listForLimit =
      channel === "landing"
        ? draftSafe.landing
        : draftSafe.patientByMarket[channel as PatientPortalPublishChannel];
    if (checked && !listForLimit.includes(packageId) && listForLimit.length >= 3) {
      setError(
        t(props.language, {
          es: `En ${channelLabel} solo podés tener hasta 3 paquetes visibles. Sacá uno de la lista o desmarcá otro antes de agregar este.`,
          en: `You can only show up to 3 packages on ${channelLabel}. Remove one from the list before adding this.`,
          pt: `So e possivel exibir ate 3 pacotes em ${channelLabel}. Remova outro antes de adicionar este.`
        })
      );
      return;
    }

    setVisibilityDraft((current) => {
      const currentSafe = withSafeMarketFields(current);
      if (channel === "landing") {
        const currentIds = currentSafe.landing;
        if (checked) {
          if (currentIds.includes(packageId)) {
            return currentSafe;
          }
          return { ...currentSafe, landing: [...currentIds, packageId] };
        }
        const nextIds = currentIds.filter((id) => id !== packageId);
        return {
          ...currentSafe,
          landing: nextIds,
          featuredLanding: currentSafe.featuredLanding === packageId ? null : currentSafe.featuredLanding
        };
      }

      const market = channel;
      const currentIds = currentSafe.patientByMarket[market];
      if (checked) {
        if (currentIds.includes(packageId)) {
          return currentSafe;
        }
        const next = [...currentIds, packageId];
        return {
          ...currentSafe,
          patient: market === "AR" ? next : currentSafe.patient,
          patientByMarket: { ...currentSafe.patientByMarket, [market]: next },
          featuredPatient: market === "AR" ? currentSafe.featuredPatient : currentSafe.featuredPatient,
          featuredPatientByMarket: {
            ...currentSafe.featuredPatientByMarket,
            [market]: currentSafe.featuredPatientByMarket[market]
          }
        };
      }
      const nextIds = currentIds.filter((id) => id !== packageId);
      return {
        ...currentSafe,
        patient: market === "AR" ? nextIds : currentSafe.patient,
        patientByMarket: { ...currentSafe.patientByMarket, [market]: nextIds },
        featuredPatient: market === "AR" && currentSafe.featuredPatient === packageId ? null : currentSafe.featuredPatient,
        featuredPatientByMarket: {
          ...currentSafe.featuredPatientByMarket,
          [market]:
            currentSafe.featuredPatientByMarket[market] === packageId ? null : currentSafe.featuredPatientByMarket[market]
        }
      };
    });
  };

  const setFeatured = (channel: PackagePublishChannel, packageId: string | null) => {
    setVisibilityDraft((current) => {
      const currentSafe = withSafeMarketFields(current);
      if (channel === "landing") {
        return { ...currentSafe, featuredLanding: packageId };
      }
      const market = channel;
      return {
        ...currentSafe,
        featuredPatient: market === "AR" ? packageId : currentSafe.featuredPatient,
        featuredPatientByMarket: {
          ...currentSafe.featuredPatientByMarket,
          [market]: packageId
        }
      };
    });
  };

  const setPublishedOrder = (channel: PackagePublishChannel, packageId: string, nextOrder: number) => {
    setVisibilityDraft((current) => {
      const currentSafe = withSafeMarketFields(current);
      if (channel === "landing") {
        const currentIds = [...currentSafe.landing];
        const currentIndex = currentIds.indexOf(packageId);
        const targetIndex = nextOrder - 1;
        if (currentIndex === -1 || targetIndex < 0 || targetIndex >= currentIds.length || currentIndex === targetIndex) {
          return currentSafe;
        }
        const [moved] = currentIds.splice(currentIndex, 1);
        currentIds.splice(targetIndex, 0, moved);
        return { ...currentSafe, landing: currentIds };
      }
      const market = channel;
      const currentIds = [...currentSafe.patientByMarket[market]];
      const currentIndex = currentIds.indexOf(packageId);
      const targetIndex = nextOrder - 1;
      if (currentIndex === -1 || targetIndex < 0 || targetIndex >= currentIds.length || currentIndex === targetIndex) {
        return currentSafe;
      }
      const [moved] = currentIds.splice(currentIndex, 1);
      currentIds.splice(targetIndex, 0, moved);
      const next = {
        ...currentSafe,
        patientByMarket: { ...currentSafe.patientByMarket, [market]: currentIds }
      };
      return market === "AR" ? { ...next, patient: currentIds } : next;
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
      market: item.market,
      paymentProvider: item.paymentProvider,
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
        market: form.market,
        paymentProvider: form.paymentProvider,
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
                {ADMIN_PATIENT_MARKETS.map((m) => (
                  <Fragment key={`head-${m}`}>
                    <span>{`Portal ${m}`}</span>
                    <span>Orden</span>
                  </Fragment>
                ))}
                <span />
              </div>
              {filteredPackages.map((item) => (
                <article className={"package-admin-card " + (item.active ? "is-active" : "is-inactive")} key={item.id}>
                  <div className="package-admin-card-main">
                    <div className="package-admin-card-head">
                    <div>
                        <div className="package-admin-card-title-row">
                          <h4>{item.name}</h4>
                          <span className="role-pill muted">{item.market}</span>
                          <span className="role-pill muted">{item.paymentProvider}</span>
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

                  {ADMIN_PATIENT_MARKETS.map((market) => {
                    const ids = visibilityDraft.patientByMarket[market];
                    const featured = visibilityDraft.featuredPatientByMarket[market];
                    return (
                      <Fragment key={`${item.id}-${market}`}>
                        <div className="package-admin-card-channel">
                          <div className="package-admin-channel-options">
                            <button
                              type="button"
                              className={"package-admin-publish-icon-button" + (ids.includes(item.id) ? " active" : "")}
                              aria-label={ids.includes(item.id) ? `Quitar de portal ${market}` : `Publicar en portal ${market}`}
                              title={ids.includes(item.id) ? `Quitar de portal ${market}` : `Publicar en portal ${market}`}
                              disabled={!item.active}
                              onClick={() => togglePublished(market, item.id, !ids.includes(item.id))}
                            >
                              {ids.includes(item.id) ? "✓" : ""}
                            </button>
                          </div>
                        </div>

                        <div className="package-admin-card-channel package-admin-card-order-column">
                          <div className="package-admin-channel-options">
                            {ids.includes(item.id) ? (
                              <div className="package-admin-channel-order">
                                <select
                                  className="package-admin-order-select"
                                  aria-label={`Orden en portal ${market}`}
                                  value={String(ids.indexOf(item.id) + 1)}
                                  onChange={(event) => setPublishedOrder(market, item.id, Number(event.target.value))}
                                >
                                  {ids.map((_, index) => (
                                    <option key={`patient-${market}-order-${index + 1}`} value={String(index + 1)}>
                                      {index + 1}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className={
                                    "package-admin-featured-icon-button" + (featured === item.id ? " active" : "")
                                  }
                                  aria-label={featured === item.id ? `Quitar destacado ${market}` : `Destacado ${market}`}
                                  onClick={() => setFeatured(market, featured === item.id ? null : item.id)}
                                >
                                  ★
                                </button>
                              </div>
                            ) : (
                              <span className="package-admin-order-placeholder">-</span>
                            )}
                          </div>
                        </div>
                      </Fragment>
                    );
                  })}

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
              {ADMIN_PATIENT_MARKETS.map((m) => (
                <span key={`pill-${m}`} className="role-pill">{`Portal ${m}: ${visibilityDraft.patientByMarket[m].length}/3`}</span>
              ))}
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
              <label>
                Mercado
                <select
                  value={form.market}
                  onChange={(event) => {
                    const m = event.target.value as AdminMarket;
                    setForm((current) => ({
                      ...current,
                      market: m,
                      paymentProvider: m === "AR" ? "MERCADOPAGO" : "STRIPE",
                      currency:
                        m === "AR" ? "ars" : m === "BR" ? "brl" : m === "ES" ? "eur" : "usd"
                    }));
                  }}
                >
                  <option value="AR">Argentina (AR)</option>
                  <option value="US">Estados Unidos (US)</option>
                  <option value="BR">Brasil (BR)</option>
                  <option value="ES">España (ES)</option>
                </select>
              </label>
              <label>
                Cobro previsto
                <select
                  value={form.paymentProvider}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      paymentProvider: event.target.value === "MERCADOPAGO" ? "MERCADOPAGO" : "STRIPE"
                    }))
                  }
                >
                  <option value="MERCADOPAGO">Mercado Pago</option>
                  <option value="STRIPE">Stripe</option>
                </select>
              </label>
              <label>Sesiones incluidas<input type="number" min="1" value={form.credits} onChange={(event) => setForm((current) => ({ ...current, credits: event.target.value }))} /></label>
              <label>Descuento (%)<input type="number" min="0" max="100" step="1" value={form.discountPercent} onChange={(event) => setForm((current) => ({ ...current, discountPercent: event.target.value }))} /></label>
              <label>ID catálogo / Stripe Price<input value={form.stripePriceId} onChange={(event) => setForm((current) => ({ ...current, stripePriceId: event.target.value }))} placeholder="price_… o id interno" /></label>
              <label>Moneda (ISO)<input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} placeholder="ars / usd" /></label>
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
