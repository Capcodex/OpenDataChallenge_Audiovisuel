import { fr } from "../i18n/fr";

// Pages du site ; celles des sprints suivants sont annoncées sans lien (pas de page 404).
const PAGES: { cle: keyof typeof fr.navigation; href: string | null }[] = [
  { cle: "carte", href: "/" },
  { cle: "proprietaires", href: null },
  { cle: "jt", href: null },
  { cle: "methode", href: null },
  { cle: "donnees", href: "/telechargements/dictionnaire.md" },
];

export function EnTete() {
  return (
    <header class="en-tete">
      <a class="en-tete__marque" href="/">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="7" cy="8" r="3.5" />
          <circle cx="21" cy="7" r="3.5" />
          <circle cx="14" cy="21" r="3.5" />
          <path d="M10 9.5 17.5 8M9 11l3.5 7M19.5 10.5 15.5 18" />
        </svg>
        <span>{fr.marque}</span>
      </a>
      <nav aria-label={fr.navigation.libelle} class="en-tete__navigation">
        {PAGES.map(({ cle, href }) =>
          href ? (
            <a
              key={cle}
              href={href}
              aria-current={cle === "carte" ? "page" : undefined}
              class="en-tete__lien"
            >
              {fr.navigation[cle]}
            </a>
          ) : (
            <span key={cle} class="en-tete__lien" aria-disabled="true" title={fr.carte.bientot}>
              {fr.navigation[cle]}
            </span>
          ),
        )}
      </nav>
    </header>
  );
}
