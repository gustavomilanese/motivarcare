import type { ReactNode } from "react";

export function ProPortalPageHeader(props: {
  title: string;
  titleId?: string;
  center?: ReactNode;
  toolbar?: ReactNode;
  actions?: ReactNode;
  backButton?: ReactNode;
}) {
  if (!props.title && !props.backButton) {
    return null;
  }

  return (
    <header className={`pro-portal-page-head${props.center ? " pro-portal-page-head--with-center" : ""}`}>
      <div className="pro-portal-page-head-start">
        {props.backButton}
        <img
          className="pro-portal-page-mark"
          src="/brand/motivarcare-mark.png"
          alt="MotivarCare"
          width={32}
          height={32}
        />
        {props.title ? (
          <h1 id={props.titleId} className="pro-portal-page-title">
            {props.title}
          </h1>
        ) : null}
      </div>
      {props.center ? <div className="pro-portal-page-head-center">{props.center}</div> : null}
      <div className="pro-portal-page-head-end">
        {props.toolbar ? <div className="pro-portal-page-toolbar">{props.toolbar}</div> : null}
        {props.actions ? <div className="pro-portal-page-actions">{props.actions}</div> : null}
      </div>
    </header>
  );
}
