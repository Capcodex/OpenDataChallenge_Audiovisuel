"""Étape « familles » : familles de médias, stabilité et médias « ponts »
(E0-07, E1-05, RG-06, RG-07, CdC technique § 7.5 et § 7.7).

1. Référence : Leiden (`RBConfigurationVertexPartition`) sur les liens affichés (ou tous les liens
   retenus, params.yaml), poids `log(lift)` (ou `lift`), graine fixe (ADR-007).
2. Stabilité : pour chaque sous-échantillon bootstrap (les premiers tirages de
   compute/bootstrap.py), on recalcule le lift et l'effectif commun de ces liens, on garde ceux
   qui restent au-dessus de 1 et de RG-04, puis on recalcule les familles (ADR-007).
3. Appariement : les familles de chaque sous-échantillon sont appariées à celles de la référence par
   recouvrement maximal (algorithme hongrois). Stabilité d'un média = part des sous-échantillons où
   il est dans la famille appariée à la sienne. Indicateur global : ARI moyen.
4. RG-07 : les familles sont affichées si au moins `part_noeuds_stables_min` des médias ont une
   stabilité ≥ `stabilite_noeud_min`.
5. Ponts : intermédiarité pondérée (distance = 1 / lift) et coefficient de participation aux
   familles ; les `ponts_nombre` premiers par participation sont marqués `pont`.

Sorties : data/output/familles.parquet, data/output/journal_familles.json.
"""

import json
import logging
from pathlib import Path

import igraph as ig
import leidenalg
import networkx as nx
import numpy as np
import pandas as pd
from scipy.optimize import linear_sum_assignment

from pipeline.chemins import Chemins
from pipeline.compute import bootstrap
from pipeline.compute.coaudience import matrice_lift
from pipeline.config import Params, charger_params

log = logging.getLogger(__name__)


def poids_liens(lift: np.ndarray, mode: str) -> np.ndarray:
    """Poids d'un lien pour Leiden : `log(lift)` atténue les valeurs extrêmes (décision D6)."""
    return np.log(lift) if mode == "log_lift" else np.asarray(lift, dtype=np.float64)


def partition(
    medias: list[str],
    source: list[str],
    cible: list[str],
    poids: np.ndarray,
    resolution: float,
    graine: int,
) -> np.ndarray:
    """Numéro de famille de chaque média (ordre de `medias`), numéros bruts de Leiden."""
    g = ig.Graph(n=len(medias))
    indice = {m: i for i, m in enumerate(medias)}
    g.add_edges([(indice[a], indice[b]) for a, b in zip(source, cible, strict=True)])
    resultat = leidenalg.find_partition(
        g,
        leidenalg.RBConfigurationVertexPartition,
        weights=list(map(float, poids)),
        resolution_parameter=resolution,
        seed=graine,
        n_iterations=-1,  # jusqu'à convergence
    )
    return np.asarray(resultat.membership)


def renumeroter(membres: np.ndarray, medias: list[str]) -> np.ndarray:
    """Numéros de famille reproductibles : 1 = la plus grande, ex aequo départagés par le premier
    identifiant de média dans l'ordre alphabétique."""
    familles = {}
    for f in np.unique(membres):
        noms = sorted(m for m, x in zip(medias, membres, strict=True) if x == f)
        familles[f] = (-len(noms), noms[0])
    ordre = sorted(familles, key=familles.get)
    numero = {f: i + 1 for i, f in enumerate(ordre)}
    return np.array([numero[f] for f in membres])


def apparier(reference: np.ndarray, echantillon: np.ndarray) -> np.ndarray:
    """Pour chaque média, vrai s'il est dans la famille de l'échantillon appariée à sa famille de
    référence (recouvrement maximal, algorithme hongrois)."""
    ref_ids, ref_idx = np.unique(reference, return_inverse=True)
    ech_ids, ech_idx = np.unique(echantillon, return_inverse=True)
    recouvrement = np.zeros((len(ref_ids), len(ech_ids)), dtype=np.int64)
    np.add.at(recouvrement, (ref_idx, ech_idx), 1)
    lignes, colonnes = linear_sum_assignment(recouvrement, maximize=True)
    appariee = np.full(len(ref_ids), -1)
    appariee[lignes] = colonnes
    return appariee[ref_idx] == ech_idx


def liens_echantillon(
    x: np.ndarray,
    poids_tirage: np.ndarray,
    multiplicites: np.ndarray,
    i: np.ndarray,
    j: np.ndarray,
    effectif_min: int,
) -> tuple[np.ndarray, np.ndarray]:
    """Lift des liens (i, j) dans un tirage, et masque des liens gardés (lift > 1, RG-04)."""
    lift = matrice_lift(x, poids_tirage)[i, j]
    communs = ((x * multiplicites[:, np.newaxis]).T @ x)[i, j]
    garde = (lift > 1) & (communs >= effectif_min)
    return lift, garde


def stabilite(
    x: np.ndarray,
    poids: np.ndarray,
    medias: list[str],
    liens: pd.DataFrame,
    reference: np.ndarray,
    params: Params,
    resolution: float | None = None,
    mode_poids: str | None = None,
) -> tuple[np.ndarray, list[float]]:
    """Stabilité de chaque média et ARI de chaque sous-échantillon (RG-07)."""
    c = params.communautes
    resolution = c.resolution if resolution is None else resolution
    mode_poids = c.poids if mode_poids is None else mode_poids
    indice = {m: k for k, m in enumerate(medias)}
    i = liens["source"].map(indice).to_numpy()
    j = liens["cible"].map(indice).to_numpy()
    multiplicites = bootstrap.multiplicites(len(poids), c.sous_echantillons, params.seed)
    stables = np.zeros(len(medias))
    ari = []
    for m in multiplicites:
        lift, garde = liens_echantillon(
            x, poids * m, m, i, j, params.seuils.lien_effectif_commun_min
        )
        echantillon = partition(
            medias,
            liens["source"][garde].tolist(),
            liens["cible"][garde].tolist(),
            poids_liens(lift[garde], mode_poids),
            resolution,
            params.seed,
        )
        stables += apparier(reference, echantillon)
        ari.append(
            ig.compare_communities(list(reference), list(echantillon), method="adjusted_rand")
        )
    return stables / len(multiplicites), ari


