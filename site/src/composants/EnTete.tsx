import { page } from "../etat/magasin";
import { fr } from "../i18n/fr";
import { CHEMINS, type Page } from "../pages";
import { Recherche } from "./Recherche";

// Navigation principale : l'onglet « Données » mène à la vue tableau et aux téléchargements.
const PAGES: { cle: keyof typeof fr.navigation; page: Page }[] = [
  { cle: "carte", page: "carte" },
  { cle: "proprietaires", page: "proprietaires" },
  { cle: "methode", page: "methode" },
  { cle: "donnees", page: "tableau" },
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
        {PAGES.map(({ cle, page: cible }) => (
          <a
            key={cle}
            href={CHEMINS[cible]}
            aria-current={page.value === cible ? "page" : undefined}
            class="en-tete__lien"
          >
            {fr.navigation[cle]}
          </a>
        ))}
      </nav>
      <Recherche />
    </header>
  );
}
