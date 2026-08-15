import type { ReactNode } from "react";

export function ProfileCollapsibleSection(props: {
  id?: string;
  step?: string;
  title: string;
  description?: string;
  open: boolean;
  onToggle: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={`pro-profile-block${props.open ? "" : " is-collapsed"}`}
      id={props.id}
    >
      <div className="pro-profile-block__head-row">
        <button
          type="button"
          className="pro-profile-block__head"
          aria-expanded={props.open}
          onClick={props.onToggle}
        >
          {props.step ? <span className="pro-profile-block__step">{props.step}</span> : null}
          <div className="pro-profile-block__head-copy">
            <h2>{props.title}</h2>
            {props.description ? <p>{props.description}</p> : null}
          </div>
          <span className={`pro-profile-block__chevron${props.open ? " is-open" : ""}`} aria-hidden="true" />
        </button>
        {props.headerActions ? <div className="pro-profile-block__head-actions">{props.headerActions}</div> : null}
      </div>
      {props.open ? <div className="pro-profile-block__body">{props.children}</div> : null}
    </section>
  );
}
