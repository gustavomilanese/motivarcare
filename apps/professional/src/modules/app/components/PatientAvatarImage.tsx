import { useEffect, useState } from "react";

export function PatientAvatarImage(props: {
  src: string | undefined;
  imgClassName: string;
  emptyClassName: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [props.src]);

  if (!props.src || failed) {
    return <div className={props.emptyClassName} aria-hidden />;
  }

  return (
    <img
      src={props.src}
      alt=""
      className={props.imgClassName}
      onError={() => setFailed(true)}
    />
  );
}
