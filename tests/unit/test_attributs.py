import numpy as np
import pandas as pd
import pytest

from pipeline.compute.attributs import calculer, ratio_pondere, valeurs_age

CLASSES = {
    1: {"bornes": [18, 24]},
    2: {"bornes": [25, 34]},
    3: {"bornes": [65, None]},
}


def test_valeurs_age_centre_des_classes_et_convention_65_plus():
    assert valeurs_age(CLASSES, 74.0) == {1: 21.5, 2: 30.0, 3: 74.0}


def test_ratio_pondere_et_intervalle():
    num = np.array([[1.0], [0.0], [1.0]])
    den = np.ones((3, 1))
    poids = np.array([1.0, 1.0, 2.0])
    tirages = np.array([[1.0, 1.0, 2.0], [2.0, 0.0, 0.0], [0.0, 2.0, 0.0]])
    valeur, bas, haut = ratio_pondere(num, den, poids, tirages, (0.0, 1.0))
    assert valeur[0] == pytest.approx(3 / 4)
    assert (bas[0], haut[0]) == (0.0, 1.0)


def _jeu(n_confiance_a: int):
    """6 répondants ; « a » suivi par les 4 premiers, « b » par les 2 derniers."""
    suit = pd.DataFrame({"a": [1, 1, 1, 1, 0, 0], "b": [0, 0, 0, 0, 1, 1]}, dtype="int8")
    profil = pd.DataFrame(
        {
            "resp_id": [10, 11, 12, 13, 14, 15],
            "age_classe": [1, 1, 2, 3, 3, 3],
            "pol": [2.0, 8.0, np.nan, 5.0, 9.0, 1.0],
        }
    )
    lignes = [(10, "a", 1), (11, "a", 3), (12, "a", 1), (13, "a", 2)][:n_confiance_a]
    confiance = pd.DataFrame(lignes, columns=["resp_id", "media_id", "niveau"])
    return suit, np.array([1.0, 1.0, 1.0, 1.0, 1.0, 3.0]), profil, confiance


def test_attributs_sur_un_jeu_jouet(fabrique_params):
    params = fabrique_params(
        seuils={
            "media_affichable_min": 1,
            "chiffre_fragile_sous": 3,
            "confiance_effectif_min": 4,
            "ecart_effectif_min_par_bord": 1,
        },
        bootstrap={"iterations": 100},
    )
    suit, poids, profil, confiance = _jeu(4)
    s = calculer(suit, poids, profil, confiance, CLASSES, params).set_index("media_id")

    # a : notes 2, 8, (non-réponse), 5 → moyenne 5 ; 1 non-réponse sur 4.
    assert s.loc["a", "pol_moy"] == pytest.approx(5.0)
    assert s.loc["a", "pol_part_nr"] == pytest.approx(0.25)
    assert s.loc["a", "pol_n"] == 3
    # b : notes 9 (poids 1) et 1 (poids 3) → (9 + 3) / 4 = 3 (RG-11 : pondéré).
    assert s.loc["b", "pol_moy"] == pytest.approx(3.0)
    # a : âges 21,5 ; 21,5 ; 30 ; 74.
    assert s.loc["a", "age_moy"] == pytest.approx((21.5 + 21.5 + 30 + 74) / 4)
    assert s.loc["a", "moins35"] == pytest.approx(0.75)
    # Confiance de a : 2 « référence » sur 4 ; gauche (note 2) : 1/1, droite (note 8) : 0/1.
    assert s.loc["a", "conf_ref"] == pytest.approx(0.5)
    assert s.loc["a", "conf_ecart_gd"] == pytest.approx(1.0)
    # b : aucune réponse de confiance → indicateurs vides.
    assert s.loc["b", "n_confiance"] == 0
    assert np.isnan(s.loc["b", "conf_ref"])
    assert s["fragile"].to_dict() == {"a": False, "b": True}
    assert (s["pol_bas"] <= s["pol_moy"]).all() and (s["pol_moy"] <= s["pol_haut"]).all()


def test_confiance_non_publiee_sous_le_seuil(fabrique_params):
    params = fabrique_params(
        seuils={"media_affichable_min": 1, "chiffre_fragile_sous": 3, "confiance_effectif_min": 4},
        bootstrap={"iterations": 100},
    )
    suit, poids, profil, confiance = _jeu(3)
    s = calculer(suit, poids, profil, confiance, CLASSES, params).set_index("media_id")
    assert s.loc["a", "n_confiance"] == 3
    assert s.loc[["a"], ["conf_ref", "conf_ecart_gd"]].isna().all(axis=None)
