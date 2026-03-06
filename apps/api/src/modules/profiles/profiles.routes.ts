import { Router } from "express";

export const profilesRouter = Router();

profilesRouter.get("/professionals", (_req, res) => {
  // TODO: aplicar ranking de compatibilidad por intake + filtros terapeuticos.
  res.json({
    professionals: [],
    note: "Matching endpoint scaffolded. Implement ranking based on patient intake and preferences."
  });
});

profilesRouter.patch("/professional/:professionalId/public-profile", (req, res) => {
  res.json({
    message: "Public profile update scaffold ready",
    professionalId: req.params.professionalId,
    payload: req.body
  });
});
