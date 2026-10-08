"""Rééchantillonnage pondéré des répondants (CdC technique § 7.3, décision D5).

Un tirage = un vecteur de multiplicités multinomiales `c` (n répondants tirés avec remise parmi n) ;
le poids effectif d'un répondant devient `w ⊙ c`. Les mêmes tirages, issus de la graine de
params.yaml, servent aux liens (co-audience) et aux attributs des publics : les intervalles sont
cohérents entre eux et identiques d'une exécution à l'autre.
"""

import warnings

import numpy as np


def multiplicites(n: int, iterations: int, graine: int) -> np.ndarray:
    """Matrice `iterations × n` d'entiers : nombre de fois où chaque répondant est tiré."""
    rng = np.random.default_rng(graine)
    return rng.multinomial(n, np.full(n, 1 / n), size=iterations).astype(np.int32)


def poids_tires(poids: np.ndarray, iterations: int, graine: int) -> np.ndarray:
    """Matrice `iterations × n` des poids effectifs `w ⊙ c` de chaque tirage."""
    return multiplicites(len(poids), iterations, graine) * poids[np.newaxis, :]


def intervalle(
    valeurs: np.ndarray, quantiles: tuple[float, float]
) -> tuple[np.ndarray, np.ndarray]:
    """Bornes basse et haute, le long du premier axe (les tirages). Ignore les tirages indéfinis
    (division par zéro quand un média n'est tiré chez aucun répondant). Une colonne entièrement
    indéfinie (indicateur sans données, ex. confiance d'un JT) donne NaN."""
    with np.errstate(invalid="ignore"), warnings.catch_warnings():
        warnings.filterwarnings("ignore", "All-NaN slice", RuntimeWarning)
        bas, haut = np.nanquantile(valeurs, quantiles, axis=0)
    return bas, haut
