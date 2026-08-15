# Backlog — Reportes del profesional

Fecha: 2026-08-15  
Estado: **aparado a propósito**. La ruta `/reportes` sigue viva, pero ya no está en el menú principal (sidebar / bottom nav). El acceso quedó en el menú `...` del header.

Volver acá cuando se defina el producto, no para “mejorar la página actual” sin un catálogo.

## Qué hay hoy (implementado, no es un producto de reportes)

1. **Resúmenes IA del chat de acompañamiento (Maca / treatment chat)** — `/reportes` (`TreatmentReportsPage`, PR-T4).
   - Lista pacientes con consentimiento activo.
   - Resumen semanal + histórico generado por LLM.
   - Banderas de safety.
   - Vacío si no hay consentimiento, el chat está apagado, o no hay mensajes.
   - Experimental. No es informe clínico, no se exporta, no hay PDF.

2. **Informes del diario emocional** — el paciente arma un informe de entradas y lo envía al profesional.
   - Dashboard: bloque “Informes del diario” (solo si hay envíos recientes).
   - Ficha del paciente: `?diaryReport=1`.
   - No vive en `/reportes`.

3. **Exports de finanzas** (Excel de sesiones ejecutadas, impagos admin, etc.).
   - Operación / admin. No es el ítem “Reportes” del portal profesional.

## Qué no está definido

No hay catálogo acordado de “qué reportes se pueden sacar”. Falta decidir, entre otras:

- Informe clínico / notas de sesión (¿existe? ¿quién lo escribe? ¿PDF?)
- Progreso / asistencia / adherencia
- Export para el paciente vs solo para el profesional
- Relación entre diario, chat Maca y `/reportes`
- Si `/reportes` se queda como resúmenes de chat o se reemplaza por otra cosa

Hasta que eso esté escrito, no ampliar `/reportes` ni volver a ponerlo en el menú principal.

## Cuando se retome

1. Definir 3–5 reportes que importan (nombre, audiencia, datos, formato).
2. Separar lo que ya existe (diario, chat IA, finanzas) de lo que hay que construir.
3. Recién ahí: UX, nav (¿menú principal otra vez?) y alcance técnico.
