import { professionalAccessibleName, professionalDisplayNameLines } from "../lib/professionalDisplayName";

type NameSubject = { firstName?: string; lastName?: string; fullName: string };

export function ProfessionalNameStack(props: {
  professional: NameSubject;
  as?: "h3" | "div" | "span";
  className?: string;
}) {
  const { line1, line2 } = professionalDisplayNameLines(props.professional);
  const Tag = props.as ?? "div";
  return (
    <Tag className={`professional-name-stack${props.className ? ` ${props.className}` : ""}`}>
      <span className="professional-name-line1">{line1}</span>
      {line2 ? <span className="professional-name-line2">{line2}</span> : null}
    </Tag>
  );
}

export function professionalPhotoAlt(professional: NameSubject): string {
  return professionalAccessibleName(professional);
}
