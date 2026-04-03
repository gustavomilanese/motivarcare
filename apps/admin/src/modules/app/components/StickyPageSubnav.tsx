import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function StickyPageSubnav<T extends string>(props: {
  language: AppLanguage;
  activeId: T;
  onSectionClick: (id: T) => void;
  items: Array<{ id: T; label: LocalizedText }>;
  ariaLabel: LocalizedText;
}) {
  return (
    <nav className="finance-page-subnav" aria-label={t(props.language, props.ariaLabel)}>
      <div className="finance-page-subnav-inner">
        {props.items.map((item) => {
          const isActive = props.activeId === item.id;
          return (
            <a
              key={item.id}
              className={isActive ? "finance-page-subnav-link is-active" : "finance-page-subnav-link"}
              href={`#${item.id}`}
              aria-current={isActive ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                props.onSectionClick(item.id);
              }}
            >
              {t(props.language, item.label)}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
