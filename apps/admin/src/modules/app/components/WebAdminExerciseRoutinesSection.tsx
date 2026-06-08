import { type FormEvent, useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { CollapsiblePageSection } from "./CollapsiblePageSection";
import { adminSurfaceMessage } from "../lib/friendlyAdminSurfaceMessages";
import { apiRequest } from "../services/api";
import type { AdminExercise, AdminExerciseRoutine } from "../types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

function emptyRoutine(exercises: AdminExercise[]): Omit<AdminExerciseRoutine, "id"> {
  const published = exercises.filter((exercise) => exercise.status === "published");
  return {
    slug: "",
    title: "",
    summary: "",
    description: "",
    emoji: "🧭",
    exerciseIds: published.slice(0, 2).map((exercise) => exercise.id),
    tags: [],
    status: "published",
    featured: false,
    publishedAt: new Date().toISOString().slice(0, 10),
    sortOrder: 100
  };
}

export function WebAdminExerciseRoutinesSection(props: {
  language: AppLanguage;
  token: string;
  exercises: AdminExercise[];
  routines: AdminExerciseRoutine[];
  onReload: () => Promise<void>;
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
}) {
  const { language, token, exercises, routines, onReload, setError, setSuccess } = props;
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Omit<AdminExerciseRoutine, "id">>(() => emptyRoutine(exercises));

  const publishedExercises = useMemo(
    () => exercises.filter((exercise) => exercise.status === "published"),
    [exercises]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const sorted = [...routines].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    if (!query) return sorted;
    return sorted.filter((routine) =>
      [routine.title, routine.slug, routine.summary, routine.description, routine.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [routines, search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyRoutine(exercises));
    setModalOpen(true);
  }

  function openEdit(routine: AdminExerciseRoutine) {
    setEditingId(routine.id);
    setForm({ ...routine });
    setModalOpen(true);
  }

  function toggleExerciseInForm(exerciseId: string) {
    setForm((current) => {
      const exists = current.exerciseIds.includes(exerciseId);
      if (exists) {
        return { ...current, exerciseIds: current.exerciseIds.filter((id) => id !== exerciseId) };
      }
      return { ...current, exerciseIds: [...current.exerciseIds, exerciseId] };
    });
  }

  function moveExerciseInForm(exerciseId: string, direction: -1 | 1) {
    setForm((current) => {
      const index = current.exerciseIds.indexOf(exerciseId);
      if (index < 0) return current;
      const target = index + direction;
      if (target < 0 || target >= current.exerciseIds.length) return current;
      const next = [...current.exerciseIds];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...current, exerciseIds: next };
    });
  }

  async function saveRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.title.trim().length < 3) {
      setError(t(language, { es: "El título es muy corto.", en: "Title is too short.", pt: "Título muito curto." }));
      return;
    }
    if (form.exerciseIds.length < 2) {
      setError(
        t(language, {
          es: "Elegí al menos 2 ejercicios para la rutina.",
          en: "Pick at least 2 exercises for the routine.",
          pt: "Escolha pelo menos 2 exercícios para a rotina."
        })
      );
      return;
    }

    const payload = {
      ...form,
      tags: form.tags.filter((tag) => tag.trim().length > 0)
    };

    try {
      if (editingId) {
        await apiRequest(
          `/api/admin/web-content/exercise-routines/${editingId}`,
          { method: "PUT", body: JSON.stringify(payload) },
          token
        );
      } else {
        await apiRequest("/api/admin/web-content/exercise-routines", { method: "POST", body: JSON.stringify(payload) }, token);
      }
      setSuccess(t(language, { es: "Rutina guardada.", en: "Routine saved.", pt: "Rotina salva." }));
      setModalOpen(false);
      await onReload();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-exercise-save", language, raw));
    }
  }

  async function removeRoutine(routineId: string) {
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/api/admin/web-content/exercise-routines/${routineId}`, { method: "DELETE" }, token);
      setSuccess(t(language, { es: "Rutina eliminada.", en: "Routine deleted.", pt: "Rotina excluída." }));
      await onReload();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-exercise-delete", language, raw));
    }
  }

  async function seedDefaultRoutines() {
    setError("");
    setSuccess("");
    const confirmed = window.confirm(
      t(language, {
        es: "Vas a importar 4 rutinas de ejemplo (requiere ejercicios ya cargados). ¿Continuar?",
        en: "You will import 4 sample routines (requires exercises already loaded). Continue?",
        pt: "Vai importar 4 rotinas de exemplo (requer exercícios já carregados). Continuar?"
      })
    );
    if (!confirmed) return;
    try {
      const response = await apiRequest<{ imported: number }>(
        "/api/admin/web-content/exercise-routines/seed-defaults",
        { method: "POST", body: JSON.stringify({}) },
        token
      );
      setSuccess(
        t(language, {
          es: `Rutinas importadas: ${response.imported}.`,
          en: `Routines imported: ${response.imported}.`,
          pt: `Rotinas importadas: ${response.imported}.`
        })
      );
      await onReload();
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : "";
      setError(adminSurfaceMessage("web-admin-exercise-save", language, raw));
    }
  }

  return (
    <>
      <CollapsiblePageSection
        sectionId="web-rutinas-ejercicios"
        summary={t(language, {
          es: `Rutinas (${routines.length})`,
          en: `Routines (${routines.length})`,
          pt: `Rotinas (${routines.length})`
        })}
        bodyExtraClass="finance-collapsible-body--stack"
      >
        <p className="settings-section-lead">
          {t(language, {
            es: "Secuencias ordenadas de ejercicios que el paciente recorre de punta a punta (sidebar + siguiente paso).",
            en: "Ordered exercise sequences patients follow start to finish (sidebar + next step).",
            pt: "Sequências ordenadas de exercícios que o paciente percorre do início ao fim."
          })}
        </p>
        <p className="web-admin-helper-note">
          {t(language, {
            es: "Primero publicá ejercicios individuales; después armá rutinas eligiendo el orden. Nada se muestra en el portal hasta que esté publicado en admin.",
            en: "Publish individual exercises first, then build routines by ordering them. Nothing shows on the portal until published in admin.",
            pt: "Publique exercícios individuais primeiro; depois monte rotinas definindo a ordem."
          })}
        </p>
        <div className="web-admin-list-toolbar">
          <input
            type="search"
            placeholder={t(language, { es: "Buscar rutina", en: "Search routine", pt: "Buscar rotina" })}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="secondary" type="button" onClick={() => void seedDefaultRoutines()} disabled={publishedExercises.length === 0}>
            {t(language, { es: "Importar plantilla", en: "Import template", pt: "Importar modelo" })}
          </button>
          <button className="primary" type="button" onClick={openCreate} disabled={publishedExercises.length < 2}>
            {t(language, { es: "Nueva rutina", en: "New routine", pt: "Nova rotina" })}
          </button>
        </div>
        <div className="stack web-admin-scroll-list">
          {filtered.length === 0 ? (
            <p className="web-admin-empty-list">
              {t(language, {
                es: "Sin rutinas todavía. Creá una o importá la plantilla.",
                en: "No routines yet. Create one or import the template.",
                pt: "Sem rotinas ainda. Crie uma ou importe o modelo."
              })}
            </p>
          ) : (
            filtered.map((routine) => (
              <article className="user-card web-admin-row-card" key={routine.id}>
                <header>
                  <h3>
                    <span aria-hidden style={{ marginRight: 8 }}>
                      {routine.emoji}
                    </span>
                    {routine.title}
                  </h3>
                  <span className="role-pill">{routine.status}</span>
                </header>
                <p>{routine.summary}</p>
                <div className="user-card-footer">
                  <small>
                    {routine.exerciseIds.length}{" "}
                    {t(language, { es: "ejercicios", en: "exercises", pt: "exercícios" })}
                    {routine.featured ? " · ★" : ""}
                  </small>
                  <div className="package-admin-icon-actions">
                    <button className="package-admin-icon-button" type="button" onClick={() => openEdit(routine)}>
                      ✏️
                    </button>
                    <button className="package-admin-icon-button danger" type="button" onClick={() => void removeRoutine(routine.id)}>
                      🗑
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </CollapsiblePageSection>

      {modalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setModalOpen(false)}>
          <div className="modal-card modal-card-wide" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>{editingId ? t(language, { es: "Editar rutina", en: "Edit routine", pt: "Editar rotina" }) : t(language, { es: "Nueva rutina", en: "New routine", pt: "Nova rotina" })}</h3>
            <form className="stack" onSubmit={(event) => void saveRoutine(event)}>
              <label>
                Título
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
              </label>
              <label>
                Slug
                <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} required />
              </label>
              <label>
                Emoji
                <input value={form.emoji} onChange={(event) => setForm((current) => ({ ...current, emoji: event.target.value }))} maxLength={8} />
              </label>
              <label>
                Resumen
                <textarea value={form.summary} rows={2} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} required />
              </label>
              <label>
                Descripción
                <textarea value={form.description} rows={4} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
              </label>
              <fieldset>
                <legend>{t(language, { es: "Ejercicios en orden", en: "Exercises in order", pt: "Exercícios em ordem" })}</legend>
                <div className="stack">
                  {form.exerciseIds.map((exerciseId, index) => {
                    const exercise = exercises.find((item) => item.id === exerciseId);
                    if (!exercise) return null;
                    return (
                      <div className="web-admin-row-card" key={exerciseId} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span>{index + 1}.</span>
                        <span>{exercise.emoji}</span>
                        <strong style={{ flex: 1 }}>{exercise.title}</strong>
                        <button type="button" className="secondary" onClick={() => moveExerciseInForm(exerciseId, -1)} disabled={index === 0}>
                          ↑
                        </button>
                        <button type="button" className="secondary" onClick={() => moveExerciseInForm(exerciseId, 1)} disabled={index === form.exerciseIds.length - 1}>
                          ↓
                        </button>
                        <button type="button" className="secondary danger" onClick={() => toggleExerciseInForm(exerciseId)}>
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="stack" style={{ marginTop: 12 }}>
                  {publishedExercises
                    .filter((exercise) => !form.exerciseIds.includes(exercise.id))
                    .map((exercise) => (
                      <button key={exercise.id} type="button" className="secondary" onClick={() => toggleExerciseInForm(exercise.id)}>
                        + {exercise.title}
                      </button>
                    ))}
                </div>
              </fieldset>
              <div className="form-row">
                <label>
                  Estado
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as "draft" | "published" }))}>
                    <option value="published">published</option>
                    <option value="draft">draft</option>
                  </select>
                </label>
                <label>
                  Orden
                  <input type="number" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} />
                </label>
                <label>
                  Publicado
                  <input type="date" value={form.publishedAt} onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))} />
                </label>
              </div>
              <label className="checkbox-inline">
                <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} />
                Destacada
              </label>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
