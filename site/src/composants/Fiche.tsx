/**
 * Fiche média (E2-02, E2-03, E3-01, E3-03 ; maquettes « Carte et fiche » et « États »).
 *
 * Ordre imposé (CdC fonctionnel § 6.3) : en-tête, voisins, public, propriété, sources. Chaque
 * chiffre de l'enquête est affiché avec son effectif et sa marge (EF-M6-01) ; sous 100 répondants,
 * il est signalé comme fragile (RG-03).
 */
import type { ComponentChildren, Ref } from "preact";

import { fermer, noeudsParId, ouvrir, voisins } from "../etat/magasin";
import {
  estFragile,
  formaterDate,
  lienPermanent,
  mentionFiche,
  propriete,
  seuils,
} from "../fiche/fiche-donnees";
import { libellePosition } from "../familles/position";
import type { Graphe, Noeud } from "../graph/types";
import { fr, phraseLien, phrasePositionnement } from "../i18n/fr";
import { CopierMention } from "./CopierMention";
import { Jauge } from "./Jauge";

type Titre = Ref<HTMLHeadingElement>;

function BadgeFragile() {
  return (
    <span class="badge-fragile">
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 2 21h20L12 3z" />
        <path d="M12 10v5M12 18v.5" />
      </svg>
      {fr.fiche.fragile}
    </span>
  );
}

function EnTeteFiche({
  type,
  nom,
  titre,
  children,
}: {
  type: string;
  nom: string;
  titre: Titre;
  children?: ComponentChildren;
}) {
  return (
    <header class="fiche__en-tete">
      <div class="fiche__titre">
        <span class="panneau__type">{fr.types[type] ?? type}</span>
        <h2 id="panneau-titre" ref={titre} tabIndex={-1}>
          {nom}
        </h2>
      </div>
      <button type="button" class="fiche__fermer" aria-label={fr.fiche.fermer} onClick={fermer}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      {children}
    </header>
  );
}

