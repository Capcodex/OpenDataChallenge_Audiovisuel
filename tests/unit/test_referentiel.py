import pandas as pd
import pytest

from pipeline.prepare.medias import COLONNES, ErreurReferentiel, charger_referentiel
from pipeline.prepare.referentiel import enrichir


def _ecrire(tmp_path, lignes):
    chemin = tmp_path / "medias.csv"
    pd.DataFrame(lignes, columns=COLONNES).to_csv(chemin, index=False)
    return chemin


LIGNE = ["a", "A", "radio", "public", "false", "", "A", ""]


def test_referentiel_valide(tmp_path):
    ref = charger_referentiel(
        _ecrire(tmp_path, [LIGNE, ["b", "B", "tv", "prive", "true", "B1|B2", "B", ""]])
    )
    assert ref.loc[1, "variantes"] == ["B1", "B2"]
    assert ref["generique"].tolist() == [False, True]


@pytest.mark.parametrize(
    ("lignes", "message"),
    [
        ([LIGNE, LIGNE], "en double"),
        ([["a", "A", "podcast", "public", "false", "", "A", ""]], "type"),
        (
            [
                ["a", "A", "radio", "public", "false", "", "A", "b"],
                ["b", "B", "tv", "public", "false", "", "B", ""],
            ],
            "réciproque",
        ),
        ([["a", "A", "radio", "public", "false", "", "", ""]], "libellé Arcom manquant"),
    ],
)
def test_referentiel_invalide(tmp_path, lignes, message):
    with pytest.raises(ErreurReferentiel, match=message):
        charger_referentiel(_ecrire(tmp_path, lignes))


def test_enrichir_applique_rg01_et_rg03():
    ref = pd.DataFrame({"media_id": ["a", "b", "c"], "generique": [False, False, True]})
    table = pd.DataFrame(
        {
            "resp_id": range(4),
            "poids": [1.0, 1.0, 1.0, 3.0],
            "a": pd.Series([1, 1, 1, 0], dtype="int8"),
            "b": pd.Series([1, 0, 0, 0], dtype="int8"),
            "c": pd.Series([1, 1, 1, 1], dtype="int8"),
        }
    )
    sortie = enrichir(ref, table, seuil_affichable=2, seuil_fragile=3).set_index("media_id")
    assert sortie["n_repondants"].to_dict() == {"a": 3, "b": 1, "c": 4}
    assert sortie.loc["a", "part_ponderee"] == pytest.approx(3 / 6)
    assert sortie["affichable"].to_dict() == {"a": True, "b": False, "c": False}  # c est générique
    assert sortie["fragile"].to_dict() == {"a": False, "b": True, "c": False}
