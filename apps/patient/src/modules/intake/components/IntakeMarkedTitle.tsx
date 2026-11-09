const WAVE = "M3 12 C 30 3, 50 3, 70 10 S 110 18, 130 10 S 170 3, 197 9";

export function IntakeMarkedTitle(props: {
  kicker: string;
  title: string;
  mark?: string;
  help?: string;
}) {
  const mark = props.mark?.trim() ?? "";
  const index = mark ? props.title.toLowerCase().indexOf(mark.toLowerCase()) : -1;
  const before = index >= 0 ? props.title.slice(0, index) : props.title;
  const word = index >= 0 ? props.title.slice(index, index + mark.length) : "";
  const after = index >= 0 ? props.title.slice(index + mark.length) : "";

  return (
    <header className="intake-ask">
      <p className="intake-ask-kicker">
        <span aria-hidden="true" />
        {props.kicker}
      </p>
      <h1>
        {before}
        {word ? (
          <em className="auth-mark">
            {word}
            <svg className="auth-wave" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
              <path d={WAVE} />
            </svg>
          </em>
        ) : null}
        {after}
      </h1>
      {props.help ? <p className="intake-ask-help">{props.help}</p> : null}
    </header>
  );
}
