"""Registre ordonné des étapes du pipeline (CdC technique § 6.2).

Chaque étape déclare ses entrées et ses sorties. L'empreinte d'une étape combine ses fichiers
d'entrée et le code source de son module : si rien n'a changé et que les sorties existent,
l'étape est sautée.
"""

import inspect
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType

import pandas as pd
import pandera.pandas as pa

from pipeline import ingest, schemas
from pipeline.chemins import Chemins
from pipeline.compute import attributs, coaudience, disposition, familles
from pipeline.export import journal, site_json, telechargements
from pipeline.prepare import arcom, proprietes, referentiel


@dataclass(frozen=True)
class Etape:
    nom: str
    description: str
    module: ModuleType
    # Sorties Parquet à valider après exécution, et le schéma correspondant.
    validations: dict[str, pa.DataFrameSchema] = field(default_factory=dict)

    def executer(self, chemins: Chemins) -> None:
        self.module.executer(chemins)

    def entrees(self, chemins: Chemins) -> list[Path]:
        return [*self.module.entrees(chemins), Path(inspect.getsourcefile(self.module))]

    def sorties(self, chemins: Chemins) -> list[Path]:
        return self.module.sorties(chemins)

    def valider(self, chemins: Chemins) -> None:
        for relatif, schema in self.validations.items():
            schema.validate(pd.read_parquet(chemins.data / relatif), lazy=True)


ETAPES: list[Etape] = [
    Etape("ingest", "Téléchargement et vérification des sources", ingest),
    Etape(
        "prepare_arcom",
        "Table répondant × média et niveaux de confiance (Arcom)",
        arcom,
        {
            "interim/repondant_media.parquet": schemas.REPONDANT_MEDIA,
            "interim/repondant_confiance.parquet": schemas.REPONDANT_CONFIANCE,
            "interim/repondant_profil.parquet": schemas.REPONDANT_PROFIL,
        },
    ),
    Etape(
        "referentiel",
        "Référentiel des médias, effectifs et statut affichable",
        referentiel,
        {"output/medias.parquet": schemas.MEDIAS},
    ),
    Etape(
        "proprietes",
        "Propriétaires des médias (base Médias français + corrections)",
        proprietes,
        {"output/proprietes.parquet": schemas.PROPRIETES},
    ),
    Etape(
        "coaudience",
        "Liens de co-audience : lift, intervalles, filtrage (RG-04, RG-05)",
        coaudience,
        {"output/liens.parquet": schemas.LIENS},
    ),
    Etape(
        "attributs",
        "Profil des publics : positionnement politique, âge, confiance",
        attributs,
        {"output/attributs_medias.parquet": schemas.ATTRIBUTS_MEDIAS},
    ),
    Etape(
        "familles",
        "Familles de médias (Leiden), stabilité (RG-07), médias ponts",
        familles,
        {"output/familles.parquet": schemas.FAMILLES},
    ),
    Etape(
        "disposition",
        "Disposition de la carte (ForceAtlas2, graine fixe)",
        disposition,
        {"output/disposition.parquet": schemas.DISPOSITION},
    ),
    Etape("export_site", "Export graph.json pour le site (validé par son schéma)", site_json),
    Etape(
        "telechargements",
        "Données téléchargeables (CSV, Parquet, GEXF, dictionnaire)",
        telechargements,
    ),
    Etape("journal", "Journal d'exécution complet (run_log.json)", journal),
]

NOMS: list[str] = [e.nom for e in ETAPES]


def selectionner(depuis: str | None = None, seulement: str | None = None) -> list[Etape]:
    for nom in (depuis, seulement):
        if nom is not None and nom not in NOMS:
            raise ValueError(f"Étape inconnue « {nom} ». Étapes : {', '.join(NOMS)}")
    if seulement:
        return [e for e in ETAPES if e.nom == seulement]
    if depuis:
        return ETAPES[NOMS.index(depuis) :]
    return list(ETAPES)
