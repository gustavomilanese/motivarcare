import type { SyntheticEvent } from "react";
import { professionalPhotoSrc } from "../../app/services/api";

/** Foto + nombre: abre el perfil completo del profesional. */
export function CalmPersonHit(props: {
  name: string;
  meta?: string | null;
  photoUrl: string | null;
  onImageFallback: (event: SyntheticEvent<HTMLImageElement>) => void;
  onOpenProfile: () => void;
  className?: string;
  metaClassName?: string;
}) {
  return (
    <button
      type="button"
      className={`calm-person calm-person--hit${props.className ? ` ${props.className}` : ""}`}
      onClick={props.onOpenProfile}
    >
      <span className="calm-person-ring">
        <img
          src={professionalPhotoSrc(props.photoUrl)}
          alt=""
          width={52}
          height={52}
          onError={props.onImageFallback}
        />
      </span>
      <div>
        <strong>{props.name}</strong>
        {props.meta ? <span className={props.metaClassName}>{props.meta}</span> : null}
      </div>
    </button>
  );
}
