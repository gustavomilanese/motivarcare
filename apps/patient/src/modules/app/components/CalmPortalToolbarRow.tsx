import { AuthBrand } from "../../auth/AuthBrand";
import { PortalAccountToolsMount } from "./PortalAccountToolsMount";

/** Logo + campana/menú · misma fila que en home calm. */
export function CalmPortalToolbarRow(props: { mountId: string; mountClassName?: string }) {
  return (
    <div className="calm-toolbar-row">
      <AuthBrand />
      <PortalAccountToolsMount id={props.mountId} className={props.mountClassName ?? "calm-toolbar"} />
    </div>
  );
}
