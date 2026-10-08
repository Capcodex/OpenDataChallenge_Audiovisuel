"""Contrôles sur les données réelles (T-011, CdC technique § 12.1).

Ces tests recomptent les effectifs par un chemin de calcul indépendant du pipeline (format long
+ regroupement) et les comparent aux sorties. Ils sont ignorés si le pipeline n'a pas été exécuté.
"""

import re

import pandas as pd
import pytest

from pipeline.chemins import Chemins
from pipeline.config import charger_yaml, chemin_source

pytestmark = pytest.mark.data

CHEMINS = Chemins.depuis_environnement()
TABLE = CHEMINS.interim / "repondant_media.parquet"
CONFIANCE = CHEMINS.interim / "repondant_confiance.parquet"
MEDIAS = CHEMINS.output / "medias.parquet"

if not (TABLE.exists() and CONFIANCE.exists() and MEDIAS.exists()):
    pytest.skip("Sorties absentes : lancer `make pipeline` d'abord", allow_module_level=True)


@pytest.fixture(scope="module")
def cfg():
    return charger_yaml(CHEMINS.config / "variables_arcom.yaml")


@pytest.fixture(scope="module")
def brut(cfg):
    return pd.read_csv(
        chemin_source(CHEMINS, cfg["sources"]["base"]), sep=";", decimal=",", low_memory=False
    )


@pytest.fixture(scope="module")
def table():
    return pd.read_parquet(TABLE)


def _colonnes(df, variable):
    return [c for c in df.columns if re.fullmatch(rf"{re.escape(variable)}_\d+", c)]


def test_base_des_repondants_interroges_sur_les_medias(table, brut, cfg):
    # 87 % des 3 377 répondants selon le guide de l'Arcom : 2 939.
    assert len(brut) == 3377
    assert len(table) == 2939
    assert table["resp_id"].is_unique


def test_poids_conserves(table, brut, cfg):
    col_id, col_poids = cfg["colonnes"]["identifiant"], cfg["colonnes"]["poids"]
    attendus = brut.set_index(col_id).loc[table["resp_id"], col_poids].to_numpy()
    assert table["poids"].to_numpy() == pytest.approx(attendus)


def test_effectifs_egaux_aux_variables_d_origine(table, brut, cfg):
    col_id = cfg["colonnes"]["identifiant"]
    base = brut[brut[col_id].isin(table["resp_id"])]
    ecarts = []
    for question in cfg["questions"]:
        longue = (
            base[[col_id, *_colonnes(base, question["variable"])]].melt(id_vars=col_id).dropna()
        )
        par_code = longue.drop_duplicates([col_id, "value"]).groupby("value")[col_id].count()
        for code, media in question["medias"].items():
            attendu = int(par_code.get(float(code), 0))
            obtenu = int(table[media].sum())
            if attendu != obtenu:
                ecarts.append((question["variable"], code, media, attendu, obtenu))
    assert not ecarts, f"Effectifs différents (variable, code, média, attendu, obtenu) : {ecarts}"


def test_reseaux_sociaux_seul_l_echantillon_telephonique_n_est_pas_interroge(brut, table, cfg):
    col_id = cfg["colonnes"]["identifiant"]
    base = brut[brut[col_id].isin(table["resp_id"])]
    non_interroges = base[_colonnes(base, "SOURCES1FR_R2_R")].isna().all(axis=1)
    assert int(non_interroges.sum()) == 143
    assert set(base.loc[non_interroges, "PAGE_R_2"]) == {2}  # 2 = CATI (téléphone)


def test_toutes_les_colonnes_de_confiance_sont_rattachees_ou_ignorees():
    corresp = pd.read_csv(CHEMINS.output / "correspondance_confiance.csv", keep_default_na=False)
    assert len(corresp) == 90
    assert set(corresp["statut"]) <= {"automatique", "forcée", "ignorée"}
    assert (corresp.loc[corresp["statut"] != "ignorée", "media_id"] != "").all()


def test_confiance_donnee_par_des_personnes_qui_suivent_le_media(table):
    confiance = pd.read_parquet(CONFIANCE)
    suit = table.melt(id_vars=["resp_id", "poids"], var_name="media_id", value_name="suit")
    fusion = confiance.merge(suit, on=["resp_id", "media_id"], how="left")
    # La question n'est posée qu'aux personnes qui consomment le média : tolérance de 1 %.
    assert (fusion["suit"] != 1).mean() < 0.01


def test_referentiel_coherent_avec_la_table(table):
    medias = pd.read_parquet(MEDIAS).set_index("media_id")
    colonnes = [c for c in table.columns if c not in ("resp_id", "poids")]
    assert set(colonnes) == set(medias.index)
    assert (medias.loc[colonnes, "n_repondants"] == table[colonnes].sum()).all()
    assert not medias.loc[medias["generique"], "affichable"].any()
