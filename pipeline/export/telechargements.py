"""Étape « telechargements » : données ouvertes (E6-02, EF-M7-04, CdC technique § 8.3).

Écrit dans site/public/telechargements/ (versionné, servi par le site) :
- medias.csv / medias.parquet : médias affichables, profils des publics, familles, positions ;
- liens.csv / liens.parquet : liens de co-audience retenus (RG-04, RG-05), dont ceux tracés ;
- proprietes.csv / proprietes.parquet : propriétaires des médias affichables ;
- graphe.gexf : graphe complet pour Gephi ;
- dictionnaire.md : description de chaque colonne, généré à partir de COLONNES.

Seuls des agrégats au-dessus des seuils sont exportés (ENF-09). CSV en UTF-8, séparateur
virgule, point décimal, réels arrondis à 6 décimales.
"""

import logging
import re
from pathlib import Path

import networkx as nx
import pandas as pd

from pipeline.chemins import Chemins
from pipeline.config import Params, charger_params

log = logging.getLogger(__name__)

# Description de chaque colonne exportée : (unité ou type, définition). Une colonne exportée sans
# description fait échouer l'étape : le dictionnaire est toujours complet.
COLONNES: dict[str, dict[str, tuple[str, str]]] = {
    "medias": {
        "media_id": ("texte", "Identifiant stable du média"),
        "nom": ("texte", "Nom affiché"),
        "type": ("texte", "radio, journal, magazine, tv, info, web, createur, jt"),
        "public_prive": ("texte", "public (service public), prive, autre, na"),
        "n_repondants": ("répondants", "Répondants (non pondéré) qui suivent le média ; ≥ 50"),
        "part_ponderee": ("part 0-1", "Part pondérée des 2 939 répondants qui suivent le média"),
        "fragile": ("booléen", "Moins de 100 répondants : chiffres fragiles (RG-03)"),
        "pol_n": ("répondants", "Public ayant donné une note politique"),
        "pol_moy": ("note 0-10", "Positionnement politique moyen du public (0 très à gauche)"),
        "pol_bas": ("note 0-10", "Borne basse de l'intervalle à 95 % de pol_moy"),
        "pol_haut": ("note 0-10", "Borne haute de l'intervalle à 95 % de pol_moy"),
        "pol_part_nr": ("part 0-1", "Part du public sans note politique"),
        "age_moy": ("années", "Âge moyen approché du public (âge connu par classes, ADR-006)"),
        "age_bas": ("années", "Borne basse de l'intervalle à 95 % de age_moy"),
        "age_haut": ("années", "Borne haute de l'intervalle à 95 % de age_moy"),
        "moins35": ("part 0-1", "Part du public âgée de moins de 35 ans"),
        "moins35_bas": ("part 0-1", "Borne basse de l'intervalle à 95 % de moins35"),
        "moins35_haut": ("part 0-1", "Borne haute de l'intervalle à 95 % de moins35"),
        "n_confiance": ("réponses", "Réponses de confiance ; vide si conf_ref n'est pas publié"),
        "conf_ref": (
            "part 0-1",
            "Part « source de référence » ; vide sous 50 réponses ou pour un JT",
        ),
        "conf_ref_bas": ("part 0-1", "Borne basse de l'intervalle à 95 % de conf_ref"),
        "conf_ref_haut": ("part 0-1", "Borne haute de l'intervalle à 95 % de conf_ref"),
        "n_conf_gauche": (
            "réponses",
            "Réponses de confiance des répondants notés 0 à 4 (si écart publié)",
        ),
        "n_conf_droite": (
            "réponses",
            "Réponses de confiance des répondants notés 6 à 10 (si écart publié)",
        ),
        "conf_ecart_gd": (
            "écart -1 à 1",
            "conf_ref à gauche moins à droite ; vide sous 30 par côté",
        ),
        "conf_ecart_gd_bas": (
            "écart -1 à 1",
            "Borne basse de l'intervalle à 95 % de conf_ecart_gd",
        ),
        "conf_ecart_gd_haut": (
            "écart -1 à 1",
            "Borne haute de l'intervalle à 95 % de conf_ecart_gd",
        ),
        "famille": ("entier", "Famille de médias détectée par Leiden (RG-06) ; 1 = la plus grande"),
        "stabilite": (
            "part 0-1",
            "Part des 100 sous-échantillons où le média reste dans sa famille",
        ),
        "intermediarite": ("0-1", "Intermédiarité pondérée (distance = 1 / lift), normalisée"),
        "participation": ("0-1", "Coefficient de participation aux familles"),
        "pont": ("booléen", "Parmi les 10 médias à la participation la plus forte"),
        "x": ("0-1", "Position horizontale sur la carte (ForceAtlas2)"),
        "y": ("0-1", "Position verticale sur la carte, croissante vers le bas"),
        "groupe": ("texte", "Détenteur direct principal ; vide si non identifié"),
    },
    "liens": {
        "source": ("texte", "media_id du premier média (ordre alphabétique)"),
        "cible": ("texte", "media_id du second média"),
        "lift": ("rapport", "P(A et B) / (P(A) × P(B)), probabilités pondérées (RG-15)"),
        "lift_bas": ("rapport", "Borne basse de l'intervalle à 95 % ; > 1 (RG-05)"),
        "lift_haut": ("rapport", "Borne haute de l'intervalle à 95 %"),
        "n_communs": ("répondants", "Répondants qui suivent les deux médias ; ≥ 30 (RG-04)"),
        "affiche": ("booléen", "Lien tracé sur la carte (ADR-005)"),
    },
    "proprietes": {
        "media_id": ("texte", "Identifiant du média"),
        "groupe": ("texte", "Détenteur direct principal"),
        "proprietaire_id": ("texte", "Identifiant du propriétaire ultime ; vide si non identifié"),
        "proprietaire": ("texte", "Propriétaire ultime (sommet de la chaîne de détention)"),
        "type_proprietaire": ("texte", "personne (ou famille), etat, organisation"),
        "part": (
            "part 0-1",
            "Part effective du capital ; vide si une part de la chaîne est inconnue",
        ),
        "statut": ("texte", "base, correction (saisie sourcée), meme_que (JT), non_identifie"),
        "source": ("texte", "Source de l'information"),
        "date": ("date", "Date de la source"),
    },
}


