"""Tests des familles, des ponts, de la disposition et des liens affichés (T-036)."""

import numpy as np
import pandas as pd
import pytest

from pipeline.compute.coaudience import marquer_affiches
from pipeline.compute.disposition import calculer as disposer
from pipeline.compute.disposition import normaliser
from pipeline.compute.familles import apparier, partition, ponts, renumeroter

# Deux groupes de 4 médias très liés entre eux, reliés par un seul lien faible (a4-b1).
GROUPE_A = ["a1", "a2", "a3", "a4"]
GROUPE_B = ["b1", "b2", "b3", "b4"]
MEDIAS = GROUPE_A + GROUPE_B


def _liens_deux_groupes() -> pd.DataFrame:
    lignes = []
    for groupe in (GROUPE_A, GROUPE_B):
        for k, s in enumerate(groupe):
            for c in groupe[k + 1 :]:
                lignes.append((s, c, 4.0))
    lignes.append(("a4", "b1", 1.2))
    return pd.DataFrame(lignes, columns=["source", "cible", "lift"])


def test_leiden_separe_deux_groupes_et_reste_deterministe():
    liens = _liens_deux_groupes()
    poids = np.log(liens["lift"].to_numpy())
    p1 = partition(MEDIAS, liens["source"].tolist(), liens["cible"].tolist(), poids, 1.0, 7)
    p2 = partition(MEDIAS, liens["source"].tolist(), liens["cible"].tolist(), poids, 1.0, 7)
    np.testing.assert_array_equal(p1, p2)
    assert len(set(p1[:4])) == 1 and len(set(p1[4:])) == 1
    assert p1[0] != p1[4]


def test_renumeroter_la_plus_grande_famille_d_abord():
    membres = np.array([5, 5, 9, 9, 9, 2])
    assert renumeroter(membres, ["a", "b", "c", "d", "e", "f"]).tolist() == [2, 2, 1, 1, 1, 3]
    # Ex aequo : départage par le premier identifiant alphabétique.
    assert renumeroter(np.array([7, 7, 3, 3]), ["c", "d", "a", "b"]).tolist() == [2, 2, 1, 1]


def test_apparier_ignore_les_numeros_et_detecte_les_deplacements():
    reference = np.array([1, 1, 1, 2, 2, 2])
    # Mêmes familles, numérotées autrement : tout le monde est stable.
    assert apparier(reference, np.array([8, 8, 8, 3, 3, 3])).all()
    # Le 3e média a changé de famille.
    assert apparier(reference, np.array([8, 8, 3, 3, 3, 3])).tolist() == [
        True,
        True,
        False,
        True,
        True,
        True,
    ]
    # Famille scindée en deux : seule la plus grande partie est appariée.
    assert apparier(reference, np.array([4, 4, 6, 3, 3, 3])).tolist() == [
        True,
        True,
        False,
        True,
        True,
        True,
    ]


def test_ponts_le_media_relie_aux_deux_groupes_a_la_participation_la_plus_forte():
    liens = _liens_deux_groupes()
    # « x » est relié autant au groupe A qu'au groupe B.
    liens = pd.concat(
        [liens, pd.DataFrame([("a1", "x", 3.0), ("b1", "x", 3.0)], columns=liens.columns)],
        ignore_index=True,
    )
    medias = [*MEDIAS, "x"]
    familles = np.array([1, 1, 1, 1, 2, 2, 2, 2, 1])
    sortie = ponts(medias, liens, familles, np.log(liens["lift"].to_numpy()), 1).set_index(
        "media_id"
    )
    assert sortie["participation"].idxmax() == "x"
    assert sortie.loc["x", "participation"] == pytest.approx(0.5)
    assert sortie["pont"].sum() == 1 and sortie.loc["x", "pont"]
    assert sortie.loc["a2", "participation"] == 0
    assert sortie["intermediarite"].between(0, 1).all()


def test_disposition_deterministe_normalisee_et_fidele_aux_groupes():
    liens = _liens_deux_groupes()
    d1 = disposer(MEDIAS, liens, iterations=300, graine=3).set_index("media_id")
    d2 = disposer(MEDIAS, liens, iterations=300, graine=3).set_index("media_id")
    pd.testing.assert_frame_equal(d1, d2)
    assert d1[["x", "y"]].stack().between(0, 1).all()
    xy = d1[["x", "y"]].to_numpy()
    interne = np.mean(
        [
            np.linalg.norm(xy[i] - xy[j])
            for g in (range(4), range(4, 8))
            for i in g
            for j in g
            if i < j
        ]
    )
    entre = np.mean([np.linalg.norm(xy[i] - xy[j]) for i in range(4) for j in range(4, 8)])
    assert interne < entre / 2


def test_normaliser_conserve_les_proportions():
    pos = np.array([[0.0, 0.0], [4.0, 1.0], [2.0, 0.5]])
    xy = normaliser(pos)
    assert xy[:, 0].tolist() == [0.0, 1.0, 0.5]
    # L'axe vertical (étendue 1 sur 4) est centré : de 0,375 à 0,625.
    assert xy[:, 1].tolist() == pytest.approx([0.375, 0.625, 0.5])


def test_liens_affiches_voisins_les_plus_forts_et_reference():
    liens = pd.DataFrame(
        {
            "source": ["a", "a", "a", "b", "c"],
            "cible": ["b", "c", "d", "c", "d"],
            "lift": [3.0, 2.0, 1.5, 1.4, 1.3],
            "lift_bas": [2.0, 1.2, 1.1, 1.05, 1.1],
        }
    )
    # 1 voisin minimum, référence 1,8 : a-b (plus fort pour a et b, et au-dessus de la référence),
    # a-c (plus fort pour c), a-d (plus fort pour d). b-c et c-d ne sont le plus fort de personne.
    affiche = marquer_affiches(liens, reference=1.8, voisins_min=1)
    assert affiche.tolist() == [True, True, True, False, False]
    # Référence très basse : tous les liens.
    assert marquer_affiches(liens, reference=1.0, voisins_min=1).all()
