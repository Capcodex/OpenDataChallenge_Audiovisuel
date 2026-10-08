"""Étape « prepare_arcom » : table répondant × média et niveaux de confiance (E0-01, E0-03).

Dans le fichier de l'Arcom, une question à choix multiples occupe plusieurs colonnes
(SOURCES1BR_B2_R2_R_1, _2, …). Chaque colonne contient le CODE d'une modalité choisie, pas un
indicateur 0/1 par média. Un répondant suit le média de code c si c apparaît dans au moins une
colonne de la question (CdC technique § 6.3).

Sorties (data/interim/, données individuelles, jamais publiées) :
- repondant_media.parquet : resp_id, poids, une colonne 0/1 par média
- repondant_confiance.parquet : resp_id, media_id, niveau
  (1 référence, 2 complémentaire, 3 précaution)
- repondant_profil.parquet : resp_id, age_classe, pol (note 0-10, NaN si non-réponse)
Sortie agrégée (data/output/) :
- correspondance_confiance.csv : colonne de confiance → média, pour relecture
"""

import json
import logging
import re
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from pipeline.chemins import Chemins
from pipeline.config import charger_yaml, chemin_source
from pipeline.prepare.dictionnaire import charger_libelles
from pipeline.prepare.medias import charger_referentiel
from pipeline.texte import normaliser

log = logging.getLogger(__name__)


class ErreurCorrespondance(Exception):
    """Les codes de la configuration ne correspondent pas au dictionnaire de l'Arcom."""


def colonnes_question(colonnes: pd.Index, variable: str) -> list[str]:
    """Colonnes « <variable>_<n> » triées par n."""
    motif = re.compile(rf"^{re.escape(variable)}_(\d+)$")
    trouvees = [(int(m.group(1)), c) for c in colonnes if (m := motif.match(c))]
    if not trouvees:
        raise ErreurCorrespondance(f"Aucune colonne pour la question {variable}")
    return [c for _, c in sorted(trouvees)]


def libelles_attendus(ref: pd.DataFrame) -> dict[str, set[str]]:
    """media_id → libellés Arcom normalisés."""
    return {
        m: {normaliser(t) for t in libs}
        for m, libs in zip(ref["media_id"], ref["libelles_arcom"], strict=True)
    }


def verifier_codes(
    variable: str,
    codes: dict[int, str],
    libelles_dico: dict[int, str],
    attendus: dict[str, set[str]],
) -> None:
    """Chaque code configuré doit exister dans le dictionnaire avec le libellé du média visé."""
    erreurs = []
    for code, media in codes.items():
        if media not in attendus:
            erreurs.append(f"code {code} → « {media} » absent de medias.csv")
        elif code not in libelles_dico:
            erreurs.append(f"code {code} absent du dictionnaire")
        elif normaliser(libelles_dico[code]) not in attendus[media]:
            erreurs.append(
                f"code {code} : libellé « {libelles_dico[code]} » ≠ libellés de « {media} »"
            )
    if erreurs:
        raise ErreurCorrespondance(f"{variable} :\n  - " + "\n  - ".join(erreurs))


def codes_vers_indicateurs(bloc: pd.DataFrame, codes: dict[int, str]) -> pd.DataFrame:
    """Colonnes de codes → une colonne 0/1 (int8) par média. Une absence de réponse donne 0."""
    valeurs = bloc.to_numpy()
    return pd.DataFrame(
        {media: (valeurs == code).any(axis=1).astype("int8") for code, media in codes.items()},
        index=bloc.index,
    )


def rattacher_confiance(
    libelles_colonnes: dict[int, str],
    attendus: dict[str, set[str]],
    ignorer: set[int],
    forcer: dict[int, str],
) -> dict[int, str]:
    """Numéro de colonne de confiance → media_id, d'après les libellés du dictionnaire."""
    par_libelle: dict[str, set[str]] = {}
    for media, libs in attendus.items():
        for lib in libs:
            par_libelle.setdefault(lib, set()).add(media)

    correspondance: dict[int, str] = {}
    erreurs = []
    for numero, libelle in sorted(libelles_colonnes.items()):
        if numero in ignorer:
            continue
        if numero in forcer:
            if forcer[numero] not in attendus:
                erreurs.append(f"colonne {numero} : média forcé inconnu « {forcer[numero]} »")
            correspondance[numero] = forcer[numero]
            continue
        candidats = par_libelle.get(normaliser(libelle), set())
        if len(candidats) == 1:
            correspondance[numero] = next(iter(candidats))
        elif not candidats:
            erreurs.append(f"colonne {numero} « {libelle} » : aucun média correspondant")
        else:
            erreurs.append(
                f"colonne {numero} « {libelle} » : ambigu entre {sorted(candidats)} (à forcer)"
            )
    inconnues = (ignorer | set(forcer)) - set(libelles_colonnes)
    if inconnues:
        erreurs.append(f"colonnes ignorées ou forcées inexistantes : {sorted(inconnues)}")
    doublons = pd.Series(correspondance).loc[lambda s: s.duplicated(keep=False)]
    if not doublons.empty:
        erreurs.append(f"plusieurs colonnes pour un même média : {doublons.to_dict()}")
    if erreurs:
        raise ErreurCorrespondance("Confiance :\n  - " + "\n  - ".join(erreurs))
    return correspondance


