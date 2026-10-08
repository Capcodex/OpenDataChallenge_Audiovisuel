"""Étape « attributs » : profil du public de chaque média affichable (E0-06, RG-03, RG-13, RG-14).

Tous les indicateurs sont des moyennes pondérées (RG-11) calculées sur une sous-population du
public du média, sous la forme Σ w·valeur / Σ w. Leurs intervalles de confiance viennent des
mêmes tirages que ceux des liens (compute/bootstrap.py).

| Indicateur | Population | Valeur |
|---|---|---|
| pol_moy | public ayant donné une note politique | note 0-10 (RG-13) |
| pol_part_nr | public | 1 si pas de note politique |
| age_moy | public | centre de la classe d'âge (âge connu par classes, ADR-006) |
| moins35 | public | 1 si moins de 35 ans |
| conf_ref | personnes ayant noté leur confiance dans le média | 1 si « source de référence » |
| conf_ecart_gd | idem, à gauche (note ≤ gauche_max) et à droite | conf_ref gauche − droite |

Les indicateurs de confiance sont laissés vides (NaN) sous les seuils de params.yaml.

Sortie agrégée : data/output/attributs_medias.parquet, une ligne par média affichable.
"""

import logging
from pathlib import Path

import numpy as np
import pandas as pd

from pipeline.chemins import Chemins
from pipeline.compute import bootstrap
from pipeline.config import Params, charger_params, charger_yaml

log = logging.getLogger(__name__)


