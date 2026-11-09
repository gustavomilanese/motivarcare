---
name: componentizar-modular
description: >-
  Parte pantallas, lógica y CSS en módulos chicos y reutilizables antes de
  escribir o seguir editando. Usar siempre al implementar o retocar UI,
  componentes, hooks, estilos, páginas o cualquier archivo que crece.
  Componentizar, extraer, modular, reutilizar, archivos grandes, monolito.
---

# Componentizar: módulos chicos y reutilizables

Antes de agregar código, partí. Un archivo = una responsabilidad. Si el cambio no entra sin inflar el archivo, extraé primero.

## Límites

- Componente de UI: alrededor de **200 líneas**. Si pasa, partilo en la misma tarea.
- Página o contenedor: solo compone. La carga de datos va a un hook. El formato de la vista, a una función o hook aparte.
- CSS de una pantalla: un archivo por zona (layout, lista, formulario, panel). El entrypoint solo hace `@import`.
- No sigas un archivo que ya supera esas líneas. El próximo cambio sale a un archivo nuevo.

## Cómo partir

1. Buscá si ya existe un componente, hook o control (`@therapy/ui`, la app) y reutilizalo.
2. Cada bloque de UI con nombre propio va a su archivo: encabezado, lista, ítem, compositor, panel, modal.
3. El estado remoto y los efectos van a `hooks/`. Lo puro (fechas, armado de lista) va a `lib/`.
4. El CSS del bloque nuevo vive junto a la feature, no en `legacy.css` ni inline en el TSX.
5. Exportá el componente con props claras para que otra pantalla pueda usarlo.

## Al terminar

El archivo que tocaste no quedó más grande de lo necesario. La pantalla se lee como una lista de componentes, no como un bloque de markup.
