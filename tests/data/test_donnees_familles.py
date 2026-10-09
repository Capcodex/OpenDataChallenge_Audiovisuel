"""Contrôles sur les familles et la disposition réelles (T-036, RG-07, ENF-12)."""

import json

import numpy as np
import pandas as pd
import pytest

from pipeline.chemins import Chemins
from pipeline.compute.disposition import calculer as disposer
from pipeline.compute.familles import calculer, selectionner_liens
from pipeline.config import charger_params

pytestmark = pytest.mark.data

CHEMINS = Chemins.depuis_environnement()
FAMILLES = CHEMINS.output / "familles.parquet"
DISPOSITION = CHEMINS.output / "disposition.parquet"

if not (FAMILLES.exists() and DISPOSITION.exists()):
    pytest.skip("Sorties absentes : lancer `make pipeline` d'abord", allow_module_level=True)


@pytest.fixture(scope="module")
def params():
    return charger_params(CHEMINS)


@pytest.fixture(scope="module")
def entrees():
    medias_ref = pd.read_parquet(CHEMINS.output / "medias.parquet")
    medias = sorted(medias_ref.loc[medias_ref["affichable"], "media_id"])
    return medias, pd.read_parquet(CHEMINS.output / "liens.parquet")


def test_chaque_media_affichable_a_une_famille_et_une_position(entrees):
    medias, _ = entrees
    assert sorted(pd.read_parquet(FAMILLES)["media_id"]) == medias
    assert sorted(pd.read_parquet(DISPOSITION)["media_id"]) == medias


def test_rg07_appliquee(params):
    familles = pd.read_parquet(FAMILLES)
    journal = json.loads((CHEMINS.output / "journal_familles.json").read_text(encoding="utf-8"))
    c = params.communautes
    part = (familles["stabilite"] >= c.stabilite_noeud_min).mean()
    assert journal["part_medias_stables"] == pytest.approx(part, abs=1e-4)
    assert journal["familles_affichees"] == (part >= c.part_noeuds_stables_min)
    assert familles["pont"].sum() == c.ponts_nombre


def test_familles_reproductibles(entrees, params):
    medias, liens = entrees
    table = pd.read_parquet(CHEMINS.interim / "repondant_media.parquet")
    sortie, _ = calculer(
        table[medias].to_numpy(dtype=np.float64),
        table["poids"].to_numpy(dtype=np.float64),
        medias,
        selectionner_liens(liens, params.communautes.liens),
        params,
    )
    pd.testing.assert_frame_equal(sortie, pd.read_parquet(FAMILLES))


def test_disposition_reproductible(entrees, params):
    medias, liens = entrees
    sortie = disposer(
        medias,
        liens[liens["affiche"]].reset_index(drop=True),
        params.layout.iterations,
        params.seed,
    )
    pd.testing.assert_frame_equal(sortie, pd.read_parquet(DISPOSITION))


def test_positionnement_des_publics_de_familles_publie_et_coherent():
    """V2, ADR-011 : chaque famille publie le positionnement de son public, avec sa marge, et un
    libellé relatif cohérent avec l'ordre des moyennes."""
    graphe = json.loads((CHEMINS.site_public / "data" / "graph.json").read_text())
    familles = graphe["communities"]
    rang = {"gauche": 0, "centre": 1, "droite": 2}
    for f in familles:
        moy, bas, haut = f["pol"]
        assert 0 <= bas <= moy <= haut <= 10
        assert f["pol_n"] > 0
    positions = [f["position"] for f in sorted(familles, key=lambda f: f["pol"][0])]
    if any(positions):
        assert positions[0] == "gauche" and positions[-1] == "droite"
        assert [rang[p] for p in positions] == sorted(rang[p] for p in positions)
    if not graphe["meta"]["communities_displayed"]:
        assert not any(positions)
