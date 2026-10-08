"""Schémas de validation des tables produites (pandera, CdC technique § 12.1)."""

import pandera.pandas as pa

from pipeline.prepare.medias import STATUTS, TYPES

REPONDANT_MEDIA = pa.DataFrameSchema(
    {
        "resp_id": pa.Column("int64", unique=True),
        "poids": pa.Column("float64", pa.Check.gt(0)),
        r"^(?!resp_id$|poids$).+$": pa.Column("int8", pa.Check.isin([0, 1]), regex=True),
    },
    strict=False,
    name="repondant_media",
)

REPONDANT_PROFIL = pa.DataFrameSchema(
    {
        "resp_id": pa.Column("int64", unique=True),
        "age_classe": pa.Column("int8", pa.Check.in_range(1, 6)),
        "pol": pa.Column("float64", pa.Check.in_range(0, 10), nullable=True),
    },
    strict=True,
    name="repondant_profil",
)

REPONDANT_CONFIANCE = pa.DataFrameSchema(
    {
        "resp_id": pa.Column("int64"),
        "media_id": pa.Column(str),
        "niveau": pa.Column("int8", pa.Check.isin([1, 2, 3])),
    },
    unique=["resp_id", "media_id"],
    strict=True,
    name="repondant_confiance",
)

MEDIAS = pa.DataFrameSchema(
    {
        "media_id": pa.Column(str, unique=True),
        "nom": pa.Column(str),
        "type": pa.Column(str, pa.Check.isin(sorted(TYPES))),
        "public_prive": pa.Column(str, pa.Check.isin(sorted(STATUTS))),
        "generique": pa.Column(bool),
        "n_repondants": pa.Column("int64", pa.Check.ge(0)),
        "part_ponderee": pa.Column("float64", pa.Check.in_range(0, 1)),
        "affichable": pa.Column(bool),
        "fragile": pa.Column(bool),
    },
    strict=False,
    name="medias",
)

LIENS = pa.DataFrameSchema(
    {
        "source": pa.Column(str),
        "cible": pa.Column(str),
        "lift": pa.Column("float64", pa.Check.gt(0)),
        "lift_bas": pa.Column("float64", pa.Check.gt(0)),
        "lift_haut": pa.Column("float64", pa.Check.gt(0)),
        "n_communs": pa.Column("int64", pa.Check.ge(1)),
        "affiche": pa.Column(bool),
    },
    checks=[
        pa.Check(lambda d: d["source"] < d["cible"], error="source < cible"),
        pa.Check(lambda d: d["lift_bas"] <= d["lift_haut"], error="lift_bas ≤ lift_haut"),
    ],
    unique=["source", "cible"],
    strict=True,
    name="liens",
)


def _part(nullable: bool = False) -> pa.Column:
    return pa.Column("float64", pa.Check.in_range(0, 1), nullable=nullable)


def _ecart() -> pa.Column:
    return pa.Column("float64", pa.Check.in_range(-1, 1), nullable=True)


def _note() -> pa.Column:
    return pa.Column("float64", pa.Check.in_range(0, 10))


def _age() -> pa.Column:
    return pa.Column("float64", pa.Check.in_range(15, 100))


def _effectif() -> pa.Column:
    return pa.Column("int64", pa.Check.ge(0))


ATTRIBUTS_MEDIAS = pa.DataFrameSchema(
    {
        "media_id": pa.Column(str, unique=True),
        "n_repondants": _effectif(),
        "pol_n": _effectif(),
        "pol_moy": _note(),
        "pol_bas": _note(),
        "pol_haut": _note(),
        "pol_part_nr": _part(),
        "age_moy": _age(),
        "age_bas": _age(),
        "age_haut": _age(),
        "moins35": _part(),
        "moins35_bas": _part(),
        "moins35_haut": _part(),
        "n_confiance": _effectif(),
        "conf_ref": _part(nullable=True),
        "conf_ref_bas": _part(nullable=True),
        "conf_ref_haut": _part(nullable=True),
        "n_conf_gauche": _effectif(),
        "n_conf_droite": _effectif(),
        "conf_ecart_gd": _ecart(),
        "conf_ecart_gd_bas": _ecart(),
        "conf_ecart_gd_haut": _ecart(),
        "fragile": pa.Column(bool),
    },
    checks=[
        pa.Check(lambda d: d["pol_bas"] <= d["pol_moy"], error="pol_bas ≤ pol_moy"),
        pa.Check(lambda d: d["pol_moy"] <= d["pol_haut"], error="pol_moy ≤ pol_haut"),
        pa.Check(lambda d: d["age_bas"] <= d["age_haut"], error="age_bas ≤ age_haut"),
    ],
    strict=True,
    name="attributs_medias",
)

FAMILLES = pa.DataFrameSchema(
    {
        "media_id": pa.Column(str, unique=True),
        "famille": pa.Column("int64", pa.Check.ge(1)),
        "stabilite": _part(),
        "intermediarite": _part(),
        "participation": _part(),
        "pont": pa.Column(bool),
    },
    strict=True,
    name="familles",
)

DISPOSITION = pa.DataFrameSchema(
    {
        "media_id": pa.Column(str, unique=True),
        "x": _part(),
        "y": _part(),
    },
    strict=True,
    name="disposition",
)
