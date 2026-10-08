"""Étape « disposition » : coordonnées des médias sur la carte (EF-M1-02, CdC technique § 7.6).

ForceAtlas2 (Jacomy, Venturini, Heymann, Bastian, PLoS ONE 2014), implémenté en numpy (ADR-008) :
- répulsion entre toutes les paires : `kr · (deg_i + 1)(deg_j + 1) / d` ;
- attraction le long des liens affichés : `d · w`, avec `w` = lift ;
- gravité vers le centre : `kg · (deg_i + 1)` ;
- vitesse adaptative par nœud (oscillation « swing » et « traction » de l'article).

Positions initiales tirées avec la graine de params.yaml : la carte est identique à chaque
exécution. Les coordonnées sont mises à l'échelle dans [0, 1] sans déformer les proportions.
Le site ne recalcule jamais la disposition (CdC technique principe A1).

Sortie : data/output/disposition.parquet (media_id, x, y).
"""

import logging
from pathlib import Path

import numpy as np
import pandas as pd

from pipeline.chemins import Chemins
from pipeline.config import charger_params

log = logging.getLogger(__name__)

# Réglages standard de ForceAtlas2 (valeurs par défaut de Gephi et de graphology).
REPULSION = 2.0  # kr, « scaling ratio »
GRAVITE = 1.0  # kg
TOLERANCE_OSCILLATION = 1.0  # « jitter tolerance »
VITESSE_NOEUD = 0.1  # ks
VITESSE_NOEUD_MAX = 10.0  # ksmax


def forceatlas2(
    n: int, i: np.ndarray, j: np.ndarray, poids: np.ndarray, iterations: int, graine: int
) -> np.ndarray:
    """Positions (n × 2) après `iterations` pas de ForceAtlas2. Liens (i, j) de poids `poids`."""
    rng = np.random.default_rng(graine)
    pos = rng.uniform(-1, 1, size=(n, 2)) * np.sqrt(n)
    masse = np.bincount(i, minlength=n) + np.bincount(j, minlength=n) + 1.0
    force_prec = np.zeros((n, 2))
    vitesse = 1.0

    for _ in range(iterations):
        # Répulsion : toutes les paires (n ≈ 70, le calcul direct suffit).
        delta = pos[:, np.newaxis, :] - pos[np.newaxis, :, :]
        d2 = np.maximum((delta**2).sum(axis=2), 1e-9)
        np.fill_diagonal(d2, np.inf)
        facteur = REPULSION * np.outer(masse, masse) / d2  # force / d, appliquée au vecteur delta
        force = (facteur[:, :, np.newaxis] * delta).sum(axis=1)

        # Attraction le long des liens : F = d · w, dirigée vers le voisin.
        lien = pos[j] - pos[i]
        attraction = lien * poids[:, np.newaxis]
        np.add.at(force, i, attraction)
        np.add.at(force, j, -attraction)

        # Gravité vers l'origine, d'intensité constante.
        distance_centre = np.maximum(np.linalg.norm(pos, axis=1), 1e-9)
        force -= (GRAVITE * masse / distance_centre)[:, np.newaxis] * pos

        # Vitesse adaptative (section « Adaptive speed » de l'article) : la vitesse globale suit
        # le rapport traction / oscillation, sans augmenter de plus de 50 % par pas.
        swing = np.linalg.norm(force - force_prec, axis=1)
        traction = np.linalg.norm(force + force_prec, axis=1) / 2
        swing_global = max((masse * swing).sum(), 1e-9)
        traction_global = (masse * traction).sum()
        vitesse = min(TOLERANCE_OSCILLATION * traction_global / swing_global, 1.5 * vitesse)

        norme = np.maximum(np.linalg.norm(force, axis=1), 1e-9)
        v_noeud = VITESSE_NOEUD * vitesse / (1 + vitesse * np.sqrt(swing))
        v_noeud = np.minimum(v_noeud, VITESSE_NOEUD_MAX / norme)
        pos = pos + force * v_noeud[:, np.newaxis]
        force_prec = force
    return pos


def normaliser(pos: np.ndarray) -> np.ndarray:
    """Mise à l'échelle dans [0, 1] sans déformation : la plus grande dimension occupe [0, 1],
    l'autre est centrée."""
    mini, maxi = pos.min(axis=0), pos.max(axis=0)
    etendue = (maxi - mini).max()
    if etendue == 0:
        return np.full_like(pos, 0.5)
    resultat = (pos - mini) / etendue
    resultat += (1 - (maxi - mini) / etendue) / 2
    return resultat


def calculer(medias: list[str], liens: pd.DataFrame, iterations: int, graine: int) -> pd.DataFrame:
    indice = {m: k for k, m in enumerate(medias)}
    pos = forceatlas2(
        len(medias),
        liens["source"].map(indice).to_numpy(),
        liens["cible"].map(indice).to_numpy(),
        liens["lift"].to_numpy(dtype=np.float64),
        iterations,
        graine,
    )
    xy = normaliser(pos)
    # Arrondi à 4 décimales : format compact (ENF-02) et sorties stables d'une machine à l'autre.
    return pd.DataFrame({"media_id": medias, "x": xy[:, 0].round(4), "y": xy[:, 1].round(4)})


def executer(chemins: Chemins) -> None:
    params = charger_params(chemins)
    medias_ref = pd.read_parquet(chemins.output / "medias.parquet")
    liens = pd.read_parquet(chemins.output / "liens.parquet")
    medias = sorted(medias_ref.loc[medias_ref["affichable"], "media_id"])
    affiches = liens[liens["affiche"]].reset_index(drop=True)

    sortie = calculer(medias, affiches, params.layout.iterations, params.seed)
    chemins.output.mkdir(parents=True, exist_ok=True)
    sortie.to_parquet(chemins.output / "disposition.parquet", index=False)
    log.info(
        "  %d médias placés à partir de %d liens affichés (ForceAtlas2, %d itérations)",
        len(sortie),
        len(affiches),
        params.layout.iterations,
    )


def entrees(chemins: Chemins) -> list[Path]:
    return [
        chemins.config / "params.yaml",
        chemins.output / "medias.parquet",
        chemins.output / "liens.parquet",
    ]


def sorties(chemins: Chemins) -> list[Path]:
    return [chemins.output / "disposition.parquet"]
