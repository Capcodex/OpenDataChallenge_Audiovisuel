"""Positionnement du public des familles et libellé relatif (V2, ADR-011)."""

import numpy as np
import pytest

from pipeline.compute.publics_familles import (
    appartenance,
    positionnement_familles,
    positions_relatives,
)


def test_appartenance_au_moins_un_media():
    suit = np.array([[1, 0, 0], [0, 1, 1], [0, 0, 0]], dtype=float)
    familles_des_medias = np.array([1, 2, 2])
    assert appartenance(suit, familles_des_medias, [1, 2]).tolist() == [[1, 0], [0, 1], [0, 0]]


def test_positionnement_pondere_sans_les_non_reponses():
    membres = np.array([[1.0], [1.0], [1.0]])
    pol = np.array([2.0, 8.0, np.nan])
    poids = np.array([1.0, 3.0, 5.0])
    tirages = np.tile(poids, (10, 1))
    sortie, par_tirage = positionnement_familles(membres, pol, poids, tirages, (0.025, 0.975))
    assert sortie.loc[0, "pol_moy"] == pytest.approx((2 * 1 + 8 * 3) / 4)
    assert sortie.loc[0, ["n_repondants", "pol_n"]].tolist() == [3, 2]
    assert par_tirage.shape == (10, 1)


def _tirages(moyennes, ecart_type, n=2000, commun=0.0, graine=1):
    """Tirages simulés : bruit propre à chaque famille, plus un bruit commun (publics recoupés)."""
    rng = np.random.default_rng(graine)
    propre = rng.normal(0, ecart_type, (n, len(moyennes)))
    partage = rng.normal(0, commun, (n, 1))
    return np.array(moyennes) + propre + partage


@pytest.mark.parametrize(
    ("moyennes", "ecart_type", "attendu"),
    [
        # Trois publics nettement distincts.
        ([5.0, 6.0, 4.0], 0.05, ["centre", "droite", "gauche"]),
        # Deux publics indistinguables à droite, un à gauche (cas de l'édition 2026).
        ([5.59, 5.59, 5.35], 0.03, ["droite", "droite", "gauche"]),
        # Écarts dans le bruit : aucun libellé.
        ([5.0, 5.02, 5.04], 0.2, [None, None, None]),
    ],
)
def test_positions_relatives(moyennes, ecart_type, attendu):
    tirages = _tirages(moyennes, ecart_type)
    assert positions_relatives(np.array(moyennes), tirages) == attendu


def test_differences_appariees_plus_fines_que_les_intervalles():
    """Publics recoupés : un bruit commun élargit chaque intervalle mais pas leur différence."""
    moyennes = [5.35, 5.59]
    tirages = _tirages(moyennes, 0.03, commun=0.3)
    bas, haut = np.quantile(tirages, [0.025, 0.975], axis=0)
    assert bas[1] < haut[0]  # les intervalles se chevauchent…
    assert positions_relatives(np.array(moyennes), tirages) == [
        "gauche",
        "droite",
    ]  # …l'écart est net


def test_aucun_libelle_si_familles_non_affichees():
    moyennes = [4.0, 6.0]
    tirages = _tirages(moyennes, 0.05)
    assert positions_relatives(np.array(moyennes), tirages, affichees=False) == [None, None]
    assert positions_relatives(np.array(moyennes), tirages) == ["gauche", "droite"]
