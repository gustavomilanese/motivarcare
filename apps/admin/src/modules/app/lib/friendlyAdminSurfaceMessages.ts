import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function softNetworkOrHttp(language: AppLanguage, raw: string): string | null {
  const n = raw.trim();
  if (/Cannot reach API at/i.test(n)) {
    return t(language, {
      es: "No pudimos conectar con el servidor. Revisá la red o reintentá en unos segundos.",
      en: "We couldn’t reach the server. Check the network or try again shortly.",
      pt: "Nao foi possivel conectar ao servidor. Verifique a rede e tente novamente."
    });
  }
  if (n.startsWith("HTTP ")) {
    return t(language, {
      es: "El servicio tardó más de lo esperado. Reintentá; si sigue fallando, avisá al equipo técnico.",
      en: "The service took longer than expected. Retry; if it keeps failing, ping your tech team.",
      pt: "O servico demorou. Tente de novo; se persistir, avise a equipe tecnica."
    });
  }
  return null;
}

export function adminAuthSurfaceMessage(raw: string, language: AppLanguage): string {
  const n = raw.trim();
  const net = softNetworkOrHttp(language, n);
  if (net) {
    return net;
  }
  if (n === "Invalid credentials") {
    return t(language, {
      es: "El email o la contraseña no coinciden. Revisá mayúsculas o recuperá acceso si hace falta.",
      en: "Email or password doesn’t match. Check caps or use password recovery if needed.",
      pt: "Email ou senha nao confere. Verifique maiusculas ou recupere o acesso."
    });
  }
  if (n === "Email already in use") {
    return t(language, {
      es: "Ese email ya está registrado. Iniciá sesión o usá otro correo para crear la cuenta admin.",
      en: "That email is already registered. Sign in or use another address for this admin account.",
      pt: "Esse email ja esta cadastrado. Entre ou use outro endereco."
    });
  }
  if (n === "Unauthorized" || n === "Invalid or expired token") {
    return t(language, {
      es: "Tu sesión venció. Volvé a iniciar sesión en la consola admin.",
      en: "Your session expired. Sign in to the admin console again.",
      pt: "Sua sessao expirou. Entre novamente na console admin."
    });
  }
  if (n === "User account is disabled") {
    return t(language, {
      es: "Esta cuenta está desactivada. Contactá a un administrador de MotivarCare.",
      en: "This account is disabled. Contact a MotivarCare administrator.",
      pt: "Esta conta esta desativada. Fale com um administrador."
    });
  }
  if (/[^\x00-\x7F]/.test(n) || n.length >= 48) {
    return n;
  }
  return t(language, {
    es: "No pudimos completar el acceso. Revisá los datos o probá de nuevo en un momento.",
    en: "We couldn’t complete sign-in. Check your details or try again shortly.",
    pt: "Nao foi possivel concluir o acesso. Confira os dados ou tente em instantes."
  });
}

export type AdminSurfaceContext =
  | "users-list-load"
  | "users-create"
  | "users-update"
  | "users-delete"
  | "session-packages-load"
  | "session-packages-visibility"
  | "session-packages-save"
  | "session-packages-status"
  | "session-packages-delete"
  | "portal-hero-load"
  | "portal-hero-asset-load"
  | "portal-hero-asset-save"
  | "web-admin-load"
  | "web-admin-save"
  | "web-admin-image-load"
  | "web-admin-review-save"
  | "web-admin-review-delete"
  | "web-admin-blog-image-load"
  | "web-admin-blog-save"
  | "web-admin-blog-delete"
  | "web-admin-exercise-save"
  | "web-admin-exercise-delete"
  | "prof-ops-list"
  | "prof-ops-bookings"
  | "prof-ops-update"
  | "prof-ops-slot-create"
  | "prof-ops-slot-delete"
  | "prof-ops-session-update"
  | "sessions-ops-load"
  | "sessions-ops-update"
  | "patients-ops-load"
  | "patients-create"
  | "patients-sessions-load"
  | "patients-package-create"
  | "patients-package-update"
  | "patients-credits"
  | "patients-active-pro"
  | "patients-update"
  | "patients-booking-update"
  | "patients-cancel"
  | "patients-trial-cancel"
  | "patients-reactivate"
  | "patients-triage"
  | "admin-kpis-load"
  | "finance-overview-load"
  | "finance-run-detail"
  | "finance-rules-save"
  | "finance-payout-create"
  | "finance-mark-paid"
  | "finance-close-run"
  | "finance-stripe-retry";

