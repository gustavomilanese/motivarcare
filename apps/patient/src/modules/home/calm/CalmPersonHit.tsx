import type { SyntheticEvent } from "react";
import type { AppLanguage } from "@therapy/i18n-config";
import { professionalPhotoSrc } from "../../app/services/api";
import { CalmExpandableText } from "./CalmExpandableText";

/** Foto + nombre: abre el perfil. Meta larga se trunca con Ver más. */
export function CalmPersonHit(props: {
  language: AppLanguage;
  name: string;
  meta?: string | null;
  photoUrl: string | null;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenProfile: () => void;
  className?: string;
  metaLines?: number;
}) {
  return (
    <div className={`calm-person${props.className ? ` ${props.className}` : ""}`}>
      <button type="button" className="calm-person__hit" onClick={props.onOpenProfile}>
        <span className="calm-person-ring">
          <img
            src={professionalPhotoSrc(props.photoUrl)}
            alt=""
            width={52}
            height={52}
            onError={props.onImageFallback}
          />
        </span>
        <strong>{props.name}</strong>
      </button>
      {props.meta ? (
        <CalmExpandableText
          language={props.language}
          text={props.meta}
          lines={props.metaLines ?? 2}
          className="calm-person__meta"
        />
      ) : null}
    </div>
  );
}