class ErreurTelechargements(Exception):
    """Colonne exportée sans description dans le dictionnaire."""


def tables(sorties: Path) -> dict[str, pd.DataFrame]:
    lire = lambda nom: pd.read_parquet(sorties / nom)  # noqa: E731
    medias = lire("medias.parquet")
    affichables = medias.loc[medias["affichable"], "media_id"]
    proprietes = lire("proprietes.parquet")
    groupes = proprietes.drop_duplicates("media_id").set_index("media_id")["groupe"]

    m = (
        medias[medias["affichable"]][
            ["media_id", "nom", "type", "public_prive", "n_repondants", "part_ponderee", "fragile"]
        ]
        .merge(
            lire("attributs_medias.parquet").drop(columns=["n_repondants", "fragile"]),
            on="media_id",
        )
        .merge(lire("familles.parquet"), on="media_id")
        .merge(lire("disposition.parquet"), on="media_id")
    )
    m["groupe"] = m["media_id"].map(groupes)
    # ENF-09 : un effectif n'est publié qu'avec l'indicateur qu'il accompagne ; sous le seuil de
    # publication, l'effectif lui-même est une case sous les seuils.
    m["n_confiance"] = m["n_confiance"].where(m["conf_ref"].notna()).astype("Int64")
    for col in ("n_conf_gauche", "n_conf_droite"):
        m[col] = m[col].where(m["conf_ecart_gd"].notna()).astype("Int64")
    return {
        "medias": m.sort_values("media_id").reset_index(drop=True),
        "liens": lire("liens.parquet").sort_values(["source", "cible"]).reset_index(drop=True),
        "proprietes": proprietes[proprietes["media_id"].isin(affichables)].reset_index(drop=True),
    }


def verifier_dictionnaire(donnees: dict[str, pd.DataFrame]) -> None:
    for nom, table in donnees.items():
        manquantes = sorted(set(table.columns) - set(COLONNES[nom]))
        if manquantes:
            raise ErreurTelechargements(f"{nom} : colonnes sans description {manquantes}")