const SURFACE: Record<AdminSurfaceContext, LocalizedText> = {
  "users-list-load": {
    es: "No cargó el listado de usuarios. Refrescá o ajustá filtros y reintentá.",
    en: "User list didn’t load. Refresh or tweak filters and retry.",
    pt: "A lista de usuarios nao carregou. Atualize ou ajuste os filtros."
  },
  "users-create": {
    es: "No creamos el usuario. Revisá los campos obligatorios y el rol; si el email ya existe, editá la cuenta existente.",
    en: "User wasn’t created. Check required fields and role; if the email exists, edit that account instead.",
    pt: "O usuario nao foi criado. Confira campos e papel; se o email existir, edite a conta."
  },
  "users-update": {
    es: "Los cambios no se guardaron. Revisá valores numéricos y volvé a guardar.",
    en: "Changes didn’t save. Check numeric fields and save again.",
    pt: "As alteracoes nao foram salvas. Confira numeros e salve de novo."
  },
  "users-delete": {
    es: "No pudimos eliminar o desactivar el usuario. Cerrá el modal y reintentá; si hay sesiones activas, el sistema puede bloquear el borrado.",
    en: "We couldn’t delete or disable the user. Close the modal and retry; active sessions may block deletion.",
    pt: "Nao foi possivel excluir ou desativar. Feche o modal e tente de novo."
  },
  "session-packages-load": {
    es: "No cargaron los paquetes de sesiones. Actualizá la página.",
    en: "Session packages didn’t load. Refresh the page.",
    pt: "Os pacotes de sessoes nao carregaram. Atualize a pagina."
  },
  "session-packages-visibility": {
    es: "No se actualizó la visibilidad del paquete. Reintentá o revisá el límite de 3 publicados por canal.",
    en: "Package visibility didn’t update. Retry or check the 3-published limit per channel.",
    pt: "A visibilidade do pacote nao atualizou. Tente de novo ou verifique o limite."
  },
  "session-packages-save": {
    es: "No guardamos el paquete. Revisá nombre, sesiones y descuento, y guardá otra vez.",
    en: "Package didn’t save. Check name, sessions, and discount, then save again.",
    pt: "O pacote nao foi salvo. Confira nome, sessoes e desconto."
  },
  "session-packages-status": {
    es: "No se actualizó el estado del paquete. Reintentá en unos segundos.",
    en: "Package status didn’t update. Retry in a few seconds.",
    pt: "O status do pacote nao atualizou. Tente em instantes."
  },
  "session-packages-delete": {
    es: "No pudimos borrar el paquete. Si sigue en la lista, refrescá o despublicá primero.",
    en: "We couldn’t delete the package. Refresh or unpublish it first if it still appears.",
    pt: "Nao foi possivel excluir o pacote. Atualize ou despublique antes."
  },
  "portal-hero-load": {
    es: "No cargó la configuración del hero del portal. Reintentá.",
    en: "Portal hero settings didn’t load. Retry.",
    pt: "As configuracoes do hero nao carregaram. Tente de novo."
  },
  "portal-hero-asset-load": {
    es: "No pudimos cargar esa imagen. Probá otro archivo (JPG/PNG, tamaño razonable).",
    en: "We couldn’t load that image. Try another file (JPG/PNG, reasonable size).",
    pt: "Nao foi possivel carregar a imagem. Tente outro arquivo."
  },
  "portal-hero-asset-save": {
    es: "No guardamos la imagen del hero. Revisá formato y tamaño y subila otra vez.",
    en: "Hero image didn’t save. Check format and size and upload again.",
    pt: "A imagem do hero nao foi salva. Verifique formato e tamanho."
  },
  "web-admin-load": {
    es: "No cargó el contenido web. Refrescá la consola.",
    en: "Web content didn’t load. Refresh the console.",
    pt: "O conteudo web nao carregou. Atualize a console."
  },
  "web-admin-save": {
    es: "No se guardaron los ajustes web. Reintentá sin cerrar la pestaña.",
    en: "Web settings didn’t save. Retry without closing the tab.",
    pt: "As configuracoes web nao foram salvas. Tente de novo."
  },
  "web-admin-image-load": {
    es: "No pudimos cargar la imagen. Elegí otro archivo.",
    en: "We couldn’t load the image. Pick another file.",
    pt: "Nao foi possivel carregar a imagem. Escolha outro arquivo."
  },
  "web-admin-review-save": {
    es: "No guardamos la review. Revisá nombre, fecha, foto y texto, y guardá de nuevo.",
    en: "Review didn’t save. Check name, date, photo, and text, then save again.",
    pt: "A avaliacao nao foi salva. Confira nome, data, foto e texto."
  },
  "web-admin-review-delete": {
    es: "No pudimos eliminar la review. Actualizá la lista y reintentá.",
    en: "We couldn’t delete the review. Refresh the list and retry.",
    pt: "Nao foi possivel excluir a avaliacao. Atualize a lista."
  },
  "web-admin-blog-image-load": {
    es: "No cargó la imagen del post. Probá otra imagen.",
    en: "Post image didn’t load. Try another image.",
    pt: "A imagem do post nao carregou. Tente outra."
  },
  "web-admin-blog-save": {
    es: "No guardamos el artículo. Revisá título y cuerpo y publicá de nuevo.",
    en: "Article didn’t save. Check title and body and publish again.",
    pt: "O artigo nao foi salvo. Confira titulo e corpo."
  },
  "web-admin-blog-delete": {
    es: "No pudimos borrar el artículo. Refrescá y reintentá.",
    en: "We couldn’t delete the article. Refresh and retry.",
    pt: "Nao foi possivel excluir o artigo. Atualize e tente."
  },
  "web-admin-exercise-save": {
    es: "No guardamos el ejercicio. Revisá título, slug, descripción y pasos y reintentá.",
    en: "Exercise didn’t save. Check title, slug, description and steps and retry.",
    pt: "O exercício não foi salvo. Confira título, slug, descrição e passos."
  },
  "web-admin-exercise-delete": {
    es: "No pudimos borrar el ejercicio. Refrescá y reintentá.",
    en: "We couldn’t delete the exercise. Refresh and retry.",
    pt: "Não foi possível excluir o exercício. Atualize e tente."
  },
  "prof-ops-list": {
    es: "No cargó el listado de profesionales. Reintentá.",
    en: "Professionals list didn’t load. Retry.",
    pt: "A lista de profissionais nao carregou. Tente de novo."
  },
  "prof-ops-bookings": {
    es: "No cargaron las reservas de ese profesional. Volvé a abrir la ficha o refrescá.",
    en: "That professional’s bookings didn’t load. Reopen the row or refresh.",
    pt: "As reservas desse profissional nao carregaram. Reabra a linha."
  },
  "prof-ops-update": {
    es: "No guardamos los datos del profesional. Revisá rangos numéricos y reintentá.",
    en: "Professional data didn’t save. Check numeric ranges and retry.",
    pt: "Os dados do profissional nao foram salvos. Confira os numeros."
  },
  "prof-ops-slot-create": {
    es: "No creamos el horario. Revisá fecha, hora y que no choque con otra reserva.",
    en: "Slot wasn’t created. Check date and time and avoid conflicts.",
    pt: "O horario nao foi criado. Confira data e hora e conflitos."
  },
  "prof-ops-slot-delete": {
    es: "No pudimos borrar el horario. Refrescá la grilla y probá otra vez.",
    en: "We couldn’t delete the slot. Refresh the grid and try again.",
    pt: "Nao foi possivel remover o horario. Atualize a grade."
  },
  "prof-ops-session-update": {
    es: "No actualizamos la sesión. Reintentá o abrí el detalle de nuevo.",
    en: "Session wasn’t updated. Retry or reopen the detail.",
    pt: "A sessao nao foi atualizada. Tente de novo."
  },
  "sessions-ops-load": {
    es: "No cargó el listado de sesiones. Ajustá filtros o refrescá.",
    en: "Sessions list didn’t load. Adjust filters or refresh.",
    pt: "A lista de sessoes nao carregou. Ajuste filtros ou atualize."
  },
  "sessions-ops-update": {
    es: "No guardamos el cambio en la sesión. Reintentá.",
    en: "Session change didn’t save. Retry.",
    pt: "A alteracao na sessao nao foi salva. Tente de novo."
  },
  "patients-ops-load": {
    es: "No cargó la operativa de pacientes. Actualizá la página.",
    en: "Patient operations didn’t load. Refresh the page.",
    pt: "A operacao de pacientes nao carregou. Atualize a pagina."
  },
  "patients-create": {
    es: "No creamos el paciente. Revisá email, nombre y zona horaria.",
    en: "Patient wasn’t created. Check email, name, and timezone.",
    pt: "O paciente nao foi criado. Confira email, nome e fuso."
  },
  "patients-sessions-load": {
    es: "No cargaron las sesiones del paciente. Reintentá.",
    en: "Patient sessions didn’t load. Retry.",
    pt: "As sessoes do paciente nao carregaram. Tente de novo."
  },
  "patients-package-create": {
    es: "No creamos el paquete de créditos. Revisá créditos y precio (enteros válidos).",
    en: "Credit package wasn’t created. Check credits and price (valid integers).",
    pt: "O pacote de creditos nao foi criado. Confira creditos e preco."
  },
  "patients-package-update": {
    es: "No actualizamos el paquete. Reintentá.",
    en: "Package wasn’t updated. Retry.",
    pt: "O pacote nao foi atualizado. Tente de novo."
  },
  "patients-credits": {
    es: "No ajustamos los créditos. Verificá que el ajuste sea un entero distinto de cero.",
    en: "Credits weren’t adjusted. Use a non-zero integer.",
    pt: "Os creditos nao foram ajustados. Use um inteiro diferente de zero."
  },
  "patients-active-pro": {
    es: "No actualizamos el profesional activo. Reintentá.",
    en: "Active professional wasn’t updated. Retry.",
    pt: "O profissional ativo nao foi atualizado. Tente de novo."
  },
  "patients-update": {
    es: "No guardamos los datos del paciente. Revisá campos y reintentá.",
    en: "Patient data didn’t save. Check fields and retry.",
    pt: "Os dados do paciente nao foram salvos. Confira os campos."
  },
  "patients-booking-update": {
    es: "No actualizamos la reserva. Refrescá y abrí el borrador otra vez.",
    en: "Booking wasn’t updated. Refresh and reopen the draft.",
    pt: "A reserva nao foi atualizada. Atualize e reabra o rascunho."
  },
  "patients-cancel": {
    es: "No cancelamos la sesión. Verificá la frase de confirmación o reintentá.",
    en: "Session wasn’t cancelled. Check the confirmation phrase or retry.",
    pt: "A sessao nao foi cancelada. Confirme a frase ou tente de novo."
  },
  "patients-trial-cancel": {
    es: "No cancelamos la sesión de prueba. Reintentá.",
    en: "Trial session wasn’t cancelled. Retry.",
    pt: "A sessao de teste nao foi cancelada. Tente de novo."
  },
  "patients-reactivate": {
    es: "No reactivamos la sesión. Reintentá o revisá el estado actual.",
    en: "Session wasn’t reactivated. Retry or check current status.",
    pt: "A sessao nao foi reativada. Tente de novo."
  },
  "patients-triage": {
    es: "No guardamos el triage. Reintentá.",
    en: "Triage didn’t save. Retry.",
    pt: "O triage nao foi salvo. Tente de novo."
  },
  "admin-kpis-load": {
    es: "No cargaron los KPIs de ese mes. Probá otro mes o refrescá.",
    en: "KPIs for that month didn’t load. Try another month or refresh.",
    pt: "Os KPIs desse mes nao carregaram. Tente outro mes."
  },
  "finance-overview-load": {
    es: "No cargó el panel de finanzas (reglas, resumen u operaciones). Reintentá.",
    en: "Finance dashboard didn’t load (rules, overview, or ops). Retry.",
    pt: "O painel financeiro nao carregou. Tente de novo."
  },
  "finance-run-detail": {
    es: "No cargó el detalle de la liquidación. Volvé a la lista y abrila otra vez.",
    en: "Payout run detail didn’t load. Go back to the list and open it again.",
    pt: "O detalhe da liquidacao nao carregou. Volte à lista."
  },
  "finance-rules-save": {
    es: "No guardamos las reglas de comisión. Revisá porcentajes y reintentá.",
    en: "Commission rules didn’t save. Check percentages and retry.",
    pt: "As regras de comissao nao foram salvas. Confira percentuais."
  },
  "finance-payout-create": {
    es: "No generamos la corrida de liquidación. Revisá fechas y que no haya otra corrida en curso.",
    en: "Payout run wasn’t created. Check dates and for another run in progress.",
    pt: "A corrida de liquidacao nao foi criada. Confira as datas."
  },
  "finance-mark-paid": {
    es: "No marcamos la línea como pagada. Reintentá o recargá el detalle.",
    en: "Line wasn’t marked paid. Retry or reload the detail.",
    pt: "A linha nao foi marcada como paga. Tente de novo."
  },
  "finance-close-run": {
    es: "No cerramos la corrida. Reintentá cuando el servidor responda.",
    en: "Run wasn’t closed. Retry when the server responds.",
    pt: "A corrida nao foi fechada. Tente novamente."
  },
  "finance-stripe-retry": {
    es: "No reencolamos el evento de Stripe. Reintentá o revisá en el panel de Stripe.",
    en: "Stripe event wasn’t re-queued. Retry or check the Stripe dashboard.",
    pt: "O evento Stripe nao foi reenfileirado. Tente de novo."
  }
};

export function adminSurfaceMessage(context: AdminSurfaceContext, language: AppLanguage, raw?: string): string {
  if (raw?.trim()) {
    const net = softNetworkOrHttp(language, raw);
    if (net) {
      return net;
    }
    /** En desarrollo, el mensaje genérico ocultaba el error real del API (KPIs / Prisma / 503). */
    if (context === "admin-kpis-load" && import.meta.env.DEV) {
      return `${t(language, SURFACE[context])}\n\n${raw.trim()}`;
    }
  }
  return t(language, SURFACE[context]);
}