def verifier_libelles(
    variable: str, attendus: dict[int, str], libelles_dico: dict[int, str]
) -> None:
    """Chaque code configuré doit porter, dans le dictionnaire, le libellé attendu."""
    erreurs = [
        f"code {code} : « {libelles_dico.get(code)} » au lieu de « {libelle} »"
        for code, libelle in attendus.items()
        if normaliser(libelles_dico.get(code, "")) != normaliser(libelle)
    ]
    if erreurs:
        raise ErreurCorrespondance(f"{variable} :\n  - " + "\n  - ".join(erreurs))


def note_politique(bloc: pd.DataFrame, valeurs: dict[int, int]) -> pd.Series:
    """Note 0-10 de chaque répondant ; NaN s'il n'a pas répondu.

    Les codes absents de `valeurs` (sous-totaux) sont ignorés. Un répondant avec deux notes
    différentes est une incohérence du fichier : arrêt.
    """
    codes = bloc.to_numpy()
    notes = np.full(codes.shape, np.nan)
    for code, valeur in valeurs.items():
        notes[codes == code] = valeur
    nb_notes = (~np.isnan(notes)).sum(axis=1)
    if (nb_notes > 1).any():
        raise ErreurCorrespondance(
            f"{int((nb_notes > 1).sum())} répondants ont plusieurs notes politiques"
        )
    # Au plus une note par ligne : la somme des notes présentes est cette note.
    return pd.Series(np.nansum(notes, axis=1), index=bloc.index).where(nb_notes == 1)


def profil_repondants(b: pd.DataFrame, cfg: dict[str, Any], libelles: dict) -> pd.DataFrame:
    """Classe d'âge et note politique de chaque répondant de la base (E0-06)."""
    age, pol = cfg["age"], cfg["politique"]
    classes = {int(k): v for k, v in age["classes"].items()}
    verifier_libelles(
        age["variable"],
        {k: v["libelle"] for k, v in classes.items()},
        libelles.get(age["variable"], {}),
    )
    codes_pol = {int(k): v for k, v in pol["codes"].items()}
    verifier_libelles(
        pol["variable"],
        {k: v["libelle"] for k, v in codes_pol.items()},
        libelles.get(pol["variable"], {}),
    )

    age_classe = b[age["variable"]]
    invalides = set(age_classe.dropna().astype(int)) - set(classes)
    if age_classe.isna().any() or invalides:
        raise ErreurCorrespondance(
            f"{age['variable']} : valeurs manquantes ou inconnues {sorted(invalides)}"
        )
    note = note_politique(
        b[colonnes_question(b.columns, pol["variable"])],
        {k: v["valeur"] for k, v in codes_pol.items()},
    )
    return pd.DataFrame(
        {"age_classe": age_classe.astype("int8"), "pol": note.astype("float64")}, index=b.index
    )


def _charger_config(chemins: Chemins) -> dict[str, Any]:
    return charger_yaml(chemins.config / "variables_arcom.yaml")


