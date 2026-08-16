import type { ReactNode } from "react";

export function ProPortalPageHeader(props: {
  title: string;
  titleId?: string;
  toolbar?: ReactNode;
  actions?: ReactNode;
  backButton?: ReactNode;
}) {
  if (!props.title && !props.backButton) {
    return null;
  }

  return (
    <header className="pro-portal-page-head">
      <div className="pro-portal-page-head-start">
        {props.backButton}
        {props.title ? (
          <h1 id={props.titleId} className="pro-portal-page-title">
            {props.title}
          </h1>
        ) : null}
      </div>
      <div className="pro-portal-page-head-end">
        {props.toolbar ? <div className="pro-portal-page-toolbar">{props.toolbar}</div> : null}
        {props.actions ? <div className="pro-portal-page-actions">{props.actions}</div> : null}
      </div>
    </header>
  );
}
