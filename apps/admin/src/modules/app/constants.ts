import type { CreateUserFormState, PortalPath } from "./types";

/** Debe coincidir con la constante en `apps/api/src/modules/admin/admin.routes.ts` (PATCH /admin/bookings). */
export const ADMIN_TRIAL_BOOKING_CANCEL_PHRASE = "eliminar sesión de prueba";

export const links: Array<{ to: PortalPath; label: string }> = [
  { to: "/", label: "Dashboard" },
  { to: "/patients", label: "Pacientes" },
  { to: "/professionals", label: "Psicólogos" },
  { to: "/sessions", label: "Sesiones" },
  { to: "/finances", label: "Finanzas" },
  { to: "/settings", label: "Configuración" },
  { to: "/ai", label: "Auditoría IA (próx.)" }
];

export const defaultCreateForm: CreateUserFormState = {
  role: "PATIENT",
  isTestUser: false,
  fullName: "",
  email: "",
  password: "",
  timezone: "",
  patientStatus: "active",
  professionalVisible: true,
  professionalCancellationHours: "24",
  professionalBio: "",
  professionalTherapeuticApproach: "",
  professionalYearsExperience: "",
  professionalPhotoUrl: "",
  professionalVideoUrl: ""
};

export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "USA Eastern - New York/Miami (UTC-05:00 / -04:00 DST)" },
  { value: "America/Detroit", label: "USA Eastern - Detroit (UTC-05:00 / -04:00 DST)" },
  { value: "America/Indiana/Indianapolis", label: "USA Eastern - Indianapolis (UTC-05:00 / -04:00 DST)" },
  { value: "America/Kentucky/Louisville", label: "USA Eastern - Louisville (UTC-05:00 / -04:00 DST)" },
  { value: "America/Chicago", label: "USA Central - Chicago (UTC-06:00 / -05:00 DST)" },
  { value: "America/Menominee", label: "USA Central - Menominee (UTC-06:00 / -05:00 DST)" },
  { value: "America/North_Dakota/Center", label: "USA Central - North Dakota Center (UTC-06:00 / -05:00 DST)" },
  { value: "America/Denver", label: "USA Mountain - Denver (UTC-07:00 / -06:00 DST)" },
  { value: "America/Boise", label: "USA Mountain - Boise (UTC-07:00 / -06:00 DST)" },
  { value: "America/Phoenix", label: "USA Mountain - Phoenix (UTC-07:00, sin DST)" },
  { value: "America/Los_Angeles", label: "USA Pacific - Los Angeles (UTC-08:00 / -07:00 DST)" },
  { value: "America/Anchorage", label: "USA Alaska - Anchorage (UTC-09:00 / -08:00 DST)" },
  { value: "America/Juneau", label: "USA Alaska - Juneau (UTC-09:00 / -08:00 DST)" },
  { value: "America/Sitka", label: "USA Alaska - Sitka (UTC-09:00 / -08:00 DST)" },
  { value: "America/Nome", label: "USA Alaska - Nome (UTC-09:00 / -08:00 DST)" },
  { value: "America/Adak", label: "USA Aleutian - Adak (UTC-10:00 / -09:00 DST)" },
  { value: "Pacific/Honolulu", label: "USA Hawaii - Honolulu (UTC-10:00, sin DST)" },
  { value: "America/Puerto_Rico", label: "USA Territory - Puerto Rico (UTC-04:00)" },
  { value: "America/St_Thomas", label: "USA Territory - U.S. Virgin Islands (UTC-04:00)" },
  { value: "Pacific/Pago_Pago", label: "USA Territory - American Samoa (UTC-11:00)" },
  { value: "Pacific/Guam", label: "USA Territory - Guam (UTC+10:00)" },
  { value: "Pacific/Saipan", label: "USA Territory - Northern Mariana Islands (UTC+10:00)" },
  { value: "Etc/GMT+1", label: "GMT/UTC -01:00" },
  { value: "Etc/GMT+2", label: "GMT/UTC -02:00" },
  { value: "Etc/GMT+3", label: "GMT/UTC -03:00" },
  { value: "Etc/GMT+4", label: "GMT/UTC -04:00" },
  { value: "Etc/GMT+5", label: "GMT/UTC -05:00" },
  { value: "Etc/GMT+6", label: "GMT/UTC -06:00" },
  { value: "Etc/GMT+7", label: "GMT/UTC -07:00" },
  { value: "Etc/GMT+8", label: "GMT/UTC -08:00" },
  { value: "Etc/GMT+9", label: "GMT/UTC -09:00" },
  { value: "Etc/GMT+10", label: "GMT/UTC -10:00" },
  { value: "Etc/GMT+11", label: "GMT/UTC -11:00" },
  { value: "Etc/GMT+12", label: "GMT/UTC -12:00" },
  { value: "Etc/GMT-1", label: "GMT/UTC +01:00" },
  { value: "Etc/GMT-2", label: "GMT/UTC +02:00" },
  { value: "Etc/GMT-3", label: "GMT/UTC +03:00" }
] as const;

export const PATIENT_EMPTY_ART_URL = "/images/da-vinci-last-supper.jpg";
export const PROFESSIONAL_EMPTY_ART_URL = "/images/sistine-creation-of-adam.jpg";

export const SESSION_REASON_OPTIONS = [
  { value: "ajuste_manual", label: "Ajuste manual" },
  { value: "regalo", label: "Regalo" },
  { value: "correccion_compra", label: "Corrección de compra" },
  { value: "devolucion_sesion", label: "Devolución de sesión" },
  { value: "error_operativo", label: "Error operativo" }
] as const;
