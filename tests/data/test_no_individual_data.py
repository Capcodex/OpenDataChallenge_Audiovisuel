"""ENF-09 (T-048) : rien de ce que publie le site ne contient de donnée individuelle ni de case
sous les seuils. Contrôle tous les fichiers de site/public/data et site/public/telechargements."""

import json

import pandas as pd
import pytest

from pipeline.chemins import Chemins
from pipeline.config import charger_params

pytestmark = pytest.mark.data

CHEMINS = Chemins.depuis_environnement()
GRAPHE = CHEMINS.site_public / "data" / "graph.json"
TELECHARGEMENTS = CHEMINS.site_public / "telechargements"
COLONNES_INTERDITES = {"resp_id", "record2025", "poids", "niveau", "age_classe", "pol"}
ATTENDUS = {
    "data": {".gitkeep", "graph.json"},
    "telechargements": {
        ".gitkeep",
        "dictionnaire.md",
        "graphe.gexf",
        "journal.json",
        *[f"{t}.{e}" for t in ("medias", "liens", "proprietes") for e in ("csv", "parquet")],
    },
}

if not GRAPHE.exists():
    pytest.skip("graph.json absent : lancer `make pipeline` d'abord", allow_module_level=True)


@pytest.fixture(scope="module")
def seuils():
    return charger_params(CHEMINS).seuils


@pytest.fixture(scope="module")
def graphe():
    return json.loads(GRAPHE.read_text(encoding="utf-8"))


def test_aucun_fichier_inattendu_dans_le_dossier_publie():
    for dossier, attendus in ATTENDUS.items():
        presents = {f.name for f in (CHEMINS.site_public / dossier).iterdir()}
        assert presents <= attendus, f"{dossier} : fichiers inattendus {presents - attendus}"


def test_aucune_colonne_individuelle_dans_les_tables():
    for fichier in TELECHARGEMENTS.glob("*.csv"):
        colonnes = {c.lower() for c in pd.read_csv(fichier, nrows=0).columns}
        assert not colonnes & COLONNES_INTERDITES, fichier.name


def test_effectifs_publies_au_dessus_des_seuils(seuils):
    medias = pd.read_csv(TELECHARGEMENTS / "medias.csv")
    assert (medias["n_repondants"] >= seuils.media_affichable_min).all()
    assert (medias["n_confiance"].dropna() >= seuils.confiance_effectif_min).all()
    for col in ("n_conf_gauche", "n_conf_droite"):
        assert (medias[col].dropna() >= seuils.ecart_effectif_min_par_bord).all()
    liens = pd.read_csv(TELECHARGEMENTS / "liens.csv")
    assert (liens["n_communs"] >= seuils.lien_effectif_commun_min).all()


def test_graph_json_au_dessus_des_seuils(graphe, seuils):
    assert all(n["n"] >= seuils.media_affichable_min for n in graphe["nodes"])
    assert all(e["n"] >= seuils.lien_effectif_commun_min for e in graphe["edges"])
    # Médias sous le seuil : nom seulement, aucun indicateur ni effectif (RG-02).
    assert all(set(o) == {"id", "label", "aliases", "type"} for o in graphe["others"])


def test_aucun_identifiant_de_repondant_dans_le_texte_publie():
    ids = set(pd.read_parquet(CHEMINS.interim / "repondant_media.parquet")["resp_id"].astype(str))
    for fichier in [GRAPHE, TELECHARGEMENTS / "journal.json"]:
        texte = fichier.read_text(encoding="utf-8")
        assert "resp_id" not in texte and "RECORD2025" not in texte
    # Les identifiants Arcom sont des nombres longs : aucun ne doit apparaître comme valeur.
    longs = {i for i in ids if len(i) >= 6}
    valeurs = set(pd.read_csv(TELECHARGEMENTS / "liens.csv").astype(str).to_numpy().ravel())
    assert not valeurs & longs


def test_donnees_neo4j_preparees_sans_nan():
    import math

    from pipeline.export.neo4j import preparer

    donnees = preparer(CHEMINS.output)
    assert len(donnees["medias"]) == len(json.loads(GRAPHE.read_text("utf-8"))["nodes"])
    for lignes in donnees.values():
        for ligne in lignes:
            assert not any(isinstance(v, float) and math.isnan(v) for v in ligne.values())
