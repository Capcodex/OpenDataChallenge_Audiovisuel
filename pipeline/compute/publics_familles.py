"""Positionnement politique du public de chaque famille et libellé relatif (V2, ADR-011).

Public d'une famille : les répondants qui suivent au moins un de ses médias. Son positionnement
moyen est calculé comme celui d'un média (compute/attributs.py) : moyenne pondérée de la note 0-10
sur les répondants qui ont donné une note (RG-13), intervalle à 95 % avec les mêmes tirages
bootstrap que les liens et les attributs.

Libellé relatif : les familles sont triées par positionnement moyen. Deux familles voisines ne
sont distinguées que si leur écart est significatif : l'intervalle à 95 % de la différence,
calculée tirage par tirage (les publics se recoupent : un même répondant suit souvent des médias
de plusieurs familles), exclut zéro. Sinon elles forment un même groupe. Avec un seul groupe,
aucun libellé ; sinon, le premier groupe est « gauche », le dernier « droite » et les groupes
intermédiaires « centre ». Ces libellés comparent les publics des familles entre eux :
ils ne situent ni un média ni une famille sur l'échelle absolue (ADR-011, RG-20 amendée).
"""

import numpy as np
import pandas as pd

from pipeline.compute.attributs import ratio_pondere

POSITIONS = ("gauche", "centre", "droite")


def appartenance(
    suit: np.ndarray, familles_des_medias: np.ndarray, familles: list[int]
) -> np.ndarray:
    """Répondants × familles : 1 si le répondant suit au moins un média de la famille."""
    return np.column_stack(
        [(suit[:, familles_des_medias == f].sum(axis=1) > 0) for f in familles]
    ).astype(np.float64)


def positionnement_familles(
    membres: np.ndarray,
    pol: np.ndarray,
    poids: np.ndarray,
    poids_tirages: np.ndarray,
    quantiles: tuple[float, float],
) -> tuple[pd.DataFrame, np.ndarray]:
    """Positionnement moyen du public de chaque famille (colonnes de `membres`), avec intervalle.

    `pol` : note 0-10 par répondant, NaN sans réponse (exclue, RG-13). Renvoie aussi les valeurs
    de chaque tirage (tirages × familles), pour comparer les familles entre elles.
    """
    a_note = ~np.isnan(pol)
    m_note = membres * a_note[:, np.newaxis]
    numerateur = m_note * np.nan_to_num(pol)[:, np.newaxis]
    moy, bas, haut = ratio_pondere(numerateur, m_note, poids, poids_tirages, quantiles)
    with np.errstate(divide="ignore", invalid="ignore"):
        tirages = (poids_tirages @ numerateur) / (poids_tirages @ m_note)
    tableau = pd.DataFrame(
        {
            "n_repondants": membres.sum(axis=0).astype(np.int64),
            "pol_n": m_note.sum(axis=0).astype(np.int64),
            "pol_moy": moy,
            "pol_bas": bas,
            "pol_haut": haut,
        }
    )
    return tableau, tirages


def positions_relatives(
    moy: np.ndarray,
    tirages: np.ndarray,
    quantile_bas: float = 0.025,
    affichees: bool = True,
) -> list[str | None]:
    """Libellé relatif de chaque famille (« gauche », « centre », « droite ») ou None.

    `tirages` : tirages × familles. Aucun libellé si les familles ne sont pas affichées (RG-07)
    ou si aucun écart n'est significatif (un seul groupe).
    """
    n = len(moy)
    if not affichees or n < 2:
        return [None] * n
    ordre = np.argsort(moy, kind="stable")
    groupes = np.zeros(n, dtype=int)
    groupe = 0
    for precedent, courant in zip(ordre[:-1], ordre[1:], strict=True):
        # Écart significatif : la borne basse de la différence (suivante − précédente) est > 0.
        if np.quantile(tirages[:, courant] - tirages[:, precedent], quantile_bas) > 0:
            groupe += 1
        groupes[courant] = groupe
    if groupe == 0:
        return [None] * n
    return ["gauche" if g == 0 else "droite" if g == groupe else "centre" for g in groupes.tolist()]
