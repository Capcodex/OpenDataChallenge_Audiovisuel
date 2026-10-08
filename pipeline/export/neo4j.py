"""Chargement de la base graphe d'analyse Neo4j (E0-10, EF-M8-02, CdC technique § 10, ADR-002).

Commande : `python -m pipeline export-neo4j` (service `neo4j`, profil Compose « analyse »).
La base n'est pas utilisée par le site : elle sert à l'analyse et aux chercheurs.

Chargement idempotent depuis les Parquet de data/output (source de vérité) : la base est vidée,
puis rechargée par lots (`UNWIND`).

Modèle :
    (:Media {id, nom, type, public_prive, n_repondants, part_ponderee, fragile, pol_moy, age_moy,
             moins35, confiance, stabilite, pont, x, y})
    (:Media)-[:CO_AUDIENCE {lift, lift_bas, lift_haut, n_communs, affiche}]->(:Media)
        une seule direction, source < cible
    (:Famille {id, nom, taille})       (:Media)-[:MEMBRE_DE {stabilite}]->(:Famille)
    (:Groupe {nom})                    (:Media)-[:APPARTIENT_A]->(:Groupe)
    (:Proprietaire {id, nom, type})    (:Media)-[:DETENU_PAR {part, source, date}]->(:Proprietaire)

`--verifier` exécute ensuite les requêtes d'exemple de docs/requetes.cypher et échoue si l'une
d'elles ne renvoie aucun résultat.
"""

import logging
import os
import re
from pathlib import Path

import pandas as pd
from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError

from pipeline.chemins import Chemins

log = logging.getLogger(__name__)
# Le pilote journalise chaque conseil de performance du serveur : seuls les avertissements restent.
logging.getLogger("neo4j").setLevel(logging.WARNING)

LOT = 500
CONTRAINTES = [
    "CREATE CONSTRAINT media_id IF NOT EXISTS FOR (m:Media) REQUIRE m.id IS UNIQUE",
    "CREATE CONSTRAINT famille_id IF NOT EXISTS FOR (f:Famille) REQUIRE f.id IS UNIQUE",
    "CREATE CONSTRAINT groupe_nom IF NOT EXISTS FOR (g:Groupe) REQUIRE g.nom IS UNIQUE",
    "CREATE CONSTRAINT proprietaire_id IF NOT EXISTS FOR (p:Proprietaire) REQUIRE p.id IS UNIQUE",
]
REQUETES = {
    "medias": """
        UNWIND $lignes AS l
        CREATE (m:Media)
        SET m = l""",
    "familles": """
        UNWIND $lignes AS l
        CREATE (f:Famille {id: l.famille, taille: l.taille})
        SET f.nom = 'Famille ' + toString(l.famille)""",
    "membres": """
        UNWIND $lignes AS l
        MATCH (m:Media {id: l.media_id}), (f:Famille {id: l.famille})
        CREATE (m)-[:MEMBRE_DE {stabilite: l.stabilite}]->(f)""",
    "liens": """
        UNWIND $lignes AS l
        MATCH (a:Media {id: l.source}), (b:Media {id: l.cible})
        CREATE (a)-[:CO_AUDIENCE {lift: l.lift, lift_bas: l.lift_bas, lift_haut: l.lift_haut,
                                  n_communs: l.n_communs, affiche: l.affiche}]->(b)""",
    "groupes": """
        UNWIND $lignes AS l
        MATCH (m:Media {id: l.media_id})
        MERGE (g:Groupe {nom: l.groupe})
        CREATE (m)-[:APPARTIENT_A]->(g)""",
    "proprietaires": """
        UNWIND $lignes AS l
        MATCH (m:Media {id: l.media_id})
        MERGE (p:Proprietaire {id: l.proprietaire_id})
        SET p.nom = l.proprietaire, p.type = l.type_proprietaire
        CREATE (m)-[:DETENU_PAR {part: l.part, source: l.source, date: l.date}]->(p)""",
}


def enregistrements(df: pd.DataFrame) -> list[dict]:
    """Lignes d'un DataFrame en dictionnaires sans NaN (Neo4j refuse NaN : absent = null)."""
    propre = df.astype(object).where(df.notna(), None)
    return propre.to_dict(orient="records")


