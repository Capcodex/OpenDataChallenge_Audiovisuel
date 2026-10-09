/**
 * Page JT (E5-01, EF-M5-01 à 03, T-076, maquette « Module JT ») : profils empilés par chaîne,
 * isolement d'une rubrique, matrice de similarité, avertissement permanent.
 *
 * Les 7 rubriques les plus fréquentes de l'année sont détaillées (en 2020, la santé).
 * Profils par année : graph.json contient les parts annuelles ; un profil de période recalculé ici
 * différerait de celui du pipeline (somme des volumes). La matrice, elle, est celle du pipeline
 * pour chaque période.
 */
import { useMemo, useState } from "preact/hooks";

import type { Graphe } from "../graph/types";
import { formaterPart, fr } from "../i18n/fr";
import {
  matriceSimilarite,
  plusSinguliere,
  profilAnnee,
  rubriquesPrincipales,
  type Mesure,
} from "../jt/jt-donnees";

// Palette catégorielle (jetons des familles, puis neutres) ; « autres » en gris. Toutes assez
// claires pour un texte foncé à 4,5:1 (le bleu des familles, à 4,1:1, est éclairci).
const COULEURS = ["#4a8fe0", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#a58bd0", "#3a9fb5"];
const COULEUR_AUTRES = "#c9ced5";
const deux = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Fond d'une case de la matrice : du blanc (0,5) à l'accent foncé (1). */
function fondSimilarite(v: number): string {
  const t = Math.max(0, Math.min(1, (v - 0.5) / 0.5));
  const melange = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${melange(255, 22)} ${melange(255, 63)} ${melange(255, 115)})`;
}

/** Texte blanc à partir de 0,85 : contraste ≥ 4,5:1 des deux côtés du seuil (WCAG AA). */
const SEUIL_TEXTE_CLAIR = 0.85;

function Choix<T extends string | number>({
  libelle,
  valeurs,
  valeur,
  nom,
  surChoix,
}: {
  libelle: string;
  valeurs: T[];
  valeur: T;
  nom: (v: T) => string;
  surChoix: (v: T) => void;
}) {
  return (
    <div class="filtres" role="group" aria-label={libelle}>
      <span class="filtres__libelle">{libelle}</span>
      {valeurs.map((v) => (
        <button
          key={String(v)}
          type="button"
          class="filtre"
          aria-pressed={v === valeur}
          onClick={() => surChoix(v)}
        >
          {nom(v)}
        </button>
      ))}
    </div>
  );
}

export function PageJt({ donnees: g }: { donnees: Graphe }) {
  const { jt } = g;
  const t = fr.jt;
  const [mesure, setMesure] = useState<Mesure>("sujets");
  const [annee, setAnnee] = useState(jt.years[jt.years.length - 1]);
  const [periode, setPeriode] = useState(jt.periods[0]);
  const [isolee, setIsolee] = useState<number | null>(null);

  const principales = useMemo(() => rubriquesPrincipales(jt, mesure, annee), [jt, mesure, annee]);
  const couleur = (r: number | null) =>
    r === null ? COULEUR_AUTRES : COULEURS[principales.indexOf(r) % COULEURS.length];
  const nomRubrique = (r: number | null) => (r === null ? t.autres : jt.rubrics[r]);
  const matrice = useMemo(() => matriceSimilarite(jt, periode, mesure), [jt, periode, mesure]);
  const singuliere = plusSinguliere(matrice);

  return (
    <main class="page-jt">
      <div>
        <h1>{t.titre}</h1>
        <p class="page-jt__introduction">{t.introduction}</p>
      </div>
      <div class="page-jt__choix">
        <Choix
          libelle={t.mesure}
          valeurs={["sujets", "duree"] as Mesure[]}
          valeur={mesure}
          nom={(m) => t.mesures[m]}
          surChoix={(m) => {
            setMesure(m);
            setIsolee(null);
          }}
        />
        <div class="filtres">
          <label for="jt-annee" class="filtres__libelle">
            {t.annee}
          </label>
          <select
            id="jt-annee"
            class="champ"
            value={annee}
            onChange={(e) => {
              setAnnee(Number(e.currentTarget.value));
              setIsolee(null);
            }}
          >
            {jt.years.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p class="message-alerte" role="note">
        {t.avertissement}
      </p>

      <div class="page-jt__grille">
        <section class="bloc" aria-labelledby="jt-profils">
          <h2 id="jt-profils">{t.profilTitre(t.mesures[mesure], annee)}</h2>
          <ul class="jt-legende" aria-label={t.legende}>
            {[...principales, null].map((r) => (
              <li key={String(r)}>
                <button
                  type="button"
                  class="filtre"
                  aria-pressed={r !== null && isolee === r}
                  disabled={r === null}
                  onClick={() => r !== null && setIsolee(isolee === r ? null : r)}
                >
                  <span class="legende__pastille" style={{ background: couleur(r) }} />
                  {nomRubrique(r)}
                </button>
              </li>
            ))}
            {isolee !== null && (
              <li>
                <button type="button" class="filtre" onClick={() => setIsolee(null)}>
                  {t.toutes}
                </button>
              </li>
            )}
          </ul>
          <ul class="jt-profils">
            {jt.channels.map((chaine, c) => {
              const segments = profilAnnee(jt, mesure, c, annee, principales);
              const texte = segments
                .map((s) => `${nomRubrique(s.rubrique)} ${formaterPart(s.part)}`)
                .join(", ");
              return (
                <li key={chaine}>
                  <span class="jt-profils__chaine">{chaine}</span>
                  <span class="visuellement-masque">{t.profilChaine(chaine, texte)}</span>
                  <span class="jt-profils__barre" aria-hidden="true">
                    {segments.map((s) => (
                      <span
                        key={String(s.rubrique)}
                        class="jt-profils__segment"
                        title={`${nomRubrique(s.rubrique)} : ${formaterPart(s.part)}`}
                        style={{
                          width: `${s.part * 100}%`,
                          background: couleur(s.rubrique),
                          opacity: isolee === null || isolee === s.rubrique ? 1 : 0.25,
                        }}
                      >
                        {s.part >= 0.07 ? formaterPart(s.part) : ""}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
          {isolee !== null && (
            <div class="jt-isolee">
              <h3>{t.isoleeTitre(jt.rubrics[isolee], annee)}</h3>
              <ul>
                {jt.channels.map((chaine, c) => {
                  const part = jt.profiles[mesure][c][jt.years.indexOf(annee)][isolee];
                  return (
                    <li key={chaine}>
                      <span>{chaine}</span>
                      <span class="jt-isolee__barre" aria-hidden="true">
                        <span
                          style={{
                            width: `${Math.min(100, part * 200)}%`,
                            background: couleur(isolee),
                          }}
                        />
                      </span>
                      <span class="panneau__chiffre">{formaterPart(part)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p class="panneau__discret">{t.lectureProfil}</p>
        </section>

        <section class="bloc" aria-labelledby="jt-similarite">
          <h2 id="jt-similarite">{t.similariteTitre(periode)}</h2>
          <Choix
            libelle={t.periode}
            valeurs={jt.periods}
            valeur={periode}
            nom={(p) => p}
            surChoix={setPeriode}
          />
          <div class="defilant">
            <table class="matrice">
              <caption class="visuellement-masque">{t.similariteLegende}</caption>
              <thead>
                <tr>
                  <td />
                  {jt.channels.map((c) => (
                    <th key={c} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jt.channels.map((a, i) => (
                  <tr key={a}>
                    <th scope="row">{a}</th>
                    {jt.channels.map((b, j) => {
                      const v = matrice[i][j];
                      return (
                        <td
                          key={b}
                          style={{
                            background: fondSimilarite(v),
                            color: v >= SEUIL_TEXTE_CLAIR ? "#ffffff" : "#14171c",
                          }}
                        >
                          {deux.format(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="panneau__discret">0,50 → {t.echelle}</p>
          <p>
            {t.singuliere(
              jt.channels[singuliere.chaine],
              deux.format(singuliere.moyenne),
              deux.format(singuliere.autres),
            )}
          </p>
          <p class="panneau__discret">{t.definition}</p>
        </section>
      </div>
      <p class="panneau__discret">{t.rappel}</p>
      <p class="panneau__discret">{t.source}</p>
    </main>
  );
}
