import hashlib

import pytest

from pipeline.chemins import Chemins
from pipeline.config import Source
from pipeline.ingest import ErreurEmpreinte, recuperer


@pytest.fixture
def chemins(tmp_path):
    return Chemins(tmp_path / "projet")


@pytest.fixture
def fichier_distant(tmp_path):
    distant = tmp_path / "distant.csv"
    distant.write_bytes(b"a;b\n1;2\n")
    return distant, hashlib.sha256(distant.read_bytes()).hexdigest()


def test_telecharge_et_verifie_l_empreinte(chemins, fichier_distant):
    distant, sha = fichier_distant
    source = Source("essai", distant.as_uri(), "raw/essai.csv", sha)
    chemin = recuperer(source, chemins)
    assert chemin.read_bytes() == distant.read_bytes()


def test_empreinte_fausse_arrete_et_ne_laisse_aucun_fichier(chemins, fichier_distant):
    distant, _ = fichier_distant
    source = Source("essai", distant.as_uri(), "raw/essai.csv", "0" * 64)
    with pytest.raises(ErreurEmpreinte, match="empreinte inattendue"):
        recuperer(source, chemins)
    assert not (chemins.data / "raw/essai.csv").exists()
    assert not (chemins.data / "raw/essai.csv.part").exists()


def test_fichier_present_et_conforme_n_est_pas_retelecharge(chemins, fichier_distant, tmp_path):
    distant, sha = fichier_distant
    destination = chemins.data / "raw/essai.csv"
    destination.parent.mkdir(parents=True)
    destination.write_bytes(distant.read_bytes())
    introuvable = (tmp_path / "n-existe-pas.csv").as_uri()  # échouerait si on téléchargeait
    assert recuperer(Source("essai", introuvable, "raw/essai.csv", sha), chemins) == destination
