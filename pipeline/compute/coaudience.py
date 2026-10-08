"""Étape « coaudience » : liens de co-audience entre médias (E0-05, CdC technique § 7.2 à 7.4).

Lift(A, B) = P(A et B) / (P(A) × P(B)), probabilités pondérées par POIDS (RG-15). Un lift de 2
signifie que les deux publics se recouvrent deux fois plus qu'attendu si les deux médias étaient
suivis indépendamment l'un de l'autre.

Sorties :
- data/interim/paires.parquet : toutes les paires de médias affichables, avant filtrage. Contient
  des paires à faible effectif commun : jamais publiée (ENF-09), sert à l'exploration des seuils.
- data/output/liens.parquet : liens retenus (RG-04, RG-05), source < cible ; la colonne `affiche`
  marque les liens montrés sur la carte (ADR-005, option C).
- data/output/journal_coaudience.json : paires testées, gardées et rejetées par motif.
"""

import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd

from pipeline.chemins import Chemins
from pipeline.compute import bootstrap
from pipeline.config import Params, charger_params

log = logging.getLogger(__name__)


def matrice_lift(x: np.ndarray, poids: np.ndarray) -> np.ndarray:
    """Lift de toutes les paires : `P = Xᵀ·diag(w)·X`, `lift = P / outer(diag(P), diag(P))`.

    `x` : répondants × médias (0/1) ; `poids` : un poids par répondant, normalisé ici (Σw = 1).
    La diagonale (un média avec lui-même) vaut 1 / p_i et n'a pas de sens : elle est ignorée.
    """
    w = poids / poids.sum()
    p = (x * w[:, np.newaxis]).T @ x
    parts = np.diag(p)
    with np.errstate(divide="ignore", invalid="ignore"):
        return p / np.outer(parts, parts)


def lift_reference(table: pd.DataFrame) -> float:
    """Lift attendu de toute paire si les répondants ne différaient que par leur nombre de médias
    suivis k (chacun choisissant ses médias au hasard) : E[k²] / E[k]², pondéré.

    Sert de repère pour lire les lifts et pour la revue des seuils (ADR-005). `k` compte tous les
    médias de la table, y compris les catégories génériques.
    """
    w = table["poids"].to_numpy() / table["poids"].sum()
    k = table.drop(columns=["resp_id", "poids"]).sum(axis=1).to_numpy(dtype=np.float64)
    return float((w @ k**2) / (w @ k) ** 2)


def lifts_tires(x: np.ndarray, poids_tirages: np.ndarray) -> np.ndarray:
    """Lift de toutes les paires pour chaque tirage : tableau `tirages × m × m`."""
    m = x.shape[1]
    resultat = np.empty((len(poids_tirages), m, m))
    for k, w in enumerate(poids_tirages):
        resultat[k] = matrice_lift(x, w)
    return resultat


def calculer_paires(
    x: np.ndarray, poids: np.ndarray, medias: list[str], params: Params
) -> pd.DataFrame:
    """Lift, intervalle de confiance et effectif commun (non pondéré) de chaque paire i < j."""
    lift = matrice_lift(x, poids)
    tirages = bootstrap.poids_tires(poids, params.bootstrap.iterations, params.seed)
    bas, haut = bootstrap.intervalle(lifts_tires(x, tirages), params.bootstrap.quantiles)
    x_entier = x.astype(np.int64)
    communs = x_entier.T @ x_entier

    ordre = np.argsort(medias)  # source < cible dans l'ordre alphabétique des identifiants
    ids = np.asarray(medias)[ordre]
    i, j = np.triu_indices(len(ids), k=1)
    a, b = ordre[i], ordre[j]
    return pd.DataFrame(
        {
            "source": ids[i],
            "cible": ids[j],
            "lift": lift[a, b],
            "lift_bas": bas[a, b],
            "lift_haut": haut[a, b],
            "n_communs": communs[a, b],
        }
    )


