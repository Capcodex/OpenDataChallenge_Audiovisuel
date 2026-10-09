/**
 * Champ de recherche toujours visible (E2-01, EF-M2-01 à 04).
 *
 * Modèle ARIA « combobox » avec liste de suggestions : flèches haut et bas pour parcourir, Entrée
 * pour ouvrir la fiche (la suggestion active, sinon la première), Échap pour fermer la liste puis
 * vider le champ. Le nombre de résultats est annoncé aux lecteurs d'écran.
 */
import { useMemo, useState } from "preact/hooks";

import { donnees, ouvrir, page } from "../etat/magasin";
import { fr } from "../i18n/fr";
import { construireIndex, LONGUEUR_MIN, type Resultat } from "../recherche/recherche";
import { normaliser } from "../texte/normaliser";

export const ID_RECHERCHE = "recherche";
const ID_LISTE = "recherche-suggestions";
const idOption = (i: number) => `recherche-option-${i}`;

export function Recherche() {
  const g = donnees.value;
  const index = useMemo(() => (g ? construireIndex(g) : null), [g]);
  const [requete, setRequete] = useState("");
  const [ouverte, setOuverte] = useState(false);
  const [active, setActive] = useState(-1);

  const assezLongue = normaliser(requete).length >= LONGUEUR_MIN;
  const resultats = useMemo(
    () => (index && assezLongue ? index.rechercher(requete) : []),
    [index, requete, assezLongue],
  );
  const listeVisible = ouverte && assezLongue && index !== null;

  const choisir = (r: Resultat) => {
    if (page.value !== "carte") {
      location.assign(`/media/${r.id}`);
      return;
    }
    ouvrir(r.id, "recherche");
    setRequete("");
    setOuverte(false);
    setActive(-1);
  };

  const auClavier = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!resultats.length) return;
      e.preventDefault();
      setOuverte(true);
      const pas = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + pas + resultats.length) % resultats.length);
    } else if (e.key === "Enter") {
      const r = resultats[active] ?? resultats[0];
      if (listeVisible && r) {
        e.preventDefault();
        choisir(r);
      }
    } else if (e.key === "Escape") {
      // Échap ferme d'abord la liste, puis vide le champ ; la fiche ne se ferme pas en même temps.
      if (listeVisible || requete) e.stopPropagation();
      if (listeVisible) setOuverte(false);
      else setRequete("");
      setActive(-1);
    }
  };

  return (
    <div class="recherche" role="search">
      <label for={ID_RECHERCHE} class="visuellement-masque">
        {fr.recherche.libelle}
      </label>
      <svg class="recherche__loupe" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id={ID_RECHERCHE}
        class="recherche__champ"
        type="search"
        role="combobox"
        // Les types de Preact exigent `list` sur un champ combobox ; la liste est gérée en ARIA.
        list={undefined}
        autoComplete="off"
        spellcheck={false}
        placeholder={fr.recherche.exemple}
        aria-autocomplete="list"
        aria-expanded={listeVisible}
        aria-controls={ID_LISTE}
        aria-activedescendant={listeVisible && active >= 0 ? idOption(active) : undefined}
        value={requete}
        onInput={(e) => {
          setRequete(e.currentTarget.value);
          setOuverte(true);
          setActive(-1);
        }}
        onFocus={() => setOuverte(true)}
        onBlur={() => setOuverte(false)}
        onKeyDown={auClavier}
      />
      {listeVisible && (
        <div class="recherche__menu">
          {resultats.length > 0 ? (
            <ul id={ID_LISTE} role="listbox" aria-label={fr.recherche.suggestions}>
              {resultats.map((r, i) => (
                <li
                  key={r.id}
                  id={idOption(i)}
                  role="option"
                  aria-selected={i === active}
                  class="recherche__option"
                  // mousedown plutôt que click : le champ ne perd pas le focus avant le choix.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choisir(r);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <span class="recherche__nom">{r.label}</span>
                  <span class="recherche__type">
                    {r.insuffisant ? fr.recherche.insuffisant : (fr.types[r.type] ?? r.type)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div id={ID_LISTE} class="recherche__vide">
              <strong>{fr.recherche.aucunResultat}</strong>
              <span>{fr.recherche.aucunResultatDetail}</span>
            </div>
          )}
        </div>
      )}
      <p class="visuellement-masque" role="status" aria-live="polite">
        {listeVisible ? fr.recherche.nombreResultats(resultats.length) : ""}
      </p>
    </div>
  );
}