def ratio_pondere(
    numerateur: np.ndarray,
    denominateur: np.ndarray,
    poids: np.ndarray,
    poids_tirages: np.ndarray,
    quantiles: tuple[float, float],
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Σ w·num / Σ w·den par média (colonne), avec son intervalle bootstrap.

    `numerateur`, `denominateur` : répondants × médias ; `poids` : n ;
    `poids_tirages` : tirages × n. Renvoie (valeur, borne basse, borne haute), chacun de
    longueur m ; NaN si le dénominateur est nul.
    """
    with np.errstate(divide="ignore", invalid="ignore"):
        valeur = (poids @ numerateur) / (poids @ denominateur)
        tirages = (poids_tirages @ numerateur) / (poids_tirages @ denominateur)
    bas, haut = bootstrap.intervalle(tirages, quantiles)
    return valeur, bas, haut


def valeurs_age(classes: dict[int, dict], age_65_plus: float) -> dict[int, float]:
    """Classe d'âge → âge représentatif : centre de [borne basse, borne haute + 1[.

    Exemple : 18-24 ans couvre les âges de 18,0 à 24,99 ans, centre 21,5.
    """
    valeurs = {}
    for code, classe in classes.items():
        bas, haut = classe["bornes"]
        valeurs[code] = age_65_plus if haut is None else (bas + haut + 1) / 2
    return valeurs


def calculer(
    suit: pd.DataFrame,
    poids: np.ndarray,
    profil: pd.DataFrame,
    confiance: pd.DataFrame,
    classes_age: dict[int, dict],
    params: Params,
) -> pd.DataFrame:
    """Attributs de chaque média (colonnes de `suit`, répondants × médias en 0/1).

    `profil` et `confiance` sont alignés sur les lignes de `suit` par `resp_id`.
    """
    medias = list(suit.columns)
    a, s = params.attributs, params.seuils
    q = params.bootstrap.quantiles
    tirages = bootstrap.poids_tires(poids, params.bootstrap.iterations, params.seed)

    def ratio(num: np.ndarray, den: np.ndarray) -> tuple[np.ndarray, ...]:
        return ratio_pondere(num, den, poids, tirages, q)

    f = suit.to_numpy(dtype=np.float64)
    pol = profil["pol"].to_numpy()
    a_note = ~np.isnan(pol)
    pol0 = np.nan_to_num(pol)[:, np.newaxis]
    age = profil["age_classe"].map(valeurs_age(classes_age, a.age_valeur_65_plus))
    age = age.to_numpy(dtype=np.float64)[:, np.newaxis]
    moins_de_35 = [k for k, c in classes_age.items() if (c["bornes"][1] or 999) < 35]
    jeune = profil["age_classe"].isin(moins_de_35).to_numpy(dtype=np.float64)[:, np.newaxis]

    f_note = f * a_note[:, np.newaxis]
    pol_moy, pol_bas, pol_haut = ratio(f_note * pol0, f_note)
    pol_nr = (poids @ (f * ~a_note[:, np.newaxis])) / (poids @ f)
    age_moy, age_bas, age_haut = ratio(f * age, f)
    m35, m35_bas, m35_haut = ratio(f * jeune, f)

    # Confiance : matrices répondants × médias « a noté » et « source de référence ».
    position = pd.Series(np.arange(len(suit)), index=profil["resp_id"].to_numpy())
    note = np.zeros_like(f)
    reference = np.zeros_like(f)
    conf = confiance[confiance["media_id"].isin(medias)]
    lignes = position.loc[conf["resp_id"]].to_numpy()
    colonnes = pd.Index(medias).get_indexer(conf["media_id"])
    note[lignes, colonnes] = 1
    reference[lignes, colonnes] = (conf["niveau"] == 1).to_numpy()
    gauche = (a_note & (pol <= a.gauche_max)).astype(np.float64)[:, np.newaxis]
    droite = (a_note & (pol >= a.droite_min)).astype(np.float64)[:, np.newaxis]

    n_conf = note.sum(axis=0).astype(np.int64)
    n_gauche = (note * gauche).sum(axis=0).astype(np.int64)
    n_droite = (note * droite).sum(axis=0).astype(np.int64)
    conf_ref, conf_bas, conf_haut = ratio(reference, note)

    def ecart_gd(w: np.ndarray) -> np.ndarray:
        """Part « source de référence » à gauche moins à droite ; `w` : n ou tirages × n."""
        with np.errstate(divide="ignore", invalid="ignore"):
            return (w @ (reference * gauche)) / (w @ (note * gauche)) - (
                w @ (reference * droite)
            ) / (w @ (note * droite))

    ecart = ecart_gd(poids)
    ecart_bas, ecart_haut = bootstrap.intervalle(ecart_gd(tirages), q)

    sortie = pd.DataFrame(
        {
            "media_id": medias,
            "n_repondants": f.sum(axis=0).astype(np.int64),
            "pol_n": f_note.sum(axis=0).astype(np.int64),
            "pol_moy": pol_moy,
            "pol_bas": pol_bas,
            "pol_haut": pol_haut,
            "pol_part_nr": pol_nr,
            "age_moy": age_moy,
            "age_bas": age_bas,
            "age_haut": age_haut,
            "moins35": m35,
            "moins35_bas": m35_bas,
            "moins35_haut": m35_haut,
            "n_confiance": n_conf,
            "conf_ref": conf_ref,
            "conf_ref_bas": conf_bas,
            "conf_ref_haut": conf_haut,
            "n_conf_gauche": n_gauche,
            "n_conf_droite": n_droite,
            "conf_ecart_gd": ecart,
            "conf_ecart_gd_bas": ecart_bas,
            "conf_ecart_gd_haut": ecart_haut,
        }
    )
    # RG-14 et seuils de publication : en dessous, l'indicateur n'est pas publié.
    sans_conf = sortie["n_confiance"] < s.confiance_effectif_min
    sortie.loc[sans_conf, ["conf_ref", "conf_ref_bas", "conf_ref_haut"]] = np.nan
    sans_ecart = sans_conf | (
        np.minimum(sortie["n_conf_gauche"], sortie["n_conf_droite"]) < s.ecart_effectif_min_par_bord
    )
    sortie.loc[sans_ecart, ["conf_ecart_gd", "conf_ecart_gd_bas", "conf_ecart_gd_haut"]] = np.nan
    sortie["fragile"] = sortie["n_repondants"] < s.chiffre_fragile_sous
    return sortie


def executer(chemins: Chemins) -> None:
    params = charger_params(chemins)
    table = pd.read_parquet(chemins.interim / "repondant_media.parquet")
    profil = pd.read_parquet(chemins.interim / "repondant_profil.parquet")
    confiance = pd.read_parquet(chemins.interim / "repondant_confiance.parquet")
    medias = pd.read_parquet(chemins.output / "medias.parquet")
    cfg = charger_yaml(chemins.config / "variables_arcom.yaml")
    classes_age = {int(k): v for k, v in cfg["profil"]["age"]["classes"].items()}

    if not table["resp_id"].equals(profil["resp_id"]):
        raise ValueError("repondant_profil n'est pas aligné sur repondant_media : relancer prepare")
    affichables = medias.loc[medias["affichable"], "media_id"].tolist()
    sortie = calculer(
        table[affichables],
        table["poids"].to_numpy(dtype=np.float64),
        profil,
        confiance,
        classes_age,
        params,
    )

    chemins.output.mkdir(parents=True, exist_ok=True)
    sortie.to_parquet(chemins.output / "attributs_medias.parquet", index=False)
    log.info(
        "  %d médias : positionnement politique de %.1f à %.1f, âge moyen de %.0f à %.0f ans ; "
        "confiance publiée pour %d médias, écart gauche/droite pour %d",
        len(sortie),
        sortie["pol_moy"].min(),
        sortie["pol_moy"].max(),
        sortie["age_moy"].min(),
        sortie["age_moy"].max(),
        int(sortie["conf_ref"].notna().sum()),
        int(sortie["conf_ecart_gd"].notna().sum()),
    )


def entrees(chemins: Chemins) -> list[Path]:
    return [
        chemins.config / "params.yaml",
        chemins.config / "variables_arcom.yaml",
        chemins.interim / "repondant_media.parquet",
        chemins.interim / "repondant_profil.parquet",
        chemins.interim / "repondant_confiance.parquet",
        chemins.output / "medias.parquet",
        Path(bootstrap.__file__),
    ]


def sorties(chemins: Chemins) -> list[Path]:
    return [chemins.output / "attributs_medias.parquet"]
