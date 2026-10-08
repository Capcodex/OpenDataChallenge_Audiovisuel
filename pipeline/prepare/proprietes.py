"""Étape « proprietes » : propriétaires des médias (E0-08, EF-FT-07, ADR-003).

Source : base « Médias français : qui possède quoi » (Le Monde diplomatique, Acrimed), figée au
commit du 17 décembre 2024. Elle décrit un graphe de détention : des personnes et des
organisations détiennent des organisations, qui détiennent des médias (« égal à 50 % »,
« contrôle »…).

Pour chaque média du référentiel :
1. rapprochement avec un média de la base : nom, variantes ou libellés Arcom normalisés, ou nom
   imposé par config/proprietes_corrections.csv (règle `nom_base`) ;
2. groupe = détenteur direct principal (plus forte part ; « contrôle » compte comme 100 %) ;
3. propriétaires ultimes = sommets de la chaîne de détention, avec leur part effective (produit
   des parts le long de la chaîne, sommée sur les chemins ; vide si une part est inconnue) ;
4. corrections : `meme_que` (un JT a les propriétaires de sa chaîne), `detenteur` (saisie sourcée),
   `non_identifie` (absent de la base, marqué explicitement).

Sorties agrégées : data/output/proprietes.parquet, data/output/journal_proprietes.json.
"""

import json
import logging
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from pipeline.chemins import Chemins
from pipeline.config import chemin_source
from pipeline.prepare.medias import charger_referentiel
from pipeline.texte import normaliser

log = logging.getLogger(__name__)

SOURCE_BASE = "Le Monde diplomatique / Acrimed, Médias français (ODC-By), commit 231814e"
DATE_BASE = "2024-12-17"
RELATIONS = [
    "mdiplo_organisation_media",
    "mdiplo_organisation_organisation",
    "mdiplo_personne_media",
    "mdiplo_personne_organisation",
]
REGLES = {"nom_base", "meme_que", "detenteur", "non_identifie"}
TYPES_PROPRIETAIRE = {"personne", "etat", "organisation"}
# Les États sont des organisations de la base, repérées par leur nom.
MOTIF_ETAT = re.compile(r"^(République|État|Etat|Royaume|Émirat)\b")


class ErreurProprietes(Exception):
    """Base de propriété ou fichier de corrections incohérents."""


@dataclass(frozen=True)
class Detention:
    origine: str
    part: float | None  # entre 0 et 1 ; None si inconnue (« contrôle », « participe »…)
    qualificatif: str


def lire_part(qualificatif: str, valeur: str) -> float | None:
    """« égal à » + « 50.00% » → 0,5. Toute autre forme (contrôle, inférieur à…) : inconnue."""
    if qualificatif != "égal à" or not valeur.strip():
        return None
    return float(valeur.strip().rstrip("%").replace(",", ".")) / 100


