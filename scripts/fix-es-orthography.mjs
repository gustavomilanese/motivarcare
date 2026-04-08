#!/usr/bin/env node
/**
 * Fixes common Spanish spelling inside `es: "..."` literals (patient, professional, admin).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const APPS = ["apps/patient", "apps/professional", "apps/admin"];

/** [regex, replacement string or (match) => string] — order matters. */
const RULES = [
  [/Actualizaras\b/g, "Actualizarás"],
  [/ya no este disponible/gi, "ya no esté disponible"],
  [/ya no este \./gi, "ya no esté."],
  [/contrasena/gi, "contraseña"],
  [/\bemail valido\b/gi, "email válido"],
  [/\busa un email valido\b/gi, "usá un email válido"],
  [/\bun e-mail valido\b/g, "un e-mail válido"],
  [/\bun correo valido\b/g, "un correo válido"],
  [/archivo de imagen valido/g, "archivo de imagen válido"],
  [/\bvalido\.\b/g, "válido."],
  [/\bvalido\)/g, "válido)"],
  [/Selecciona un rango de fechas valido/g, "Selecciona un rango de fechas válido"],
  [/invalida\b/g, "inválida"],
  [/invalidos\b/g, "inválidos"],
  [/invalidas\b/g, "inválidas"],
  [/invalido\b/g, "inválido"],
  [/Perfil publico\b/g, "Perfil público"],
  [/Politica de cancelacion/g, "Política de cancelación"],
  [/Politica\b/g, "Política"],
  [/Psicologo en practicas/g, "Psicólogo en prácticas"],
  [/\bPsicologo\b/g, "Psicólogo"],
  [/\bpsicologa\b/g, "psicóloga"],
  [/\bpsicologia\b/g, "psicología"],
  [/Desde aqui\b/g, "Desde aquí"],
  [/empieza aca\b/g, "empieza acá"],
  [/Aqui ves\b/g, "Aquí ves"],
  [/Navegacion principal/g, "Navegación principal"],
  [/Abrir menu\b/g, "Abrir menú"],
  [/revision manual\b/g, "revisión manual"],
  [/Horas de cancelacion/g, "Horas de cancelación"],
  [/Horas cancelacion/g, "Horas cancelación"],
  [/Horas de cancelacion invalidas/g, "Horas de cancelación inválidas"],
  [/cancelacion\b/gi, "cancelación"],
  [/Enfoque terapeutico/g, "Enfoque terapéutico"],
  [/terapeutico\b/g, "terapéutico"],
  [/terapeutica\b/g, "terapéutica"],
  [/continuidad terapeutica\b/g, "continuidad terapéutica"],
  [/trabajo terapeutico\b/g, "trabajo terapéutico"],
  [/paso terapeutico\b/g, "paso terapéutico"],
  [/formacion del/g, "formación del"],
  [/formacion y/g, "formación y"],
  [/Su educacion\b/g, "Su educación"],
  [/video presentacion\b/g, "video presentación"],
  [/Video presentacion\b/g, "Video presentación"],
  [/URL video de presentacion/g, "URL video de presentación"],
  [/URL video presentacion/g, "URL video de presentación"],
  [/Una tarjeta de video presentacion/g, "Una tarjeta de video presentación"],
  [/representacion en\b/g, "representación en"],
  [/su representacion\b/g, "su representación"],
  [/Reservo sesion/g, "Reservó sesión"],
  [/Detalle de sesion\b/g, "Detalle de sesión"],
  [/Reprogramar sesion\b/g, "Reprogramar sesión"],
  [/Reserva de sesion\b/g, "Reserva de sesión"],
  [/Modificar sesion/g, "Modificar sesión"],
  [/Sesion de prueba/g, "Sesión de prueba"],
  [/sesion de prueba/g, "sesión de prueba"],
  [/sesion virtual\b/g, "sesión virtual"],
  [/sesion online/g, "sesión online"],
  [/Paciente en una sesion/g, "Paciente en una sesión"],
  [/Paciente en sesion/g, "Paciente en sesión"],
  [/Precio por una sesion\b/g, "Precio por una sesión"],
  [/Precio por sesion\b/g, "Precio por sesión"],
  [/por una sesion\b/g, "por una sesión"],
  [/por 50 min\. sesion\b/g, "por 50 min. sesión"],
  [/por sesion\b/g, "por sesión"],
  [/tu primera sesion\b/g, "tu primera sesión"],
  [/La paz viene\b/g, "La paz viene"],
  [/primera sesion ya agendada/g, "primera sesión ya agendada"],
  [/nueva sesion\b/g, "nueva sesión"],
  [/Nueva sesion\b/g, "Nueva sesión"],
  [/lo vemos en la sesion\b/g, "lo vemos en la sesión"],
  [/para esta sesion\b/g, "para esta sesión"],
  [/la sesion\b/g, "la sesión"],
  [/La sesion\b/g, "La sesión"],
  [/\{n\} sesion\b/g, "{n} sesión"],
  [/\{count\} sesion\b/g, "{count} sesión"],
  [/en esta conversacion\b/g, "en esta conversación"],
  [/En esta conversacion\b/g, "En esta conversación"],
  [/tarjeta de sesion\b/g, "tarjeta de sesión"],
  [/lo vemos en la sesion/g, "lo vemos en la sesión"],
  [/gestion\b/g, "gestión"],
  [/administracion\b/g, "administración"],
  [/Cuantas\b/g, "Cuántas"],
  [/Cual es\b/g, "Cuál es"],
  [/Indique desde que ano\b/g, "Indique desde qué año"],
  [/ano ejerce\b/g, "año ejerce"],
  [/anos acompanando\b/g, "años acompañando"],
  [/anos de experiencia\b/g, "años de experiencia"],
  [/\bAnos de experiencia\b/g, "Años de experiencia"],
  [/Anos de experiencia invalidos/g, "Años de experiencia inválidos"],
  [/Horas de practica\b/g, "Horas de práctica"],
  [/horas de practica\b/g, "horas de práctica"],
  [/1 000\+ horas de practica/g, "1 000+ horas de práctica"],
  [/5 000\+ horas de practica/g, "5 000+ horas de práctica"],
  [/de practica\b/g, "de práctica"],
  [/practica privada\b/g, "práctica privada"],
  [/Practica privada\b/g, "Práctica privada"],
  [/su practica\b/g, "su práctica"],
  [/tu practica\b/g, "tu práctica"],
  [/mi practica\b/g, "mi práctica"],
  [/desarrollar su practica\b/g, "desarrollar su práctica"],
  [/Proba quitando\b/g, "Probá quitando"],
  [/prueba quitando\b/g, "prueba quitando"],
  [/opcion de abajo\b/g, "opción de abajo"],
  [/la opcion /g, "la opción "],
  [/el numero de\b/g, "el número de"],
  [/numero de sesiones/g, "número de sesiones"],
  [/comision\b/g, "comisión"],
  [/realizan mas de\b/g, "realizan más de"],
  [/mas de 40 sesiones\b/g, "más de 40 sesiones"],
  [/6 o mas caracteres\b/g, "6 o más caracteres"],
  [/\bmas liviana\b/g, "más liviana"],
  [/\bmas de\b/gi, "más de"],
  [/pagaran\b/g, "pagarán"],
  [/\bCerrar sesion\b/g, "Cerrar sesión"],
  [/\bProxima\b/g, "Próxima"],
  [/\bTodavia\b/g, "Todavía"],
  [/\bcreditos\b/g, "créditos"],
  [/\bCredito\b/g, "Crédito"],
  [/\bcredito\b/g, "crédito"],
  [/en el periodo\b/g, "en el período"],
  [/\bel periodo\b/g, "el período"],
  [/\bperiodo\b/g, "período"],
  [/\bpagina\b/gi, (m) => (m[0][0] === "P" ? "Página" : "página")],
  [/equivale a \{amount\} por sesion/g, "equivale a {amount} por sesión"],
  [/Ya valide\b/g, "Ya validé"],
  [/videollamada para esta sesion/g, "videollamada para esta sesión"],
  [/actualiza la pagina\b/g, "actualiza la página"]
];

