import copy
from pathlib import Path

import pytest
import yaml

from pipeline.config import Params, valider_params

PARAMS_PROJET = Path(__file__).parents[2] / "config" / "params.yaml"


@pytest.fixture
def params_yaml() -> dict:
    """Contenu de config/params.yaml, modifiable par le test."""
    return copy.deepcopy(yaml.safe_load(PARAMS_PROJET.read_text(encoding="utf-8")))


@pytest.fixture
def fabrique_params(params_yaml):
    """Params du projet, avec des valeurs remplacées : fabrique_params(seuils={"…": 3})."""

    def fabriquer(**sections: dict) -> Params:
        contenu = copy.deepcopy(params_yaml)
        for nom, valeurs in sections.items():
            contenu[nom].update(valeurs)
        return valider_params(contenu)

    return fabriquer
