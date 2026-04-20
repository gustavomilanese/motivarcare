import type { AuthApiUser, SessionUser } from "../types";

/**
 * Construye el `SessionUser` del portal a partir de `GET /api/auth/me`.
 * `emailVerified`: OR con el estado previo para que un `/me` momentáneamente desfasado no revierta
 * un “ya verificado” tras abrir el enlace (el próximo sync alinea con el servidor).
 * Consecuencia rara: si un admin des-verifica el mail, hace falta un sync o re-login para reflejarlo.
 */
export function sessionUserFromAuthMe(user: AuthApiUser, previous: SessionUser): SessionUser {
  return {
    id: String(user.id),
    fullName: user.fullName,
    firstName: user.firstName ?? previous.firstName,
    lastName: user.lastName ?? previous.lastName,
    email: user.email,
    emailVerified: Boolean(user.emailVerified || previous.emailVerified),
    avatarUrl: user.avatarUrl ?? previous.avatarUrl ?? null
  };
}