def identifiant(nom: str) -> str:
    """Identifiant stable d'un propriétaire : « Famille Bouygues » → « famille-bouygues »."""
    texte = unicodedata.normalize("NFKD", nom)
    texte = "".join(c for c in texte if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", "-", texte).strip("-")


def charger_relations(relations: list[pd.DataFrame]) -> dict[str, list[Detention]]:
    """Cible → liste de ses détenteurs directs (doublons exacts supprimés)."""
    toutes = pd.concat(relations, ignore_index=True)
    attendues = {"origine", "qualificatif", "valeur", "cible"}
    if not attendues <= set(toutes.columns):
        raise ErreurProprietes(f"Colonnes attendues {sorted(attendues)} dans les relations")
    toutes = toutes.drop_duplicates(subset=["origine", "qualificatif", "valeur", "cible"])
    detenteurs: dict[str, list[Detention]] = {}
    for r in toutes.itertuples():
        detenteurs.setdefault(r.cible.strip(), []).append(
            Detention(r.origine.strip(), lire_part(r.qualificatif, r.valeur), r.qualificatif)
        )
    return detenteurs


def proprietaires_ultimes(
    cible: str, detenteurs: dict[str, list[Detention]]
) -> dict[str, float | None]:
    """Sommets de la chaîne de détention de `cible` et part effective de chacun.

    La part effective est le produit des parts le long d'un chemin, sommée sur les chemins.
    Elle est inconnue (None) dès qu'un chemin comporte une part inconnue.
    """
    resultat: dict[str, float | None] = {}

    def remonter(noeud: str, part: float | None, visites: frozenset[str]) -> None:
        if noeud in visites:  # cycle de détention : chemin abandonné
            return
        if noeud not in detenteurs:  # sommet : propriétaire ultime
            if noeud in resultat:
                anc = resultat[noeud]
                resultat[noeud] = None if anc is None or part is None else anc + part
            else:
                resultat[noeud] = part
            return
        for d in detenteurs[noeud]:
            nouvelle = None if part is None or d.part is None else part * d.part
            remonter(d.origine, nouvelle, visites | {noeud})

    remonter(cible, 1.0, frozenset())
    return resultat


def groupe_principal(cible: str, detenteurs: dict[str, list[Detention]]) -> str | None:
    """Détenteur direct principal : plus forte part (« contrôle » = 100 %), puis par nom."""
    directs = detenteurs.get(cible, [])
    if not directs:
        return None

    def rang(d: Detention) -> tuple:
        part = 1.0 if d.qualificatif == "contrôle" else (d.part or 0.0)
        return (-part, d.origine)

    return min(directs, key=rang).origine


def charger_corrections(chemin: Path, ids: set[str]) -> pd.DataFrame:
    corr = pd.read_csv(chemin, dtype=str, keep_default_na=False)
    erreurs = []
    if (
        corr["media_id"].duplicated().any()
        and not (corr.loc[corr["media_id"].duplicated(keep=False), "regle"] == "detenteur").all()
    ):
        erreurs.append("un média a plusieurs règles (seule `detenteur` peut se répéter)")
    for r in corr.itertuples():
        if r.media_id not in ids:
            erreurs.append(f"{r.media_id} : absent de medias.csv")
        if r.regle not in REGLES:
            erreurs.append(f"{r.media_id} : règle inconnue « {r.regle} »")
        if r.regle == "meme_que" and r.valeur not in ids:
            erreurs.append(f"{r.media_id} : meme_que vers un média inconnu « {r.valeur} »")
        if r.regle == "detenteur" and (
            not r.valeur or r.type_proprietaire not in TYPES_PROPRIETAIRE or not r.source
        ):
            erreurs.append(f"{r.media_id} : détenteur sans nom, type valide ou source")
    if erreurs:
        raise ErreurProprietes("proprietes_corrections.csv :\n  - " + "\n  - ".join(erreurs))
    return corr


def type_proprietaire(nom: str, personnes: set[str]) -> str:
    if nom in personnes:
        return "personne"
    return "etat" if MOTIF_ETAT.match(nom) else "organisation"


def rattacher(
    ref: pd.DataFrame,
    medias_base: list[str],
    detenteurs: dict[str, list[Detention]],
    personnes: set[str],
    corrections: pd.DataFrame,
) -> pd.DataFrame:
    """Une ligne par (média, propriétaire ultime) ; une ligne sans propriétaire si non identifié."""
    par_nom = {normaliser(n): n for n in medias_base}
    regle = {r.media_id: r for r in corrections.itertuples() if r.regle != "detenteur"}
    saisies = corrections[corrections["regle"] == "detenteur"]
    lignes: list[dict] = []

    def ajouter(media_id: str, groupe, nom, part, type_, statut, source, date) -> None:
        lignes.append(
            {
                "media_id": media_id,
                "groupe": groupe,
                "proprietaire_id": identifiant(nom) if nom else None,
                "proprietaire": nom,
                "type_proprietaire": type_,
                "part": part,
                "statut": statut,
                "source": source,
                "date": date,
            }
        )

    for m in ref.itertuples():
        if m.generique:
            continue
        r = regle.get(m.media_id)
        if r is not None and r.regle == "meme_que":
            continue  # traité après, une fois le média modèle rattaché
        if r is not None and r.regle == "non_identifie":
            ajouter(m.media_id, None, None, None, None, "non_identifie", None, None)
            continue
        if m.media_id in set(saisies["media_id"]):
            for s in saisies[saisies["media_id"] == m.media_id].itertuples():
                part = float(s.part) / 100 if s.part else None
                ajouter(
                    m.media_id,
                    s.valeur,
                    s.valeur,
                    part,
                    s.type_proprietaire,
                    "correction",
                    s.source,
                    s.date,
                )
            continue
        if r is not None and r.regle == "nom_base":
            nom_base = r.valeur
        else:
            candidats = [normaliser(x) for x in [m.nom, *m.variantes, *m.libelles_arcom]]
            nom_base = next((par_nom[c] for c in candidats if c in par_nom), None)
        if nom_base is None or nom_base not in detenteurs:
            ajouter(m.media_id, None, None, None, None, "non_identifie", None, None)
            continue
        groupe = groupe_principal(nom_base, detenteurs)
        for nom, part in sorted(proprietaires_ultimes(nom_base, detenteurs).items()):
            ajouter(
                m.media_id,
                groupe,
                nom,
                part,
                type_proprietaire(nom, personnes),
                "base",
                SOURCE_BASE,
                DATE_BASE,
            )

    sortie = pd.DataFrame(lignes)
    for r in corrections[corrections["regle"] == "meme_que"].itertuples():
        modele = sortie[sortie["media_id"] == r.valeur].copy()
        if modele.empty:
            raise ErreurProprietes(f"{r.media_id} : meme_que « {r.valeur} » sans propriétaire")
        modele["media_id"] = r.media_id
        modele["statut"] = "meme_que"
        sortie = pd.concat([sortie, modele], ignore_index=True)
    sortie["part"] = sortie["part"].astype("float64")
    return sortie.sort_values(["media_id", "proprietaire"], na_position="last").reset_index(
        drop=True
    )


def couverture(sortie: pd.DataFrame, affichables: list[str]) -> dict:
    statut = sortie.drop_duplicates("media_id").set_index("media_id")["statut"]
    statut = statut.reindex(affichables)
    compte = statut.value_counts().to_dict()
    rattaches = sum(compte.get(s, 0) for s in ("base", "correction", "meme_que"))
    return {
        "medias_affichables": len(affichables),
        "rattaches_base": compte.get("base", 0),
        "rattaches_correction": compte.get("correction", 0),
        "rattaches_meme_que": compte.get("meme_que", 0),
        "non_identifies": compte.get("non_identifie", 0),
        "sans_statut": int(statut.isna().sum()),
        "taux_rattaches": round(rattaches / len(affichables), 4),
        "taux_rattaches_ou_marques": round(1 - statut.isna().sum() / len(affichables), 4),
        "non_identifies_liste": sorted(statut[statut == "non_identifie"].index),
    }


def executer(chemins: Chemins) -> None:
    ref = charger_referentiel(chemins.config / "medias.csv")

    def lire(source_id: str) -> pd.DataFrame:
        return pd.read_csv(
            chemin_source(chemins, source_id), sep="\t", dtype=str, keep_default_na=False
        )

    detenteurs = charger_relations([lire(s) for s in RELATIONS])
    medias_base = lire("mdiplo_medias")["Nom"].str.strip().tolist()
    personnes = set(lire("mdiplo_personnes")["Nom"].str.strip())
    corrections = charger_corrections(
        chemins.config / "proprietes_corrections.csv", set(ref["media_id"])
    )
    sortie = rattacher(ref, medias_base, detenteurs, personnes, corrections)

    medias = pd.read_parquet(chemins.output / "medias.parquet")
    affichables = sorted(medias.loc[medias["affichable"], "media_id"])
    journal = couverture(sortie, affichables)

    chemins.output.mkdir(parents=True, exist_ok=True)
    sortie.to_parquet(chemins.output / "proprietes.parquet", index=False)
    (chemins.output / "journal_proprietes.json").write_text(
        json.dumps(journal, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    log.info(
        "  Propriété des %d médias affichables : %d par la base, %d par correction, %d JT par "
        "leur chaîne, %d non identifiés → %.0f %% rattachés, %.0f %% rattachés ou marqués",
        journal["medias_affichables"],
        journal["rattaches_base"],
        journal["rattaches_correction"],
        journal["rattaches_meme_que"],
        journal["non_identifies"],
        100 * journal["taux_rattaches"],
        100 * journal["taux_rattaches_ou_marques"],
    )
    if journal["sans_statut"]:
        log.warning("  %d médias affichables sans statut de propriété", journal["sans_statut"])


def entrees(chemins: Chemins) -> list[Path]:
    return [
        chemins.config / "medias.csv",
        chemins.config / "proprietes_corrections.csv",
        chemins.output / "medias.parquet",
        *[chemin_source(chemins, s) for s in [*RELATIONS, "mdiplo_medias", "mdiplo_personnes"]],
    ]


def sorties(chemins: Chemins) -> list[Path]:
    return [chemins.output / "proprietes.parquet", chemins.output / "journal_proprietes.json"]
