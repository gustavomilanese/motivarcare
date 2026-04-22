import { useEffect, useMemo, useState } from "react";
import type { AppLanguage, LocalizedText } from "@therapy/i18n-config";
import { textByLanguage } from "@therapy/i18n-config";
import type { LandingPackagesSlotId } from "@therapy/types";
import { adminSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
import {
  landingSlotShortLabel,
  normalizeSessionPackagesVisibility,
  readFeaturedLandingForSlot,
  readLandingListForSlot,
  withSafeVisibility
} from "../lib/sessionPackagesVisibilityAdmin";
import { apiRequest } from "../services/api";
import type { AdminMarket, AdminSessionPackage, SessionPackagesResponse, SessionPackagesVisibilityPayload } from "../types";

const MARKETS: readonly AdminMarket[] = ["AR", "US", "BR", "ES"];

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function LandingSitePackagesSection(props: { token: string; language: AppLanguage }) {
  const [loading, setLoading] = useState(true);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [packages, setPackages] = useState<AdminSessionPackage[]>([]);
  const [search, setSearch] = useState("");
  const [landingSlotView, setLandingSlotView] = useState<LandingPackagesSlotId>("patient_main");
  const [catalogMarketView, setCatalogMarketView] = useState<AdminMarket>("AR");

  const emptyVisibility = (): SessionPackagesVisibilityPayload => ({
    landing: [],
    landingPatientV2: [],
    landingProfessional: [],
    patient: [],
    patientByMarket: { AR: [], US: [], BR: [], ES: [] },
    featuredLanding: null,
    featuredLandingPatientV2: null,
    featuredLandingProfessional: null,
    featuredPatient: null,
    featuredPatientByMarket: { AR: null, US: null, BR: null, ES: null }
  });
  const [visibilityDraft, setVisibilityDraft] = useState<SessionPackagesVisibilityPayload>(emptyVisibility);
  const [savedVisibility, setSavedVisibility] = useState<SessionPackagesVisibilityPayload>(emptyVisibility);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<SessionPackagesResponse>("/api/admin/session-packages", {}, props.token);
      setPackages(res.sessionPackages);
      const visibility = normalizeSessionPackagesVisibility(res.visibility);
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
    const byMarket = packages.filter((item) => item.market === catalogMarketView);
    const q = search.trim().toLowerCase();
    if (!q) {
      return byMarket;
    }
    return byMarket.filter((item) =>
      [item.name, item.professionalName ?? "", String(item.credits), item.paymentProvider]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [packages, catalogMarketView, search]);

  const landingIdsForView = readLandingListForSlot(visibilityDraft, landingSlotView);
  const featuredForLandingView = readFeaturedLandingForSlot(visibilityDraft, landingSlotView);

  const hasPendingVisibilityChanges =
    JSON.stringify(visibilityDraft) !== JSON.stringify(savedVisibility);

  const saveVisibility = async () => {
    setError("");
    setSuccess("");
    setSavingVisibility(true);
    try {
      const fresh = await apiRequest<SessionPackagesResponse>("/api/admin/session-packages", {}, props.token);
      const serverVis = normalizeSessionPackagesVisibility(fresh.visibility);
      const visibilityPayload = {
        ...serverVis,
        landing: visibilityDraft.landing,
        landingPatientV2: visibilityDraft.landingPatientV2,
        landingProfessional: visibilityDraft.landingProfessional,
        featuredLanding: visibilityDraft.featuredLanding,
        featuredLandingPatientV2: visibilityDraft.featuredLandingPatientV2,
        featuredLandingProfessional: visibilityDraft.featuredLandingProfessional
      };
      await apiRequest<{ visibility: SessionPackagesVisibilityPayload }>(
        "/api/admin/session-packages/visibility",
        { method: "PUT", body: JSON.stringify(visibilityPayload) },
        props.token
      );
      setSuccess(
        t(props.language, {
          es: "Publicación en landings actualizada.",
          en: "Landing publishing updated.",
          pt: "Publicacao nas landings atualizada."
        })
      );
      await load();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("session-packages-visibility", props.language, raw));
    } finally {
      setSavingVisibility(false);
    }
  };

  const toggleLandingPublished = (slot: LandingPackagesSlotId, packageId: string, checked: boolean) => {
    const channelLabel = landingSlotShortLabel(props.language, slot);
    const draftSafe = withSafeVisibility(visibilityDraft);
    const listForLimit = readLandingListForSlot(draftSafe, slot);
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
      const s = withSafeVisibility(current);
      const ids = readLandingListForSlot(s, slot);
      if (checked) {
        if (ids.includes(packageId)) {
          return s;
        }
        if (slot === "patient_main") {
          return { ...s, landing: [...ids, packageId] };
        }
        if (slot === "patient_v2") {
          return { ...s, landingPatientV2: [...ids, packageId] };
        }
        return { ...s, landingProfessional: [...ids, packageId] };
      }
      const nextIds = ids.filter((id) => id !== packageId);
      if (slot === "patient_main") {
        return {
          ...s,
          landing: nextIds,
          featuredLanding: s.featuredLanding === packageId ? null : s.featuredLanding
        };
      }
      if (slot === "patient_v2") {
        return {
          ...s,
          landingPatientV2: nextIds,
          featuredLandingPatientV2: s.featuredLandingPatientV2 === packageId ? null : s.featuredLandingPatientV2
        };
      }
      return {
        ...s,
        landingProfessional: nextIds,
        featuredLandingProfessional: s.featuredLandingProfessional === packageId ? null : s.featuredLandingProfessional
      };
    });
  };

  const setFeaturedLandingSlot = (slot: LandingPackagesSlotId, packageId: string | null) => {
    setVisibilityDraft((current) => {
      const currentSafe = withSafeVisibility(current);
      if (slot === "patient_main") {
        return { ...currentSafe, featuredLanding: packageId };
      }
      if (slot === "patient_v2") {
        return { ...currentSafe, featuredLandingPatientV2: packageId };
      }
      return { ...currentSafe, featuredLandingProfessional: packageId };
    });
  };

  const setLandingOrder = (slot: LandingPackagesSlotId, packageId: string, nextOrder: number) => {
    setVisibilityDraft((current) => {
      const currentSafe = withSafeVisibility(current);
      const currentIds = [...readLandingListForSlot(currentSafe, slot)];
      const currentIndex = currentIds.indexOf(packageId);
      const targetIndex = nextOrder - 1;
      if (currentIndex === -1 || targetIndex < 0 || targetIndex >= currentIds.length || currentIndex === targetIndex) {
        return currentSafe;
      }
      const [moved] = currentIds.splice(currentIndex, 1);
      currentIds.splice(targetIndex, 0, moved);
      if (slot === "patient_main") {
        return { ...currentSafe, landing: currentIds };
      }
      if (slot === "patient_v2") {
        return { ...currentSafe, landingPatientV2: currentIds };
      }
      return { ...currentSafe, landingProfessional: currentIds };
    });
  };

  return (
    <div className="landing-site-packages stack">
      <p className="settings-section-lead">
        {t(props.language, {
          es: "Definí qué paquetes activos se muestran en cada sitio público (landings) y en qué orden. Es independiente del portal paciente: el orden del portal se configura en «Planes y paquetes».",
          en: "Choose which active packages appear on each public site (landings) and in what order. This is independent from the patient portal; portal order is configured under Plans and packages.",
          pt: "Defina quais pacotes ativos aparecem em cada site publico (landings) e em que ordem. Independe do portal paciente."
        })}
      </p>

      <div className="package-admin-catalog-filters">
        <label className="package-admin-filter-field">
          <span className="package-admin-filter-label">
            {t(props.language, { es: "Sitio / landing", en: "Site / landing", pt: "Site / landing" })}
          </span>
          <select
            className="package-admin-filter-select"
            value={landingSlotView}
            onChange={(event) => setLandingSlotView(event.target.value as LandingPackagesSlotId)}
          >
            <option value="patient_main">{landingSlotShortLabel(props.language, "patient_main")}</option>
            <option value="patient_v2">{landingSlotShortLabel(props.language, "patient_v2")}</option>
            <option value="professional">{landingSlotShortLabel(props.language, "professional")}</option>
          </select>
        </label>
        <label className="package-admin-filter-field">
          <span className="package-admin-filter-label">
            {t(props.language, { es: "Mercado del catálogo", en: "Catalog market", pt: "Mercado do catalogo" })}
          </span>
          <select
            className="package-admin-filter-select"
            value={catalogMarketView}
            onChange={(event) => setCatalogMarketView(event.target.value as AdminMarket)}
          >
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input
        className="package-admin-search"
        type="search"
        placeholder={t(props.language, {
          es: "Buscar por nombre, profesional o sesiones",
          en: "Search by name, professional, or sessions",
          pt: "Buscar por nome, profissional ou sessoes"
        })}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? <p>{t(props.language, { es: "Cargando…", en: "Loading…", pt: "Carregando…" })}</p> : null}

      {!loading ? (
        <div className="package-admin-list-scroll">
          <div className="package-admin-list package-admin-list--landing-site">
            <div className="package-admin-list-head" aria-hidden="true">
              <span>{t(props.language, { es: "Paquete", en: "Package", pt: "Pacote" })}</span>
              <span>{t(props.language, { es: "Visible", en: "Visible", pt: "Visivel" })}</span>
              <span>{t(props.language, { es: "Orden", en: "Order", pt: "Ordem" })}</span>
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
                        <span className={"role-pill" + (item.active ? "" : " muted")}>
                          {item.active
                            ? t(props.language, { es: "Activo", en: "Active", pt: "Ativo" })
                            : t(props.language, { es: "Inactivo", en: "Inactive", pt: "Inativo" })}
                        </span>
                      </div>
                      {item.professionalName ? <p>{`${item.professionalName}`}</p> : null}
                      <strong className="package-admin-card-price">{`${item.credits} sesiones · ${item.discountPercent}% OFF`}</strong>
                    </div>
                  </div>
                </div>

                <div className="package-admin-card-channel">
                  <div className="package-admin-channel-options">
                    <button
                      type="button"
                      className={"package-admin-publish-icon-button" + (landingIdsForView.includes(item.id) ? " active" : "")}
                      aria-label={
                        landingIdsForView.includes(item.id)
                          ? t(props.language, { es: "Quitar de la landing", en: "Remove from landing", pt: "Remover da landing" })
                          : t(props.language, { es: "Mostrar en la landing", en: "Show on landing", pt: "Mostrar na landing" })
                      }
                      title={landingSlotShortLabel(props.language, landingSlotView)}
                      disabled={!item.active}
                      onClick={() => toggleLandingPublished(landingSlotView, item.id, !landingIdsForView.includes(item.id))}
                    >
                      {landingIdsForView.includes(item.id) ? "✓" : ""}
                    </button>
                  </div>
                </div>

                <div className="package-admin-card-channel package-admin-card-order-column">
                  <div className="package-admin-channel-options">
                    {landingIdsForView.includes(item.id) ? (
                      <div className="package-admin-channel-order">
                        <select
                          className="package-admin-order-select"
                          aria-label={t(props.language, { es: "Orden en la landing", en: "Order on landing", pt: "Ordem na landing" })}
                          value={String(landingIdsForView.indexOf(item.id) + 1)}
                          onChange={(event) => setLandingOrder(landingSlotView, item.id, Number(event.target.value))}
                        >
                          {landingIdsForView.map((_, index) => (
                            <option key={`ord-${index + 1}`} value={String(index + 1)}>
                              {index + 1}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={
                            "package-admin-featured-icon-button" + (featuredForLandingView === item.id ? " active" : "")
                          }
                          aria-label={t(props.language, {
                            es: "Destacado en esta landing",
                            en: "Featured on this landing",
                            pt: "Destaque nesta landing"
                          })}
                          onClick={() =>
                            setFeaturedLandingSlot(landingSlotView, featuredForLandingView === item.id ? null : item.id)
                          }
                        >
                          ★
                        </button>
                      </div>
                    ) : (
                      <span className="package-admin-order-placeholder">-</span>
                    )}
                  </div>
                </div>

                <div className="package-admin-card-actions package-admin-card-actions--placeholder" aria-hidden="true" />
              </article>
            ))}
            {filteredPackages.length === 0 ? (
              <p className="web-admin-empty-list">
                {t(props.language, {
                  es: "No hay paquetes de este mercado para mostrar.",
                  en: "No packages for this market to show.",
                  pt: "Nao ha pacotes deste mercado."
                })}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="toolbar-actions package-admin-toolbar">
        <div className="package-admin-toolbar-status">
          <span className="role-pill">{`Principal: ${visibilityDraft.landing.length}/3`}</span>
          <span className="role-pill">{`V2: ${visibilityDraft.landingPatientV2.length}/3`}</span>
          <span className="role-pill">{`Prof.: ${visibilityDraft.landingProfessional.length}/3`}</span>
          <span className="role-pill muted">{`${landingSlotShortLabel(props.language, landingSlotView)} · ${catalogMarketView}`}</span>
        </div>
        <button
          className={"primary" + (hasPendingVisibilityChanges ? " package-admin-save-pending" : "")}
          type="button"
          onClick={() => void saveVisibility()}
          disabled={savingVisibility || !hasPendingVisibilityChanges}
        >
          {savingVisibility
            ? t(props.language, { es: "Guardando…", en: "Saving…", pt: "Salvando…" })
            : hasPendingVisibilityChanges
              ? t(props.language, { es: "Guardar landings", en: "Save landings", pt: "Salvar landings" })
              : t(props.language, { es: "Landings guardadas", en: "Landings saved", pt: "Landings salvas" })}
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}
    </div>
  );
}