def gexf(donnees: dict[str, pd.DataFrame], date: str) -> str:
    """Graphe complet pour Gephi. La date de modification est celle du traitement (et non celle de
    l'horloge) pour que le fichier soit reproductible."""
    g = nx.Graph()
    for r in donnees["medias"].itertuples():
        g.add_node(
            r.media_id,
            label=r.nom,
            type=r.type,
            n_repondants=int(r.n_repondants),
            famille=int(r.famille),
            pol_moy=round(float(r.pol_moy), 3),
            age_moy=round(float(r.age_moy), 1),
            pont=bool(r.pont),
            viz={"position": {"x": 1000 * r.x, "y": -1000 * r.y, "z": 0.0}},
        )
    for r in donnees["liens"].itertuples():
        g.add_edge(
            r.source,
            r.cible,
            weight=round(float(r.lift), 3),
            lift_bas=round(float(r.lift_bas), 3),
            n_communs=int(r.n_communs),
            affiche=bool(r.affiche),
        )
    texte = "\n".join(nx.generate_gexf(g)) + "\n"
    return re.sub(r'lastmodifieddate="[^"]*"', f'lastmodifieddate="{date}"', texte)


def dictionnaire(donnees: dict[str, pd.DataFrame], params: Params) -> str:
    parties = [
        "# Dictionnaire des données téléchargeables",
        "",
        f"Édition {params.edition} du baromètre de l'Arcom · traitement du "
        f"{params.publication.date_traitement} · {params.publication.adresse_site}",
        "",
        "Données agrégées uniquement, au-dessus des seuils d'effectif (aucune réponse "
        "individuelle). Méthode : page « Méthode » du site. CSV en UTF-8, séparateur virgule, "
        "point décimal ; mêmes tables en Parquet.",
        "",
        "**Licence et citation.** Licence Ouverte v2.0. Citer : « Source : Arcom, baromètre Les "
        "Français et l'information "
        f"{params.edition} ; traitement : Graphe des médias ». Données de propriété : Le Monde "
        "diplomatique / Acrimed, Médias français, licence ODC-By (attribution obligatoire).",
        "",
    ]
    for nom, table in donnees.items():
        parties += [
            f"## `{nom}.csv` · {len(table)} lignes",
            "",
            "| Colonne | Unité | Définition |",
            "|---|---|---|",
        ]
        parties += [
            f"| `{c}` | {COLONNES[nom][c][0]} | {COLONNES[nom][c][1]} |" for c in table.columns
        ]
        parties.append("")
    parties += [
        "## `graphe.gexf`",
        "",
        "Graphe complet pour Gephi : nœuds = médias de `medias.csv` (avec leur position), arêtes = "
        "liens de `liens.csv` (poids = lift).",
        "",
    ]
    return "\n".join(parties)


def executer(chemins: Chemins) -> None:
    params = charger_params(chemins)
    donnees = tables(chemins.output)
    verifier_dictionnaire(donnees)
    dossier = chemins.site_public / "telechargements"
    dossier.mkdir(parents=True, exist_ok=True)
    for nom, table in donnees.items():
        table.to_csv(dossier / f"{nom}.csv", index=False, float_format="%.6g", lineterminator="\n")
        table.to_parquet(dossier / f"{nom}.parquet", index=False)
    (dossier / "graphe.gexf").write_text(
        gexf(donnees, params.publication.date_traitement), encoding="utf-8"
    )
    (dossier / "dictionnaire.md").write_text(dictionnaire(donnees, params), encoding="utf-8")
    log.info(
        "  Téléchargements : %s",
        ", ".join(f"{nom} ({len(t)} lignes)" for nom, t in donnees.items()),
    )


def entrees(chemins: Chemins) -> list[Path]:
    o = chemins.output
    return [
        chemins.config / "params.yaml",
        *[
            o / f
            for f in (
                "medias.parquet",
                "attributs_medias.parquet",
                "familles.parquet",
                "disposition.parquet",
                "liens.parquet",
                "proprietes.parquet",
            )
        ],
    ]


def sorties(chemins: Chemins) -> list[Path]:
    dossier = chemins.site_public / "telechargements"
    fichiers = [f"{n}.{ext}" for n in COLONNES for ext in ("csv", "parquet")]
    return [dossier / f for f in [*fichiers, "graphe.gexf", "dictionnaire.md"]]
