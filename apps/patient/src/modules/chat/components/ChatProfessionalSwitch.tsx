export function ChatProfessionalSwitch(props: {
  professionals: Array<{ id: string; name: string; unread: number }>;
  activeId: string | null;
  onSelect: (professionalId: string) => void;
}) {
  if (props.professionals.length < 2) return null;
  return (
    <div className="chat-ds-switch" role="tablist">
      {props.professionals.map((professional) => (
        <button
          key={professional.id}
          type="button"
          className={professional.id === props.activeId ? "is-active" : ""}
          onClick={() => props.onSelect(professional.id)}
        >
          {professional.name}
          {professional.unread > 0 ? <span>{professional.unread}</span> : null}
        </button>
      ))}
    </div>
  );
}