def filtrer(paires: pd.DataFrame, params: Params) -> tuple[pd.DataFrame, dict[str, int]]:
    """Applique RG-04 (effectif commun) puis RG-05 (borne basse du lift > seuil).

    Chaque paire rejetée est comptée sous son premier motif de rejet.
    """
    s = params.seuils
    effectif_ok = paires["n_communs"] >= s.lien_effectif_commun_min
    lift_ok = paires["lift_bas"] > s.lien_lift_borne_basse_min
    journal = {
        "paires_testees": len(paires),
        "liens_retenus": int((effectif_ok & lift_ok).sum()),
        "rejet_effectif_commun_rg04": int((~effectif_ok).sum()),
        "rejet_borne_basse_rg05": int((effectif_ok & ~lift_ok).sum()),
    }
    liens = paires.loc[effectif_ok & lift_ok].reset_index(drop=True)
    return liens, journal


def marquer_affiches(liens: pd.DataFrame, reference: float, voisins_min: int) -> pd.Series:
    """Liens montrés sur la carte (ADR-005, option C) : pour chaque média, ses `voisins_min` liens
    de plus fort lift, plus tous les liens dont la borne basse dépasse le lift de référence."""
    long = pd.concat(
        [
            pd.DataFrame({"media": liens["source"], "lien": liens.index, "lift": liens["lift"]}),
            pd.DataFrame({"media": liens["cible"], "lien": liens.index, "lift": liens["lift"]}),
        ]
    )
    # Tri stable (lift décroissant, puis numéro de lien) : départage reproductible des ex aequo.
    long = long.sort_values(["media", "lift", "lien"], ascending=[True, False, True], kind="stable")
    plus_forts = set(long.groupby("media").head(voisins_min)["lien"])
    return liens.index.isin(plus_forts) | (liens["lift_bas"] > reference)


def executer(chemins: Chemins) -> None:
    params = charger_params(chemins)
    table = pd.read_parquet(chemins.interim / "repondant_media.parquet")
    medias = pd.read_parquet(chemins.output / "medias.parquet")
    affichables = medias.loc[medias["affichable"], "media_id"].tolist()

    x = table[affichables].to_numpy(dtype=np.float64)
    poids = table["poids"].to_numpy(dtype=np.float64)
    paires = calculer_paires(x, poids, affichables, params)
    liens, journal = filtrer(paires, params)
    reference = lift_reference(table)
    liens["affiche"] = marquer_affiches(liens, reference, params.affichage.voisins_min_par_media)
    journal["medias_affichables"] = len(affichables)
    journal["medias_relies"] = int(pd.concat([liens["source"], liens["cible"]]).nunique())
    journal["iterations_bootstrap"] = params.bootstrap.iterations
    journal["lift_reference_intensite"] = round(reference, 4)
    journal["liens_affiches"] = int(liens["affiche"].sum())

    chemins.interim.mkdir(parents=True, exist_ok=True)
    chemins.output.mkdir(parents=True, exist_ok=True)
    paires.to_parquet(chemins.interim / "paires.parquet", index=False)
    liens.to_parquet(chemins.output / "liens.parquet", index=False)
    (chemins.output / "journal_coaudience.json").write_text(
        json.dumps(journal, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    log.info(
        "  %d paires testées entre %d médias : %d liens retenus ; rejets : %d effectif commun "
        "< %d (RG-04), %d borne basse ≤ %g (RG-05)",
        journal["paires_testees"],
        len(affichables),
        journal["liens_retenus"],
        journal["rejet_effectif_commun_rg04"],
        params.seuils.lien_effectif_commun_min,
        journal["rejet_borne_basse_rg05"],
        params.seuils.lien_lift_borne_basse_min,
    )
    log.info(
        "  Lift de référence dû à l'intensité de consommation : %.2f ; %d liens affichés sur la "
        "carte (%d voisins minimum par média, ADR-005)",
        reference,
        journal["liens_affiches"],
        params.affichage.voisins_min_par_media,
    )
    isoles = sorted(set(affichables) - set(liens["source"]) - set(liens["cible"]))
    if isoles:
        log.info("  Médias affichables sans aucun lien : %s", ", ".join(isoles))


def entrees(chemins: Chemins) -> list[Path]:
    return [
        chemins.config / "params.yaml",
        chemins.interim / "repondant_media.parquet",
        chemins.output / "medias.parquet",
        Path(bootstrap.__file__),
    ]


def sorties(chemins: Chemins) -> list[Path]:
    return [
        chemins.interim / "paires.parquet",
        chemins.output / "liens.parquet",
        chemins.output / "journal_coaudience.json",
    ]
