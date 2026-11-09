---
name: tomar-del-design-system
description: >-
  Exige copiar color, tipo, radios, logo, fotos e íconos desde el design system
  de MotivarCare, sin dibujar ni aproximar nada a mano. Usar al implementar o
  retocar UI, íconos, SVG, menú, home, mockups o cualquier pantalla que deba
  coincidir con motivarcare.github.io o el design system 0.1.
---

# Tomar todo del design system

No dibujes nada a mano. TODO LO TENES QUE TOMAR DEL DESIGN SYSTEM.

Si el trazo, el color, el radio, la fuente o el archivo no está en la fuente de abajo, no lo inventes ni lo “parezcas”. Decí que no está y pará.

## Fuente de verdad

Repo `motivarcare/motivarcare.github.io`. Si una copia local y el repo divergen, gana el repo.

| Qué | Dónde |
|---|---|
| Spec (color, tipo, radios, íconos, movimiento) | `04-design-system/README.md` — publicado en https://motivarcare.github.io/04-design-system/ |
| Tokens | los nombres y hex de ese README (`crema`, `bosque`, `salvia`, `amarillo`, …) |
| Íconos de línea de la app | `web/public/app-usuario/index.html`, símbolos `<symbol id="i-*">` |
| Logo, Maca, mancha | los SVG publicados (`web/public/landing/img/maca.svg` y los del design system). Copiá el archivo |
| Fotos | las del design system, sin recortar ni reencuadrar a ojo |

`MuestraIconos.astro` solo muestra cuatro muestras (Referidos, Contenido, Campañas, Sesión). El menú y la home no salen de ahí.

## Cómo copiar un ícono

1. Bajá el HTML y copiá el `d` / los nodos del `<symbol>` tal cual.
2. Pintalo como el sprite: grilla 24 px, 22 px en pantalla, `fill: none`, `stroke: currentColor`, `stroke-width: 2`, `stroke-linecap` y `stroke-linejoin: round`.
3. Si el mock lo pone sobre una mancha, copiá también el `path` de esa mancha y su color/opacidad. No lo reemplaces por un círculo.

```bash
gh api repos/motivarcare/motivarcare.github.io/contents/web/public/app-usuario/index.html --jq .content | base64 -d
```

Eso necesita red (`full_network`).

## Qué es dibujar a mano

- Un `path` nuevo, uno “parecido”, o un ícono de Lucide u otra librería.
- Un hex, un radio o un grosor de trazo elegido porque se ve cerca.
- Ojos, bocas o glifos agregados a una cara que en el sistema no los tiene.
- Redibujar el logo, Maca, la onda del título o la mancha.

En una pantalla tomada de este sistema, radios y pastillas salen de sus tokens (`radio-grande` 24, `radio-medio` 18, `radio-chico` 10, `radio-pildora` 999). No los pises con otra escala.
