"""Emplacements des fichiers du projet.

Tous les chemins dérivent d'une racine unique : le dossier de travail du conteneur (/app),
ou la variable d'environnement GM_RACINE (utilisée par les tests).
"""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Chemins:
    racine: Path

    @classmethod
    def depuis_environnement(cls) -> "Chemins":
        return cls(Path(os.environ.get("GM_RACINE", Path.cwd())).resolve())

    @property
    def config(self) -> Path:
        return self.racine / "config"

    @property
    def data(self) -> Path:
        return self.racine / "data"

    @property
    def raw(self) -> Path:
        return self.data / "raw"

    @property
    def interim(self) -> Path:
        """Fichiers intermédiaires : contiennent des réponses individuelles, jamais publiés."""
        return self.data / "interim"

    @property
    def output(self) -> Path:
        """Sorties agrégées (source de vérité, CdC technique principe A3)."""
        return self.data / "output"

    @property
    def site_public(self) -> Path:
        return self.racine / "site" / "public"

    @property
    def schema_graphe(self) -> Path:
        """Schéma JSON de graph.json, partagé avec le site (CdC technique § 8.2)."""
        return self.racine / "site" / "src" / "graph" / "schema.json"

    @property
    def etat(self) -> Path:
        return self.data / ".etat_pipeline.json"
