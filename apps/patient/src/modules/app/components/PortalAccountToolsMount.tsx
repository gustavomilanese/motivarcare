/** Ancla donde PortalNavigation porta campana + menú de cuenta. */
export function PortalAccountToolsMount(props: { id: string; className?: string }) {
  return <div id={props.id} className={props.className ?? "portal-account-tools-mount"} />;
}