def ponts(
    medias: list[str], liens: pd.DataFrame, familles: np.ndarray, poids: np.ndarray, nombre: int
) -> pd.DataFrame:
    """Intermédiarité pondérée (distance = 1 / lift, normalisée) et coefficient de participation
    `P_i = 1 − Σ_f (k_if / k_i)²` (k = somme des poids des liens, par famille du voisin)."""
    g = nx.Graph()
    g.add_nodes_from(medias)
    for a, b, lift in zip(liens["source"], liens["cible"], liens["lift"], strict=True):
        g.add_edge(a, b, distance=1 / lift)
    intermediarite = nx.betweenness_centrality(g, weight="distance", normalized=True)

    famille = dict(zip(medias, familles, strict=True))
    force: dict[str, dict[int, float]] = {m: {} for m in medias}
    for a, b, w in zip(liens["source"], liens["cible"], poids, strict=True):
        force[a][famille[b]] = force[a].get(famille[b], 0.0) + w
        force[b][famille[a]] = force[b].get(famille[a], 0.0) + w
    participation = []
    for m in medias:
        total = sum(force[m].values())
        participation.append(
            1 - sum((k / total) ** 2 for k in force[m].values()) if total > 0 else 0.0
        )
    sortie = pd.DataFrame(
        {
            "media_id": medias,
            "intermediarite": [intermediarite[m] for m in medias],
            "participation": participation,
        }
    )
    premiers = sortie.sort_values(["participation", "media_id"], ascending=[False, True]).head(
        nombre
    )
    sortie["pont"] = sortie["media_id"].isin(premiers["media_id"])
    return sortie


def calculer(
    x: np.ndarray, poids: np.ndarray, medias: list[str], liens: pd.DataFrame, params: Params
) -> tuple[pd.DataFrame, dict]:
    c = params.communautes
    w = poids_liens(liens["lift"].to_numpy(), c.poids)
    brut = partition(
        medias, liens["source"].tolist(), liens["cible"].tolist(), w, c.resolution, params.seed
    )
    familles = renumeroter(brut, medias)
    stab, ari = stabilite(x, poids, medias, liens, familles, params)
    part_stables = float((stab >= c.stabilite_noeud_min).mean())
    sortie = pd.DataFrame({"media_id": medias, "famille": familles, "stabilite": stab})
    sortie = sortie.merge(ponts(medias, liens, familles, w, c.ponts_nombre), on="media_id")
    sortie["famille"] = sortie["famille"].astype("int64")
    tailles = sortie["famille"].value_counts().sort_index()
    journal = {
        "liens": c.liens,
        "liens_utilises": len(liens),
        "resolution": c.resolution,
        "poids": c.poids,
        "sous_echantillons": c.sous_echantillons,
        "familles": int(tailles.size),
        "tailles": {str(k): int(v) for k, v in tailles.items()},
        "ari_moyen": round(float(np.mean(ari)), 4),
        "part_medias_stables": round(part_stables, 4),
        "familles_affichees": part_stables >= c.part_noeuds_stables_min,
    }
    return sortie, journal


def selectionner_liens(liens: pd.DataFrame, ensemble: str) -> pd.DataFrame:
    """Liens sur lesquels les familles sont calculées : `affiches` ou `retenus`."""
    choisis = liens[liens["affiche"]] if ensemble == "affiches" else liens
    return choisis.reset_index(drop=True)


def executer(chemins: Chemins) -> None:
    params = charger_params(chemins)
    table = pd.read_parquet(chemins.interim / "repondant_media.parquet")
    medias_ref = pd.read_parquet(chemins.output / "medias.parquet")
    liens = selectionner_liens(
        pd.read_parquet(chemins.output / "liens.parquet"), params.communautes.liens
    )
    medias = sorted(medias_ref.loc[medias_ref["affichable"], "media_id"])

    sortie, journal = calculer(
        table[medias].to_numpy(dtype=np.float64),
        table["poids"].to_numpy(dtype=np.float64),
        medias,
        liens,
        params,
    )
    chemins.output.mkdir(parents=True, exist_ok=True)
    sortie.to_parquet(chemins.output / "familles.parquet", index=False)
    (chemins.output / "journal_familles.json").write_text(
        json.dumps(journal, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    log.info(
        "  %d familles (tailles %s) ; %.0f %% des médias stables, ARI moyen %.2f : familles %s "
        "(RG-07)",
        journal["familles"],
        "/".join(map(str, journal["tailles"].values())),
        100 * journal["part_medias_stables"],
        journal["ari_moyen"],
        "affichées" if journal["familles_affichees"] else "NON affichées",
    )
    log.info(
        "  Ponts : %s",
        ", ".join(
            sortie.loc[sortie["pont"]].sort_values("participation", ascending=False)["media_id"]
        ),
    )


def entrees(chemins: Chemins) -> list[Path]:
    return [
        chemins.config / "params.yaml",
        chemins.interim / "repondant_media.parquet",
        chemins.output / "medias.parquet",
        chemins.output / "liens.parquet",
        Path(bootstrap.__file__),
    ]


def sorties(chemins: Chemins) -> list[Path]:
    return [chemins.output / "familles.parquet", chemins.output / "journal_familles.json"]