def executer(chemins: Chemins) -> None:
    cfg = _charger_config(chemins)
    base = pd.read_csv(
        chemin_source(chemins, cfg["sources"]["base"]), sep=";", decimal=",", low_memory=False
    )
    libelles = charger_libelles(chemin_source(chemins, cfg["sources"]["dictionnaire"]))
    ref = charger_referentiel(chemins.config / "medias.csv")
    attendus = libelles_attendus(ref)

    col_id, col_poids = cfg["colonnes"]["identifiant"], cfg["colonnes"]["poids"]
    if base[col_id].duplicated().any():
        raise ErreurCorrespondance(f"Identifiants de répondants en double dans {col_id}")
    if base[col_poids].isna().any() or (base[col_poids] <= 0).any():
        raise ErreurCorrespondance(f"Poids manquants ou non positifs dans {col_poids}")

    # Base : répondants interrogés sur les médias (RG-10).
    dans_base = base[colonnes_question(base.columns, cfg["question_base"])].notna().any(axis=1)
    b = base.loc[dans_base]
    log.info("  %d répondants au total, %d interrogés sur les médias", len(base), len(b))

    non_interroges: dict[str, int] = {}
    blocs = []
    for question in cfg["questions"]:
        variable = question["variable"]
        codes = {int(k): v for k, v in question["medias"].items()}
        verifier_codes(variable, codes, libelles.get(variable, {}), attendus)
        colonnes = colonnes_question(b.columns, variable)
        sans_reponse = b[colonnes].isna().all(axis=1)
        if sans_reponse.any() and not question.get("absence_vaut_non", False):
            raise ErreurCorrespondance(
                f"{variable} : {int(sans_reponse.sum())} répondants de la base sans réponse ; "
                f"préciser « absence_vaut_non » dans variables_arcom.yaml si c'est attendu"
            )
        if sans_reponse.any():
            non_interroges[variable] = int(sans_reponse.sum())
            log.info(
                "  %s : %d répondants non interrogés, comptés comme ne suivant pas ces médias",
                variable,
                int(sans_reponse.sum()),
            )
        blocs.append(codes_vers_indicateurs(b[colonnes], codes))

    indicateurs = pd.concat(blocs, axis=1)
    doublons = indicateurs.columns[indicateurs.columns.duplicated()].tolist()
    if doublons:
        raise ErreurCorrespondance(f"Média rattaché à plusieurs questions : {doublons}")
    non_configures = sorted(set(ref["media_id"]) - set(indicateurs.columns))
    if non_configures:
        raise ErreurCorrespondance(
            f"Médias du référentiel absents de variables_arcom.yaml : {non_configures}"
        )

    table = pd.concat(
        [
            b[[col_id, col_poids]].rename(columns={col_id: "resp_id", col_poids: "poids"}),
            indicateurs,
        ],
        axis=1,
    ).reset_index(drop=True)
    table["resp_id"] = table["resp_id"].astype("int64")
    table["poids"] = table["poids"].astype("float64")

    profil = profil_repondants(b, cfg["profil"], libelles)
    profil.insert(0, "resp_id", b[col_id].astype("int64"))
    profil = profil.reset_index(drop=True)

    # Confiance (E0-03).
    conf = cfg["confiance"]
    correspondance = rattacher_confiance(
        libelles.get(conf["liste_colonnes"], {}),
        attendus,
        set(conf.get("ignorer", [])),
        {int(k): v for k, v in conf.get("forcer", {}).items()},
    )
    niveaux_valides = {int(k) for k in conf["niveaux"]}
    colonnes_conf = {n: f"{conf['variable']}_{n}" for n in correspondance}
    manquantes = [c for c in colonnes_conf.values() if c not in b.columns]
    if manquantes:
        raise ErreurCorrespondance(f"Colonnes de confiance absentes du fichier : {manquantes}")
    longue = (
        b[[col_id, *colonnes_conf.values()]]
        .melt(id_vars=col_id, var_name="colonne", value_name="niveau")
        .dropna(subset=["niveau"])
    )
    longue["media_id"] = longue["colonne"].map(
        {c: correspondance[n] for n, c in colonnes_conf.items()}
    )
    longue["niveau"] = longue["niveau"].astype("int8")
    invalides = set(longue["niveau"]) - niveaux_valides
    if invalides:
        raise ErreurCorrespondance(f"Niveaux de confiance inattendus : {sorted(invalides)}")
    confiance = (
        longue.rename(columns={col_id: "resp_id"})[["resp_id", "media_id", "niveau"]]
        .astype({"resp_id": "int64"})
        .sort_values(["resp_id", "media_id"])
        .reset_index(drop=True)
    )

    chemins.interim.mkdir(parents=True, exist_ok=True)
    chemins.output.mkdir(parents=True, exist_ok=True)
    table.to_parquet(chemins.interim / "repondant_media.parquet", index=False)
    confiance.to_parquet(chemins.interim / "repondant_confiance.parquet", index=False)
    profil.to_parquet(chemins.interim / "repondant_profil.parquet", index=False)
    liste = libelles[conf["liste_colonnes"]]
    pd.DataFrame(
        [
            {
                "colonne": f"{conf['variable']}_{n}",
                "libelle_arcom": liste[n],
                "media_id": correspondance.get(n, ""),
                "statut": "ignorée"
                if n in set(conf.get("ignorer", []))
                else "forcée"
                if n in {int(k) for k in conf.get("forcer", {})}
                else "automatique",
            }
            for n in sorted(liste)
        ]
    ).to_csv(chemins.output / "correspondance_confiance.csv", index=False)

    log.info(
        "  %d médias × %d répondants ; %d réponses de confiance sur %d médias",
        indicateurs.shape[1],
        len(table),
        len(confiance),
        confiance["media_id"].nunique(),
    )
    log.info(
        "  Profil : %d notes politiques (%.1f %% de non-réponses)",
        int(profil["pol"].notna().sum()),
        100 * profil["pol"].isna().mean(),
    )
    journal = {
        "repondants_total": len(base),
        "repondants_base": len(b),
        "non_interroges_par_question": non_interroges,
        "medias": int(indicateurs.shape[1]),
        "reponses_confiance": len(confiance),
        "medias_avec_confiance": int(confiance["media_id"].nunique()),
        "notes_politiques": int(profil["pol"].notna().sum()),
    }
    (chemins.output / "journal_arcom.json").write_text(
        json.dumps(journal, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def entrees(chemins: Chemins) -> list[Path]:
    cfg = _charger_config(chemins)
    return [
        chemins.config / "variables_arcom.yaml",
        chemins.config / "medias.csv",
        chemin_source(chemins, cfg["sources"]["base"]),
        chemin_source(chemins, cfg["sources"]["dictionnaire"]),
    ]


def sorties(chemins: Chemins) -> list[Path]:
    return [
        chemins.interim / "repondant_media.parquet",
        chemins.interim / "repondant_confiance.parquet",
        chemins.interim / "repondant_profil.parquet",
        chemins.output / "correspondance_confiance.csv",
        chemins.output / "journal_arcom.json",
    ]
