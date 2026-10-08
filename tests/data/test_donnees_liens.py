"""Contrôles sur les liens et les attributs réels (T-020, T-024, CdC technique § 12.1).

Les effectifs communs et le positionnement politique sont recomptés à partir du fichier brut de
l'Arcom, par un chemin de calcul indépendant du pipeline (DuckDB, format long).
"""

import duckdb
import numpy as np
import pandas as pd
import pytest

from pipeline.chemins import Chemins
from pipeline.compute.coaudience import calculer_paires
from pipeline.config import charger_params, charger_yaml, chemin_source

pytestmark = pytest.mark.data

CHEMINS = Chemins.depuis_environnement()
LIENS = CHEMINS.output / "liens.parquet"
ATTRIBUTS = CHEMINS.output / "attributs_medias.parquet"
PAIRES = CHEMINS.interim / "paires.parquet"

if not (LIENS.exists() and ATTRIBUTS.exists() and PAIRES.exists()):
    pytest.skip("Sorties absentes : lancer `make pipeline` d'abord", allow_module_level=True)


@pytest.fixture(scope="module")
def params():
    return charger_params(CHEMINS)


@pytest.fixture(scope="module")
def liens():
    return pd.read_parquet(LIENS)


@pytest.fixture(scope="module")
def medias():
    return pd.read_parquet(CHEMINS.output / "medias.parquet").set_index("media_id")


def test_aucun_lien_hors_rg04_rg05(liens, params):
    assert (liens["n_communs"] >= params.seuils.lien_effectif_commun_min).all()
    assert (liens["lift_bas"] > params.seuils.lien_lift_borne_basse_min).all()


def test_liens_uniquement_entre_medias_affichables(liens, medias):
    extremites = set(liens["source"]) | set(liens["cible"])
    assert medias.loc[sorted(extremites), "affichable"].all()


def test_effectifs_communs_recomptes_depuis_la_table(liens):
    table = pd.read_parquet(CHEMINS.interim / "repondant_media.parquet")
    echantillon = liens.sample(min(50, len(liens)), random_state=0)
    for lien in echantillon.itertuples():
        assert lien.n_communs == int((table[lien.source] & table[lien.cible]).sum())


def test_journal_coherent(liens):
    import json

    journal = json.loads((CHEMINS.output / "journal_coaudience.json").read_text(encoding="utf-8"))
    n = journal["medias_affichables"]
    assert journal["paires_testees"] == n * (n - 1) // 2
    assert journal["liens_retenus"] == len(liens)
    assert journal["paires_testees"] == (
        journal["liens_retenus"]
        + journal["rejet_effectif_commun_rg04"]
        + journal["rejet_borne_basse_rg05"]
    )


def test_liens_reproductibles(liens, medias, params):
    """Un nouveau calcul à graine fixe redonne exactement les mêmes liens (ENF-12)."""
    table = pd.read_parquet(CHEMINS.interim / "repondant_media.parquet")
    affichables = medias.index[medias["affichable"]].tolist()
    paires = calculer_paires(
        table[affichables].to_numpy(dtype=np.float64),
        table["poids"].to_numpy(dtype=np.float64),
        affichables,
        params,
    )
    pd.testing.assert_frame_equal(paires, pd.read_parquet(PAIRES))


def test_positionnement_politique_recompte_depuis_le_fichier_brut():
    """Moyenne pondérée de la note 0-10, recalculée en SQL à partir du fichier de l'Arcom."""
    cfg = charger_yaml(CHEMINS.config / "variables_arcom.yaml")
    codes = cfg["profil"]["politique"]["codes"]
    brut = pd.read_csv(
        chemin_source(CHEMINS, cfg["sources"]["base"]), sep=";", decimal=",", low_memory=False
    )
    colonnes = [c for c in brut.columns if c.startswith("NOU1_R1_")]
    longue = brut[["RECORD2025", "POIDS", *colonnes]].melt(id_vars=["RECORD2025", "POIDS"])
    correspondance = pd.DataFrame(
        {"value": [float(k) for k in codes], "note": [v["valeur"] for v in codes.values()]}
    )
    table = pd.read_parquet(CHEMINS.interim / "repondant_media.parquet")
    attributs = pd.read_parquet(ATTRIBUTS).set_index("media_id")
    con = duckdb.connect()
    con.register("longue", longue)
    con.register("correspondance", correspondance)
    for media in ["le-monde", "cnews", "france-inter", "hugodecrypte"]:
        con.register("suiveurs", table.loc[table[media] == 1, ["resp_id"]])
        attendu = con.sql(
            """
            SELECT SUM(l.POIDS * c.note) / SUM(l.POIDS)
            FROM longue l
            JOIN correspondance c USING (value)
            JOIN suiveurs s ON s.resp_id = l.RECORD2025
            """
        ).fetchone()[0]
        assert attributs.loc[media, "pol_moy"] == pytest.approx(attendu), media


def test_attributs_pour_chaque_media_affichable(medias):
    attributs = pd.read_parquet(ATTRIBUTS).set_index("media_id")
    assert set(attributs.index) == set(medias.index[medias["affichable"]])
    assert (attributs["n_repondants"] == medias.loc[attributs.index, "n_repondants"]).all()
    assert attributs[["pol_moy", "age_moy", "moins35"]].notna().all(axis=None)


def test_aucune_donnee_sous_les_seuils_dans_les_sorties_agregees(params):
    """ENF-09 : les paires à faible effectif ne sortent pas de data/interim."""
    assert not (CHEMINS.output / "paires.parquet").exists()
    attributs = pd.read_parquet(ATTRIBUTS)
    assert (attributs["n_repondants"] >= params.seuils.media_affichable_min).all()
    publiee = attributs["conf_ref"].notna()
    assert (attributs.loc[publiee, "n_confiance"] >= params.seuils.confiance_effectif_min).all()


def test_liens_affiches_au_moins_les_voisins_min_de_chaque_media(liens, params):
    affiches = liens[liens["affiche"]]
    degre_affiche = pd.concat([affiches["source"], affiches["cible"]]).value_counts()
    degre_total = pd.concat([liens["source"], liens["cible"]]).value_counts()
    attendu = degre_total.clip(upper=params.affichage.voisins_min_par_media)
    assert (degre_affiche.reindex(attendu.index, fill_value=0) >= attendu).all()
