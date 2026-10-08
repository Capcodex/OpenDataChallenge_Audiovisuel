import pandas as pd
import pytest

from pipeline.prepare.proprietes import (
    ErreurProprietes,
    charger_corrections,
    charger_relations,
    groupe_principal,
    identifiant,
    lire_part,
    proprietaires_ultimes,
    rattacher,
)


def _relations(lignes):
    return charger_relations(
        [pd.DataFrame(lignes, columns=["id", "origine", "qualificatif", "valeur", "cible"])]
    )


DETENTEURS = _relations(
    [
        (1, "Groupe A", "égal à", "100.00%", "Média A"),
        (2, "Holding", "égal à", "40.00%", "Groupe A"),
        (3, "Famille X", "égal à", "50.00%", "Holding"),
        (4, "Fonds Y", "égal à", "60.00%", "Groupe A"),
        (5, "République française", "contrôle", "", "Groupe public"),
        (6, "Groupe public", "égal à", "100.00%", "Média P"),
    ]
)


def test_lire_part():
    assert lire_part("égal à", "50.00%") == 0.5
    assert lire_part("égal à", "27,5%") == pytest.approx(0.275)
    assert lire_part("contrôle", "") is None
    assert lire_part("supérieur à", "10.00%") is None


def test_proprietaires_ultimes_et_parts_effectives():
    ultimes = proprietaires_ultimes("Média A", DETENTEURS)
    # Famille X : 50 % de 40 % de 100 % = 20 % ; Fonds Y : 60 %.
    assert ultimes == {"Famille X": pytest.approx(0.2), "Fonds Y": pytest.approx(0.6)}
    # Part inconnue (« contrôle ») sur le chemin : part effective inconnue.
    assert proprietaires_ultimes("Média P", DETENTEURS) == {"République française": None}


def test_cycle_de_detention_ignore():
    cycle = _relations(
        [
            (1, "B", "égal à", "100.00%", "Média"),
            (2, "C", "égal à", "50.00%", "B"),
            (3, "B", "égal à", "50.00%", "C"),
            (4, "Personne", "égal à", "50.00%", "C"),
        ]
    )
    assert proprietaires_ultimes("Média", cycle) == {"Personne": pytest.approx(0.25)}


def test_groupe_principal_plus_forte_part():
    assert groupe_principal("Groupe A", DETENTEURS) == "Fonds Y"
    assert groupe_principal("Média P", DETENTEURS) == "Groupe public"
    assert groupe_principal("Inconnu", DETENTEURS) is None


def test_identifiant():
    assert identifiant("République fédérale d’Allemagne") == "republique-federale-d-allemagne"


REF = pd.DataFrame(
    {
        "media_id": ["media-a", "jt-a", "absent", "generique"],
        "nom": ["Média A", "JT de A", "Absent", "Une autre radio"],
        "variantes": [[], [], [], []],
        "libelles_arcom": [[], [], [], []],
        "generique": [False, False, False, True],
    }
)


def _corrections(tmp_path, lignes):
    chemin = tmp_path / "corr.csv"
    colonnes = [
        "media_id",
        "regle",
        "valeur",
        "part",
        "type_proprietaire",
        "source",
        "date",
        "commentaire",
    ]
    pd.DataFrame(lignes, columns=colonnes).to_csv(chemin, index=False)
    return charger_corrections(chemin, set(REF["media_id"]))


def test_rattacher_base_meme_que_et_non_identifie(tmp_path):
    corr = _corrections(
        tmp_path,
        [
            ["jt-a", "meme_que", "media-a", "", "", "", "", ""],
            ["absent", "non_identifie", "", "", "", "", "", ""],
        ],
    )
    sortie = rattacher(REF, ["Média A"], DETENTEURS, {"Famille X"}, corr)
    a = sortie[sortie["media_id"] == "media-a"].set_index("proprietaire")
    assert a.loc["Famille X", "type_proprietaire"] == "personne"
    assert a.loc["Fonds Y", "type_proprietaire"] == "organisation"
    assert set(a["groupe"]) == {"Groupe A"}
    assert set(sortie.loc[sortie["media_id"] == "jt-a", "statut"]) == {"meme_que"}
    absent = sortie[sortie["media_id"] == "absent"]
    assert len(absent) == 1 and absent["proprietaire"].isna().all()
    assert "generique" not in set(sortie["media_id"])


def test_corrections_invalides(tmp_path):
    with pytest.raises(ErreurProprietes, match="règle inconnue"):
        _corrections(tmp_path, [["media-a", "devine", "", "", "", "", "", ""]])
    with pytest.raises(ErreurProprietes, match="sans nom, type valide ou source"):
        _corrections(tmp_path, [["media-a", "detenteur", "X", "50", "personne", "", "", ""]])
