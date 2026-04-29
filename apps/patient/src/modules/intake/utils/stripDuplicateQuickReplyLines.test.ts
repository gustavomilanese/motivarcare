import { describe, expect, it } from "vitest";
import { stripDuplicateQuickReplyLines } from "./stripDuplicateQuickReplyLines";

describe("stripDuplicateQuickReplyLines", () => {
  const options = [
    "Ansiedad, estrés o situaciones de pánico",
    "Estado de ánimo (depresión, bajón, vacío)",
    "Relaciones, pareja, familia o duelos",
    "Trabajo, agotamiento o decisiones importantes",
    "Sueño, emociones fuertes o hábitos que te preocupan",
    "Crecimiento personal u otro motivo"
  ];

  it("quita líneas con guión ASCII cuando coinciden con quick replies", () => {
    const content = `Para arrancar: ¿qué te trae a buscar terapia?

- Ansiedad, estrés o situaciones de pánico
- Estado de ánimo (depresión, bajón, vacío)
- Relaciones, pareja, familia o duelos

Podés marcar lo que resuene.`;

    const out = stripDuplicateQuickReplyLines(content, options.slice(0, 3));

    expect(out).not.toContain("- Ansiedad");
    expect(out).toContain("Para arrancar");
    expect(out).toContain("Podés marcar");
  });

  it("tolera guiones tipográficos al inicio de viñeta", () => {
    const content =
      "¿Motivo?\n\n– Ansiedad, estrés o situaciones de pánico\n— Estado de ánimo (depresión, bajón, vacío)";
    const out = stripDuplicateQuickReplyLines(content, options);
    expect(out).toBe("¿Motivo?");
  });

  it("no borra la pregunta aunque comparta palabras con una opción", () => {
    const content = "¿Qué te trae a buscar terapia?\n\n- Ansiedad, estrés o situaciones de pánico";
    const out = stripDuplicateQuickReplyLines(content, options);
    expect(out).toContain("¿Qué te trae");
    expect(out).not.toContain("Ansiedad, estrés");
  });
});