export function Fiche({
  donnees: g,
  media: m,
  titre,
}: {
  donnees: Graphe;
  media: Noeud;
  titre: Titre;
}) {
  const s = seuils(g);
  const famille = g.meta.communities_displayed
    ? g.communities.find((c) => c.id === m.community)
    : undefined;
  const statut = fr.fiche.statut[m.public];
  const liste = voisins.value;
  const prop = propriete(g, m);
  const [polMoy, polBas, polHaut] = m.pol;

  return (
    <>
      <EnTeteFiche type={m.type} nom={m.label} titre={titre}>
        <p class="fiche__etiquettes">
          {famille && (
            <span class="etiquette">
              <span class="legende__pastille" style={{ background: famille.color }} />
              {famille.label}
            </span>
          )}
          {statut && <span class="etiquette">{statut}</span>}
          <span class="etiquette etiquette--chiffre">{fr.fiche.effectif(m.n)}</span>
          {m.fragile && <BadgeFragile />}
        </p>
      </EnTeteFiche>

      <section class="fiche__section" aria-labelledby="fiche-voisins">
        <h3 id="fiche-voisins">{fr.fiche.voisinsTitre}</h3>
        <ol class="fiche__voisins">
          {liste.map(({ id, lien }) => {
            const voisin = noeudsParId.value.get(id);
            const nom = voisin?.label ?? id;
            const fragile = estFragile(lien.n, s.fragile);
            const couleur = g.meta.communities_displayed
              ? g.communities.find((c) => c.id === voisin?.community)?.color
              : undefined;
            return (
              <li key={id}>
                <button
                  type="button"
                  class={`fiche__voisin${fragile ? " fiche__voisin--fragile" : ""}`}
                  title={phraseLien(m.label, nom, lien.lift, lien.n)}
                  onClick={() => ouvrir(id, "fiche")}
                >
                  <span
                    class="legende__pastille"
                    style={couleur ? { background: couleur } : undefined}
                  />
                  <span class="fiche__voisin-nom">{nom}</span>
                  <span class="panneau__chiffre">
                    {fr.fiche.voisin(lien.lift, lien.n)}
                    <span class="fiche__marge">{fr.fiche.margeLift(lien.ci[0], lien.ci[1])}</span>
                    {fragile && <span class="fiche__fragile">{fr.fiche.voisinFragile}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {liste.length < 5 && (
          <p class="fiche__aide">{fr.fiche.voisinsMoins(liste.length, s.communsMin)}</p>
        )}
        <p class="panneau__discret">{fr.fiche.lectureLift}</p>
      </section>

      <section class="fiche__section" aria-labelledby="fiche-public">
        <h3 id="fiche-public">{fr.fiche.profilTitre}</h3>
        <div class="fiche__indicateur">
          <h4>{fr.fiche.politiqueTitre}</h4>
          <Jauge triplet={m.pol} min={0} max={10} graduations={[0, 5, 10]} fragile={m.fragile} />
          <div class="fiche__echelle" aria-hidden="true">
            <span>{fr.fiche.echelleGauche}</span>
            <span>{fr.fiche.echelleCentre}</span>
            <span>{fr.fiche.echelleDroite}</span>
          </div>
          <p>{phrasePositionnement(polMoy, polBas, polHaut)}</p>
          {m.pol_nr > 0 && <p class="panneau__discret">{fr.fiche.nonReponses(m.pol_nr)}</p>}
          {famille && libellePosition(famille, g.communities) && (
            <p class="panneau__discret">
              {fr.familles.dansFiche(famille.label, libellePosition(famille, g.communities)!)}
            </p>
          )}
        </div>
        <div>
          <div class="fiche__indicateur">
            <h4>{fr.fiche.ageTitre}</h4>
            <p class="fiche__valeur">{fr.fiche.age(m.age[0])}</p>
            <Jauge
              triplet={m.age}
              min={15}
              max={75}
              graduations={[15, 35, 55, 75]}
              fragile={m.fragile}
            />
            <p class="panneau__discret">{fr.fiche.ageMarge(m.age[1], m.age[2])}</p>
          </div>
          <div class="fiche__indicateur">
            <h4>{fr.fiche.moins35Titre}</h4>
            <p class="fiche__valeur">{fr.fiche.part(m.under35[0])}</p>
            <Jauge
              triplet={m.under35}
              min={0}
              max={1}
              graduations={[0, 0.5, 1]}
              fragile={m.fragile}
            />
            <p class="panneau__discret">{fr.fiche.partMarge(m.under35[1], m.under35[2])}</p>
          </div>
        </div>
        <p class="panneau__discret">{fr.fiche.effectif(m.n)}</p>
      </section>

      <section class="fiche__section" aria-labelledby="fiche-propriete">
        <h3 id="fiche-propriete">{fr.fiche.proprieteTitre}</h3>
        {prop.proprietaires.length ? (
          <dl class="fiche__propriete">
            <dt>{fr.fiche.groupe}</dt>
            <dd>{prop.groupe ?? fr.fiche.aucunGroupe}</dd>
            <dt>{fr.fiche.proprietaires}</dt>
            <dd>
              <ul>
                {prop.proprietaires.map((p) => (
                  <li key={p.nom}>
                    {p.nom}
                    {p.part !== null && (
                      <span class="panneau__chiffre"> · {fr.fiche.part(p.part)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </dd>
          </dl>
        ) : (
          <p>{fr.fiche.nonIdentifie}</p>
        )}
        {prop.source && (
          <p class="panneau__discret">
            {fr.fiche.sourcePropriete(prop.source.nom, formaterDate(prop.source.date))}
          </p>
        )}
      </section>

      <section class="fiche__section" aria-labelledby="fiche-citer">
        <h3 id="fiche-citer">{fr.fiche.citerTitre}</h3>
        <CopierMention mention={mentionFiche(g, m.id)} />
        <p class="fiche__lien">
          <span class="panneau__discret">{fr.fiche.lienPermanent} : </span>
          <a href={`/media/${m.id}`}>{lienPermanent(g, m.id).replace(/^https?:\/\//, "")}</a>
        </p>
      </section>
    </>
  );
}

/** Média sous le seuil d'affichage (RG-02, maquette « États », cas 1) : aucun indicateur. */
export function FicheInsuffisante({
  donnees: g,
  media,
  titre,
}: {
  donnees: Graphe;
  media: { id: string; label: string; type: string };
  titre: Titre;
}) {
  return (
    <>
      <EnTeteFiche type={media.type} nom={media.label} titre={titre} />
      <div class="fiche__insuffisant" role="note">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 7v6M17 16v.5" />
        </svg>
        <p>{fr.etats.effectifInsuffisant(seuils(g).affichable)}</p>
      </div>
      <p>
        <a href="/methode#quels-medias-apparaissent">
          {fr.etats.pourquoiSeuil(seuils(g).affichable)}
        </a>
      </p>
    </>
  );
}
