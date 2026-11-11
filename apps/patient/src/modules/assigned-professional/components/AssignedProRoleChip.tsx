/** Chip de rubro — etiqueta DS 0.1: lima, bosque, mayúsculas, punto amarillo. */
export function AssignedProRoleChip(props: { label: string }) {
  const label = props.label.trim();
  if (!label) return null;
  return (
    <p className="assigned-pro-role-chip">
      <span className="assigned-pro-role-chip-dot" aria-hidden="true" />
      {label}
    </p>
  );
}
