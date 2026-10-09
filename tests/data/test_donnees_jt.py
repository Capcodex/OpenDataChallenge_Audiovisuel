"""Module JT (T-052) : écart nul avec les valeurs de référence de la maquette, calculées sur les
mêmes données INA (tests/fixtures/jt_reference.json)."""

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from pipeline.chemins import Chemins
from pipeline.compute.jt import MESURES, repartition
from pipeline.prepare.jt import CHAINES, RUBRIQUES

pytestmark = pytest.mark.data

CHEMINS = Chemins.depuis_environnement()
PROFILS = CHEMINS.output / "jt_profils.parquet"
SIMILARITES = CHEMINS.output / "jt_similarites.parquet"
REFERENCE = json.loads(
    (Path(__file__).parents[1] / "fixtures" / "jt_reference.json").read_text(encoding="utf-8")
)
# Clés de mesure de la maquette : n = nombre de sujets, d = durée.
MESURE_MAQUETTE = {"sujets": "n", "duree": "d"}

if not (PROFILS.exists() and SIMILARITES.exists()):
    pytest.skip("Sorties JT absentes : lancer `make pipeline` d'abord", allow_module_level=True)


@pytest.fixture(scope="module")
def profils():
    return pd.read_parquet(PROFILS)


@pytest.fixture(scope="module")
def similarites():
    return pd.read_parquet(SIMILARITES)


def test_chaines_dans_le_meme_ordre_que_la_reference():
    assert REFERENCE["chaines"] == CHAINES


@pytest.mark.parametrize("periode", list(REFERENCE["periodes"]))
@pytest.mark.parametrize("mesure", list(MESURES))
def test_parts_des_rubriques_identiques_a_la_reference(profils, periode, mesure):
    debut, fin = map(int, periode.split("-"))
    detaillees = REFERENCE["rubriques_affichees"][:-1]  # la dernière regroupe les autres
    attendu = np.array(REFERENCE["periodes"][periode][MESURE_MAQUETTE[mesure]]["shares"])
    for i, chaine in enumerate(CHAINES):
        parts = dict(
            zip(RUBRIQUES, repartition(profils, chaine, debut, fin, MESURES[mesure]), strict=True)
        )
        obtenu = [100 * parts[r] for r in detaillees]
        obtenu.append(100 * sum(v for r, v in parts.items() if r not in detaillees))
        np.testing.assert_array_equal(np.round(obtenu, 1), attendu[i], err_msg=chaine)


@pytest.mark.parametrize("periode", list(REFERENCE["periodes"]))
@pytest.mark.parametrize("mesure", list(MESURES))
def test_similarites_identiques_a_la_reference(similarites, periode, mesure):
    attendu = np.array(REFERENCE["periodes"][periode][MESURE_MAQUETTE[mesure]]["sim"])
    s = similarites[(similarites["periode"] == periode) & (similarites["mesure"] == mesure)]
    for r in s.itertuples():
        i, j = CHAINES.index(r.chaine_a), CHAINES.index(r.chaine_b)
        assert round(r.similarite_js, 2) == pytest.approx(attendu[i, j]), (r.chaine_a, r.chaine_b)


def test_parts_somme_un(profils):
    sommes = profils.groupby(["chaine", "annee"])[["part_sujets", "part_duree"]].sum()
    np.testing.assert_allclose(sommes.to_numpy(), 1.0)
