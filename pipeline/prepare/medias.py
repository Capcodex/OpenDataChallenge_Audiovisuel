"""Chargement et validation du référentiel des médias (config/medias.csv, E0-02)."""

from pathlib import Path

import pandas as pd

from pipeline.texte import normaliser

TYPES = {"radio", "journal", "magazine", "tv", "info", "web", "createur", "jt"}
STATUTS = {"public", "prive", "autre", "na"}
COLONNES = [
    "media_id",
    "nom",
    "type",
    "public_prive",
    "generique",
    "variantes",
    "libelles_arcom",
    "same_brand_as",
]


class ErreurReferentiel(Exception):
    """Référentiel des médias incohérent."""


def _liste(valeur: object) -> list[str]:
    if pd.isna(valeur) or str(valeur).strip() == "":
        return []
    return [v.strip() for v in str(valeur).split("|") if v.strip()]


def charger_referentiel(chemin: Path) -> pd.DataFrame:
    ref = pd.read_csv(chemin, dtype=str, keep_default_na=False, encoding="utf-8")
    erreurs: list[str] = []

    if list(ref.columns) != COLONNES:
        raise ErreurReferentiel(f"Colonnes attendues {COLONNES}, trouvées {list(ref.columns)}")
    doublons = ref.loc[ref["media_id"].duplicated(), "media_id"].tolist()
    if doublons:
        erreurs.append(f"identifiants en double : {doublons}")
    if (ref["media_id"].str.strip() == "").any() or (ref["nom"].str.strip() == "").any():
        erreurs.append("identifiant ou nom vide")
    for col, autorises in (
        ("type", TYPES),
        ("public_prive", STATUTS),
        ("generique", {"true", "false"}),
    ):
        invalides = sorted(set(ref[col]) - autorises)
        if invalides:
            erreurs.append(f"{col} : valeurs non autorisées {invalides}")
    if (ref["libelles_arcom"].str.strip() == "").any():
        erreurs.append(
            f"libellé Arcom manquant : {ref.loc[ref['libelles_arcom'] == '', 'media_id'].tolist()}"
        )

    ids = set(ref["media_id"])
    marque = dict(zip(ref["media_id"], ref["same_brand_as"], strict=True))
    for media, autre in marque.items():
        if not autre:
            continue
        if autre not in ids:
            erreurs.append(f"{media} : same_brand_as inconnu « {autre} »")
        elif marque.get(autre) != media:
            erreurs.append(f"{media} ↔ {autre} : same_brand_as doit être réciproque (RG-31)")

    if erreurs:
        raise ErreurReferentiel("Référentiel des médias invalide :\n  - " + "\n  - ".join(erreurs))

    ref["generique"] = ref["generique"] == "true"
    ref["variantes"] = ref["variantes"].map(_liste)
    ref["libelles_arcom"] = ref["libelles_arcom"].map(_liste)
    ref["same_brand_as"] = ref["same_brand_as"].replace("", None)
    return ref


def index_libelles(ref: pd.DataFrame) -> dict[str, set[str]]:
    """Libellé normalisé → médias qui le portent (libellés Arcom, nom, variantes)."""
    index: dict[str, set[str]] = {}
    for _, ligne in ref.iterrows():
        for texte in [ligne["nom"], *ligne["variantes"], *ligne["libelles_arcom"]]:
            index.setdefault(normaliser(texte), set()).add(ligne["media_id"])
    return index