def preparer(sorties: Path) -> dict[str, list[dict]]:
    lire = lambda nom: pd.read_parquet(sorties / nom)  # noqa: E731
    medias = lire("medias.parquet")
    medias = medias[medias["affichable"]]
    attributs = lire("attributs_medias.parquet")
    familles = lire("familles.parquet")
    disposition = lire("disposition.parquet")
    proprietes = lire("proprietes.parquet")
    proprietes = proprietes[proprietes["media_id"].isin(medias["media_id"])]

    noeuds = (
        medias[
            ["media_id", "nom", "type", "public_prive", "n_repondants", "part_ponderee", "fragile"]
        ]
        .merge(attributs[["media_id", "pol_moy", "age_moy", "moins35", "conf_ref"]], on="media_id")
        .merge(familles[["media_id", "stabilite", "pont"]], on="media_id")
        .merge(disposition, on="media_id")
        .rename(columns={"media_id": "id", "conf_ref": "confiance"})
    )
    tailles = familles["famille"].value_counts().rename("taille").reset_index()
    return {
        "medias": enregistrements(noeuds),
        "familles": enregistrements(tailles),
        "membres": enregistrements(familles[["media_id", "famille", "stabilite"]]),
        "liens": enregistrements(lire("liens.parquet")),
        "groupes": enregistrements(
            proprietes.drop_duplicates("media_id").dropna(subset=["groupe"])[["media_id", "groupe"]]
        ),
        "proprietaires": enregistrements(proprietes.dropna(subset=["proprietaire_id"])),
    }


def charger(pilote, donnees: dict[str, list[dict]]) -> dict[str, int]:
    with pilote.session() as session:
        session.run("MATCH (n) DETACH DELETE n").consume()
        for contrainte in CONTRAINTES:
            session.run(contrainte).consume()
        for nom, requete in REQUETES.items():
            lignes = donnees[nom]
            for debut in range(0, len(lignes), LOT):
                session.run(requete, lignes=lignes[debut : debut + LOT]).consume()
        compte = session.run(
            "MATCH (n) WITH labels(n)[0] AS etiquette, count(*) AS n RETURN etiquette, n"
        )
        return {r["etiquette"]: r["n"] for r in compte}


def lire_requetes(chemin: Path) -> dict[str, str]:
    """Requêtes d'exemple : chaque bloc commence par un commentaire `// titre` et finit par `;`."""
    requetes = {}
    for bloc in chemin.read_text(encoding="utf-8").split(";"):
        lignes = [ligne for ligne in bloc.strip().splitlines() if ligne.strip()]
        titres = [ligne for ligne in lignes if ligne.startswith("//")]
        code = "\n".join(ligne for ligne in lignes if not ligne.startswith("//"))
        if code:
            titre = re.sub(r"^//\s*", "", titres[-1]) if titres else f"requête {len(requetes) + 1}"
            requetes[titre] = code
    return requetes


def verifier(pilote, requetes: dict[str, str]) -> list[str]:
    """Exécute chaque requête d'exemple ; renvoie les titres de celles qui échouent ou ne renvoient
    rien."""
    vides = []
    with pilote.session() as session:
        for titre, code in requetes.items():
            try:
                lignes = list(session.run(code))
            except Neo4jError as e:
                log.error("  %s : erreur %s", titre, e.message)
                vides.append(titre)
                continue
            log.info("  %-60s %d ligne(s)", titre[:60], len(lignes))
            if not lignes:
                vides.append(titre)
    return vides


def exporter(chemins: Chemins, requetes: Path | None = None) -> int:
    mot_de_passe = os.environ.get("NEO4J_PASSWORD", "")
    if not mot_de_passe:
        log.error(
            "NEO4J_PASSWORD absent : copier .env.example en .env et renseigner le mot de passe"
        )
        return 2
    uri = os.environ.get("NEO4J_URI", "bolt://neo4j:7687")
    donnees = preparer(chemins.output)
    with GraphDatabase.driver(uri, auth=("neo4j", mot_de_passe)) as pilote:
        pilote.verify_connectivity()
        comptes = charger(pilote, donnees)
        log.info(
            "Neo4j chargé (%s) : %s", uri, ", ".join(f"{k} {v}" for k, v in sorted(comptes.items()))
        )
        if requetes is not None:
            vides = verifier(pilote, lire_requetes(requetes))
            if vides:
                log.error("Requêtes sans résultat : %s", ", ".join(vides))
                return 1
    return 0
