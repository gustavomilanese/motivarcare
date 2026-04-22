import { useMemo, useState } from "react";
import { type AppLanguage, type LocalizedText, textByLanguage } from "@therapy/i18n-config";
import { RESIDENCY_COUNTRY_OPTIONS } from "@therapy/types";

function t(language: AppLanguage, values: LocalizedText): string {
  return textByLanguage(language, values);
}

export function ProfessionalProfileIntroStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="pro-register-intro-shell">
      <section className="pro-profile-intro-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-password" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-profile-intro-copy">
          <h1>
            {t(props.language, {
              es: "Crear un perfil: el primer paso hacia el exito",
              en: "Create a profile: the first step toward success",
              pt: "Criar um perfil: o primeiro passo para o sucesso"
            })}
          </h1>
          <p>
            {t(props.language, {
              es: "En las siguientes pantallas, comenzara a crear su perfil unico, que sera la clave para interacciones exitosas con los clientes.",
              en: "In the next screens, you will create your unique profile, which will be key to successful client interactions.",
              pt: "Nas proximas telas, voce vai criar seu perfil unico, essencial para interacoes bem-sucedidas com clientes."
            })}
          </p>
          <p>
            {t(props.language, {
              es: "Su perfil es su representación en la plataforma, los clientes van a elegirlo segun este perfil.",
              en: "Your profile is how you are represented on the platform, and clients will choose you based on it.",
              pt: "Seu perfil e sua representacao na plataforma, e os clientes vao escolher voce com base nele."
            })}
          </p>
          <p>
            {t(props.language, {
              es: "Siga cada paso con cuidado. Todos sus datos se guardarán automáticamente para que pueda regresar y mejorar la información fácilmente.",
              en: "Follow each step carefully. Your data will be saved automatically so you can return and improve it anytime.",
              pt: "Siga cada etapa com cuidado. Seus dados serao salvos automaticamente para que voce possa voltar e melhorar as informacoes."
            })}
          </p>
          <p>
            {t(props.language, {
              es: "Nos alegra verlo en el equipo y estamos listos para una cooperación fructífera.",
              en: "We are glad to have you on the team and ready for a fruitful collaboration!",
              pt: "Estamos felizes em ter voce no time e prontos para uma cooperacao produtiva!"
            })}
          </p>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Vamos!", en: "Let's go!", pt: "Vamos!" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalPhotoStep(props: { language: AppLanguage; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="pro-register-intro-shell">
      <section className="pro-photo-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-photo-copy">
          <h1>{t(props.language, { es: "Anada su foto", en: "Add your photo", pt: "Adicione sua foto" })}</h1>
          <p>
            {t(props.language, {
              es: "Una buena foto de perfil es muy importante. Muchos clientes hacen su eleccion con solo mirar su foto, por lo que debe verse profesional.",
              en: "A good profile photo is very important. Many clients decide just by looking at it, so it should look professional.",
              pt: "Uma boa foto de perfil e muito importante. Muitos clientes escolhem so de olhar sua foto, por isso ela deve parecer profissional."
            })}
          </p>
        </div>

        <article className="pro-photo-preview-card">
          <div className="pro-photo-preview-head">
            <div className="pro-photo-preview-image" aria-hidden="true" />
            <div className="pro-photo-preview-meta">
              <strong>Gustavo G.</strong>
              <span>{t(props.language, { es: "Psicólogo", en: "Psychologist", pt: "Psicologo" })}</span>
              <small>{t(props.language, { es: "10+ años de experiencia", en: "10+ years of experience", pt: "10+ anos de experiencia" })}</small>
              <small>{t(props.language, { es: "1 000+ horas de práctica", en: "1,000+ practice hours", pt: "1.000+ horas de pratica" })}</small>
            </div>
            <span className="pro-photo-preview-favorite" aria-hidden="true">♥</span>
          </div>

          <strong className="pro-photo-preview-match">{t(props.language, { es: "Gustavo G. te conviene a 100%", en: "Gustavo G. is a 100% match for you", pt: "Gustavo G. combina 100% com voce" })}</strong>
          <span className="pro-photo-preview-line" aria-hidden="true" />
          <p>
            {t(props.language, {
              es: "Una presentacion clara y profesional ayuda a transmitir confianza desde el primer contacto con el paciente.",
              en: "A clear and professional presentation helps build trust from the very first contact with the patient.",
              pt: "Uma apresentacao clara e profissional ajuda a transmitir confianca desde o primeiro contato com o paciente."
            })}
          </p>
          <p className="pro-photo-preview-price">$50,00 USD {t(props.language, { es: "por 50 min. sesión", en: "per 50 min. session", pt: "por sessao de 50 min." })}</p>
        </article>

        <div className="pro-photo-actions">
          <button type="button" className="pro-photo-secondary">{t(props.language, { es: "Editar foto actual", en: "Edit current photo", pt: "Editar foto atual" })}</button>
          <button type="button" className="pro-photo-secondary">{t(props.language, { es: "Subir una nueva foto", en: "Upload a new photo", pt: "Enviar nova foto" })}</button>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" onClick={props.onContinue}>
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalProfileSpecializationStep(props: {
  language: AppLanguage;
  values: string[];
  onChange: (values: string[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const options = [
    { es: "Psicólogo", en: "Psychologist", pt: "Psicologo" },
    { es: "Psicoterapeuta", en: "Psychotherapist", pt: "Psicoterapeuta" },
    { es: "Psicoanalista", en: "Psychoanalyst", pt: "Psicanalista" },
    { es: "Psiquiatra", en: "Psychiatrist", pt: "Psiquiatra" },
    { es: "Terapeuta Gestalt", en: "Gestalt therapist", pt: "Terapeuta Gestalt" },
    { es: "Sexologo", en: "Sexologist", pt: "Sexologo" },
    { es: "Coach", en: "Coach", pt: "Coach" },
    { es: "Nutricionista", en: "Nutritionist", pt: "Nutricionista" },
    { es: "Doc. de Ciencias Medicas", en: "Medical sciences PhD", pt: "Doutor em ciencias medicas" },
    { es: "Doc. de Ciencias Psicologicas", en: "Psychological sciences PhD", pt: "Doutor em ciencias psicologicas" },
    { es: "Psicólogo en prácticas", en: "Psychologist in training", pt: "Psicologo em formacao" },
    { es: "Psicólogo perinatal", en: "Perinatal psychologist", pt: "Psicologo perinatal" },
    { es: "Psicólogo para militares y sus familiares", en: "Psychologist for military families", pt: "Psicologo para militares e familiares" },
    { es: "Psicólogo infantil", en: "Child psychologist", pt: "Psicologo infantil" }
  ].map((option) => t(props.language, option));

  const toggleOption = (option: string) => {
    const nextValues = props.values.includes(option)
      ? props.values.filter((item) => item !== option)
      : [...props.values, option];
    props.onChange(nextValues);
  };

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-profile-select-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-profile-select-head">
          <div className="pro-profile-select-copy">
            <h1>{t(props.language, { es: "Especializacion", en: "Specialization", pt: "Especializacao" })}</h1>
            <p>
              {t(props.language, {
                es: "Seleccione todo lo que sea relevante para usted. Puede elegir un numero limitado.",
                en: "Select everything relevant to you. You can choose a limited number.",
                pt: "Selecione tudo o que for relevante para voce. Voce pode escolher um numero limitado."
              })}
            </p>
          </div>

          <button
            className="pro-profile-clear"
            type="button"
            onClick={() => props.onChange([])}
            disabled={props.values.length === 0}
          >
            {t(props.language, { es: "Deseleccionar todo", en: "Clear all", pt: "Limpar tudo" })}
          </button>
        </div>

        <div className="pro-profile-check-list">
          {options.map((option) => {
            const checked = props.values.includes(option);

            return (
              <button
                key={option}
                className={`pro-profile-check-item ${checked ? "selected" : ""}`}
                type="button"
                onClick={() => toggleOption(option)}
                aria-pressed={checked}
              >
                <span className="pro-profile-checkbox" aria-hidden="true" />
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        <button
          className="pro-primary pro-register-intro-cta"
          type="button"
          disabled={props.values.length === 0}
          onClick={props.onContinue}
        >
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>
      </section>
    </div>
  );
}

export function ProfessionalPersonalDataStep(props: {
  language: AppLanguage;
  value: {
    publicName: string;
    firstName: string;
    lastName: string;
    practiceHours: string;
    graduationYear: string;
    gender: string;
    birthYear: string;
    birthCountry: string;
    residencyCountry: string;
  };
  onChange: (nextValue: {
    publicName: string;
    firstName: string;
    lastName: string;
    practiceHours: string;
    graduationYear: string;
    gender: string;
    birthYear: string;
    birthCountry: string;
    residencyCountry: string;
  }) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [genderOpen, setGenderOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [residencyOpen, setResidencyOpen] = useState(false);
  const [residencySearch, setResidencySearch] = useState("");
  const graduationYearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: current - 1969 }, (_, index) => String(current - index));
  }, []);
  const countries = [
    "Afganistan", "Albania", "Alemania", "Andorra", "Angola", "Anguila", "Antartida", "Antigua y Barbuda",
    "Arabia Saudita", "Argelia", "Argentina", "Armenia", "Aruba", "Australia", "Austria", "Azerbaiyan",
    "Bahamas", "Bahrein", "Bangladesh", "Barbados", "Belgica", "Belice", "Benin", "Bielorrusia",
    "Bolivia", "Bosnia y Herzegovina", "Botsuana", "Brasil", "Bulgaria", "Cabo Verde", "Camboya",
    "Camerun", "Canada", "Chile", "China", "Chipre", "Colombia", "Corea del Sur", "Costa Rica",
    "Croacia", "Cuba", "Dinamarca", "Ecuador", "Egipto", "El Salvador", "Emiratos Arabes Unidos", "Eslovaquia",
    "Eslovenia", "Espana", "Estados Unidos", "Estonia", "Etiopia", "Filipinas", "Finlandia", "Francia",
    "Georgia", "Ghana", "Grecia", "Guatemala", "Honduras", "Hungria", "India", "Indonesia", "Irlanda",
    "Islandia", "Israel", "Italia", "Japon", "Jordania", "Kenia", "Letonia", "Libano", "Lituania",
    "Luxemburgo", "Malasia", "Malta", "Marruecos", "Mexico", "Nicaragua", "Noruega", "Nueva Zelanda",
    "Paises Bajos", "Panama", "Paraguay", "Peru", "Polonia", "Portugal", "Puerto Rico", "Reino Unido",
    "Republica Checa", "Republica Dominicana", "Rumania", "Rusia", "Serbia", "Singapur", "Sudafrica",
    "Suecia", "Suiza", "Tailandia", "Taiwan", "Turquia", "Ucrania", "Uruguay", "Venezuela", "Vietnam"
  ];

  const filteredCountries = countries.filter((country) =>
    country.toLowerCase().includes(countrySearch.trim().toLowerCase())
  );
  const residencyLabel = useMemo(() => {
    const c = props.value.residencyCountry.trim().toUpperCase();
    if (!c) {
      return "";
    }
    const row = RESIDENCY_COUNTRY_OPTIONS.find((o) => o.code === c);
    return row ? row.names[props.language] : c;
  }, [props.language, props.value.residencyCountry]);
  const filteredResidency = useMemo(() => {
    const q = residencySearch.trim().toLowerCase();
    if (!q) {
      return RESIDENCY_COUNTRY_OPTIONS;
    }
    return RESIDENCY_COUNTRY_OPTIONS.filter((row) =>
      [row.names.es, row.names.en, row.names.pt, row.code].some((s) => s.toLowerCase().includes(q))
    );
  }, [residencySearch]);
  const birthYears = Array.from({ length: 81 }, (_, index) => String(new Date().getFullYear() - 18 - index));

  const genderChoices = useMemo(
    () =>
      [
        { value: "Hombre", label: t(props.language, { es: "Hombre", en: "Man", pt: "Homem" }) },
        { value: "Mujer", label: t(props.language, { es: "Mujer", en: "Woman", pt: "Mulher" }) },
        {
          value: "Persona no binaria",
          label: t(props.language, { es: "Persona no binaria", en: "Non-binary", pt: "Pessoa nao binaria" })
        },
        {
          value: "Mujer trans",
          label: t(props.language, { es: "Mujer trans", en: "Trans woman", pt: "Mulher trans" })
        },
        {
          value: "Hombre trans",
          label: t(props.language, { es: "Hombre trans", en: "Trans man", pt: "Homem trans" })
        },
        {
          value: "Otra identidad LGBTQ+",
          label: t(props.language, {
            es: "Otra identidad LGBTQ+",
            en: "Another LGBTQ+ identity",
            pt: "Outra identidade LGBTQIA+"
          })
        },
        {
          value: "Prefiero no decirlo",
          label: t(props.language, {
            es: "Prefiero no decirlo",
            en: "Prefer not to say",
            pt: "Prefiro nao dizer"
          })
        }
      ] as const,
    [props.language]
  );

  const next = (patch: Partial<typeof props.value>) => props.onChange({ ...props.value, ...patch });
  const genderLabel =
    props.value.gender.trim().length > 0
      ? genderChoices.find((c) => c.value === props.value.gender)?.label ?? props.value.gender
      : "";
  const canContinue = Boolean(
    props.value.publicName.trim()
    && props.value.firstName.trim()
    && props.value.lastName.trim()
    && props.value.practiceHours.trim()
    && props.value.graduationYear.trim()
    && props.value.gender.trim()
    && props.value.birthYear.trim()
    && props.value.birthCountry.trim()
    && /^[A-Za-z]{2}$/.test(props.value.residencyCountry.trim())
  );

  return (
    <div className="pro-register-intro-shell">
      <section className="pro-personal-card">
        <header className="pro-form-step-head">
          <button className="pro-register-intro-back" type="button" onClick={props.onBack} aria-label="Back">
            ←
          </button>
          <div className="pro-form-step-progress" aria-hidden="true">
            <span className="active progress-photo" />
          </div>
          <span className="pro-register-intro-info" aria-hidden="true">i</span>
        </header>

        <div className="pro-personal-copy">
          <h1>{t(props.language, { es: "Información personal", en: "Personal information", pt: "Informacoes pessoais" })}</h1>
          <p>
            {t(props.language, {
              es: "Esta información aparecerá en su perfil público de MotivarCare. Esto es lo que verán sus clientes.",
              en: "This information will appear on your public profile in MotivarCare. This is what clients will see.",
              pt: "Estas informacoes aparecerao no seu perfil publico no MotivarCare. E isso que os clientes vera."
            })}
          </p>
        </div>

        <div className="pro-personal-form">
          <input placeholder={t(props.language, { es: "Mi nombre", en: "My name", pt: "Meu nome" })} value={props.value.publicName} onChange={(event) => next({ publicName: event.target.value })} />
          <input placeholder={t(props.language, { es: "Nombre", en: "First name", pt: "Nome" })} value={props.value.firstName} onChange={(event) => next({ firstName: event.target.value })} />
          <input placeholder={t(props.language, { es: "Apellido", en: "Last name", pt: "Sobrenome" })} value={props.value.lastName} onChange={(event) => next({ lastName: event.target.value })} />
          <small>
            {t(props.language, {
              es: "Apellido completo (si hay varios apellidos, en un solo campo). Ej.: García López",
              en: "Full last name(s) in one field. E.g. García López",
              pt: "Sobrenome completo em um campo. Ex.: Silva Santos"
            })}
          </small>

          <div className="pro-personal-two-cols">
            <label>
              <input placeholder={t(props.language, { es: "Horas de práctica", en: "Practice hours", pt: "Horas de pratica" })} value={props.value.practiceHours} onChange={(event) => next({ practiceHours: event.target.value.replace(/\D/g, "") })} />
              <small>{t(props.language, { es: "Ejemplo: 3000", en: "Example: 3000", pt: "Exemplo: 3000" })}</small>
            </label>
            <label className="pro-personal-year-wrap">
              <select value={props.value.graduationYear} onChange={(event) => next({ graduationYear: event.target.value })}>
                <option value="">{t(props.language, { es: "Año de egreso", en: "Graduation year", pt: "Ano de formatura" })}</option>
                {graduationYearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <em aria-hidden="true">⌄</em>
            </label>
          </div>

          <div className="pro-personal-two-cols">
            <button type="button" className="pro-personal-select" onClick={() => setGenderOpen(true)}>
              <span>{genderLabel || t(props.language, { es: "Genero", en: "Gender", pt: "Genero" })}</span>
              <em>⌄</em>
            </button>

            <label className="pro-personal-year-wrap">
              <select value={props.value.birthYear} onChange={(event) => next({ birthYear: event.target.value })}>
                <option value="">{t(props.language, { es: "Año de nacimiento", en: "Birth year", pt: "Ano de nascimento" })}</option>
                {birthYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <em aria-hidden="true">⌄</em>
            </label>
          </div>

          <button type="button" className="pro-personal-select" onClick={() => setCountryOpen(true)}>
            <span>{props.value.birthCountry || t(props.language, { es: "Pais de nacimiento", en: "Country of birth", pt: "Pais de nascimento" })}</span>
            <em>⌄</em>
          </button>

          <button
            type="button"
            className="pro-personal-select"
            onClick={() => {
              setResidencySearch("");
              setResidencyOpen(true);
            }}
          >
            <span>
              {residencyLabel
                || t(props.language, {
                  es: "Pais de residencia habitual",
                  en: "Country of residence",
                  pt: "Pais de residencia habitual"
                })}
            </span>
            <em>⌄</em>
          </button>
        </div>

        <button className="pro-primary pro-register-intro-cta" type="button" disabled={!canContinue} onClick={props.onContinue}>
          {t(props.language, { es: "Guardar y continuar", en: "Save and continue", pt: "Salvar e continuar" })}
        </button>

        {genderOpen ? (
          <div className="pro-sheet-backdrop" role="presentation" onClick={() => setGenderOpen(false)}>
            <div className="pro-gender-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              {genderChoices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => {
                    next({ gender: choice.value });
                    setGenderOpen(false);
                  }}
                >
                  {choice.label}
                </button>
              ))}
              <button type="button" className="cancel" onClick={() => setGenderOpen(false)}>
                {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
              </button>
            </div>
          </div>
        ) : null}

        {countryOpen ? (
          <div className="pro-country-modal" role="dialog" aria-modal="true">
            <div className="pro-country-modal-head">
              <label>
                <input
                  placeholder={t(props.language, { es: "Buscar", en: "Search", pt: "Buscar" })}
                  value={countrySearch}
                  onChange={(event) => setCountrySearch(event.target.value)}
                />
              </label>
              <button type="button" onClick={() => { setCountryOpen(false); setCountrySearch(""); }}>
                {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
              </button>
            </div>
            <div className="pro-country-list">
              {filteredCountries.map((country) => (
                <button
                  key={country}
                  type="button"
                  className={props.value.birthCountry === country ? "selected" : ""}
                  onClick={() => {
                    next({ birthCountry: country });
                    setCountryOpen(false);
                    setCountrySearch("");
                  }}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {residencyOpen ? (
          <div className="pro-country-modal" role="dialog" aria-modal="true">
            <div className="pro-country-modal-head">
              <label>
                <input
                  placeholder={t(props.language, { es: "Buscar", en: "Search", pt: "Buscar" })}
                  value={residencySearch}
                  onChange={(event) => setResidencySearch(event.target.value)}
                />
              </label>
              <button type="button" onClick={() => { setResidencyOpen(false); setResidencySearch(""); }}>
                {t(props.language, { es: "Cancelar", en: "Cancel", pt: "Cancelar" })}
              </button>
            </div>
            <div className="pro-country-list">
              {filteredResidency.map((row) => (
                <button
                  key={row.code}
                  type="button"
                  className={props.value.residencyCountry.trim().toUpperCase() === row.code ? "selected" : ""}
                  onClick={() => {
                    next({ residencyCountry: row.code });
                    setResidencyOpen(false);
                    setResidencySearch("");
                  }}
                >
                  {row.names[props.language]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
