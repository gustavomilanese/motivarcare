export type PayChoice =
  | { kind: "plan"; planId: string }
  | { kind: "individual" };

/** El paquete destacado queda elegido. Si no hay paquetes, queda la sesión suelta. */
export function defaultPayChoice(
  plans: Array<{ id: string; credits: number }>,
  featuredId: string | null,
  allowIndividual: boolean
): PayChoice | null {
  const featured = featuredId
    ? plans.find((plan) => plan.id === featuredId && plan.credits > 1)
    : undefined;
  if (featured) return { kind: "plan", planId: featured.id };
  const bundle = plans.find((plan) => plan.credits > 1);
  if (bundle) return { kind: "plan", planId: bundle.id };
  if (allowIndividual) return { kind: "individual" };
  const single = plans.find((plan) => plan.credits === 1);
  if (single) return { kind: "plan", planId: single.id };
  return null;
}

export function samePayChoice(left: PayChoice | null, right: PayChoice | null): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  if (left.kind === "individual" || right.kind === "individual") return left.kind === right.kind;
  return left.planId === right.planId;
}
