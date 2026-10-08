"""Tests du calcul des liens (T-020, CdC technique § 12.1)."""

import numpy as np
import pandas as pd
import pytest

from pipeline.compute import bootstrap
from pipeline.compute.coaudience import calculer_paires, filtrer, lift_reference, matrice_lift

# 4 répondants, 3 médias. Poids 1, 1, 1, 3 (total 6).
X = np.array(
    [
        [1, 1, 0],
        [1, 1, 0],
        [1, 0, 1],
        [0, 0, 1],
    ],
    dtype=np.float64,
)
W = np.array([1.0, 1.0, 1.0, 3.0])


def test_lift_sur_une_matrice_jouet_au_resultat_connu():
    lift = matrice_lift(X, W)
    # p_a = 3/6, p_b = 2/6, p_c = 4/6 ; p_ab = 2/6, p_ac = 1/6, p_bc = 0.
    assert lift[0, 1] == pytest.approx((2 / 6) / ((3 / 6) * (2 / 6)))  # 2
    assert lift[0, 2] == pytest.approx((1 / 6) / ((3 / 6) * (4 / 6)))  # 0,5
    assert lift[1, 2] == 0
    np.testing.assert_allclose(lift, lift.T)


def test_lift_invariant_a_l_echelle_des_poids():
    np.testing.assert_allclose(matrice_lift(X, W), matrice_lift(X, W * 1000))


def test_lift_vaut_1_pour_des_medias_independants():
    # Chaque combinaison (a, b) présente une fois : a et b indépendants.
    x = np.array([[1, 1], [1, 0], [0, 1], [0, 0]], dtype=np.float64)
    assert matrice_lift(x, np.ones(4))[0, 1] == pytest.approx(1)


def test_tirages_reproductibles_a_graine_fixe():
    a = bootstrap.multiplicites(50, 20, graine=7)
    np.testing.assert_array_equal(a, bootstrap.multiplicites(50, 20, graine=7))
    assert not np.array_equal(a, bootstrap.multiplicites(50, 20, graine=8))
    assert (a.sum(axis=1) == 50).all()  # chaque tirage contient n répondants


def test_paires_reproductibles_et_ordonnees(fabrique_params):
    rng = np.random.default_rng(0)
    x = (rng.random((300, 4)) < 0.4).astype(np.float64)
    w = rng.uniform(0.5, 2, 300)
    params = fabrique_params(bootstrap={"iterations": 200})
    medias = ["d", "b", "c", "a"]
    p1 = calculer_paires(x, w, medias, params)
    pd.testing.assert_frame_equal(p1, calculer_paires(x, w, medias, params))
    assert len(p1) == 6
    assert (p1["source"] < p1["cible"]).all()
    assert (p1["lift_bas"] <= p1["lift"]).all() and (p1["lift"] <= p1["lift_haut"]).all()
    # La paire (a, d) correspond aux colonnes 3 et 0.
    ad = p1.set_index(["source", "cible"]).loc[("a", "d")]
    assert ad["lift"] == pytest.approx(matrice_lift(x, w)[3, 0])
    assert ad["n_communs"] == int((x[:, 3] * x[:, 0]).sum())


def test_filtrage_rg04_rg05_et_journal(fabrique_params):
    params = fabrique_params()  # 30 répondants en commun, borne basse > 1
    paires = pd.DataFrame(
        {
            "source": ["a", "a", "a", "b"],
            "cible": ["b", "c", "d", "c"],
            "lift": [2.0, 3.0, 1.2, 1.5],
            "lift_bas": [1.5, 2.0, 1.0, 0.9],
            "lift_haut": [2.5, 4.0, 1.4, 2.0],
            "n_communs": [30, 29, 100, 10],
        }
    )
    liens, journal = filtrer(paires, params)
    assert list(zip(liens["source"], liens["cible"], strict=True)) == [("a", "b")]
    # a-c : effectif ; a-d : borne basse égale à 1, pas strictement supérieure ; b-c : effectif
    # (premier motif de rejet).
    assert journal == {
        "paires_testees": 4,
        "liens_retenus": 1,
        "rejet_effectif_commun_rg04": 2,
        "rejet_borne_basse_rg05": 1,
    }


def test_lift_reference_intensite():
    # Poids égaux ; k = 1, 1, 2, 4 médias suivis : E[k] = 2, E[k²] = 22 / 4 = 5,5.
    table = pd.DataFrame(
        {
            "resp_id": range(4),
            "poids": [1.0] * 4,
            "a": [1, 1, 1, 1],
            "b": [0, 0, 1, 1],
            "c": [0, 0, 0, 1],
            "d": [0, 0, 0, 1],
        }
    )
    assert lift_reference(table) == pytest.approx(5.5 / 4)
    # Tout le monde suit autant de médias : aucun effet d'intensité.
    table[["b", "c", "d"]] = 1
    assert lift_reference(table) == pytest.approx(1)