function fixSpanishSegment(seg) {
  let s = seg;
  for (const [re, rep] of RULES) {
    s = typeof rep === "function" ? s.replace(re, rep) : s.replace(re, rep);
  }
  s = s.replace(/\bsesion\b/g, "sesión");
  s = s.replace(/\bSesion\b/g, "Sesión");
  // "sesiones" stays (correct Spanish plural of sesión)
  s = s.replace(/\bano\b/g, "año");
  s = s.replace(/\bAno\b/g, "Año");
  s = s.replace(/\banos\b/g, "años");
  s = s.replace(/\bAnos\b/g, "Años");
  return s;
}

function* walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "build") continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) yield* walkDir(full);
    else if (/\.(tsx?|jsx?)$/.test(name)) yield full;
  }
}

function processFile(filePath) {
  let text = fs.readFileSync(filePath, "utf8");
  const original = text;
  text = text.replace(/(es:\s*)(")((?:\\.|[^"\\])*)(")/gs, (_, prefix, _q1, inner, _q4) => prefix + '"' + fixSpanishSegment(inner) + '"');
  if (text !== original) {
    fs.writeFileSync(filePath, text, "utf8");
    return true;
  }
  return false;
}

let touched = 0;
for (const app of APPS) {
  for (const f of walkDir(path.join(ROOT, app))) {
    if (processFile(f)) touched++;
  }
}
console.log(`Updated ${touched} files.`);
