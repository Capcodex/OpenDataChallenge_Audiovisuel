import numpy as np
import pandas as pd
import pytest

from pipeline.prepare.arcom import (
    ErreurCorrespondance,
    codes_vers_indicateurs,
    colonnes_question,
    rattacher_confiance,
    verifier_codes,
)
from pipeline.texte import normaliser

ATTENDUS = {
    "le-monde": {normaliser("Le Monde")},
    "le-figaro": {normaliser("Le Figaro")},
    "autre-journal": {normaliser("Un autre journal")},
    "autre-jt": {normaliser("Un autre journal")},
}


def test_colonnes_question_triees_numeriquement_et_sans_faux_positifs():
    colonnes = pd.Index(["Q_10", "Q_2", "Q_1", "Q_R_1", "QX_1", "Q_1_bis"])
    assert colonnes_question(colonnes, "Q") == ["Q_1", "Q_2", "Q_10"]
    with pytest.raises(ErreurCorrespondance):
        colonnes_question(colonnes, "ABSENTE")


def test_codes_vers_indicateurs_cherche_le_code_dans_toutes_les_colonnes():
    # Colonnes = emplacements de réponse ; valeurs = codes choisis (1 = sous-total « ST », ignoré).
    bloc = pd.DataFrame(
        {
            "Q_1": [1, 1, 17, np.nan],
            "Q_2": [2, 4, np.nan, np.nan],
            "Q_3": [4, np.nan, np.nan, np.nan],
        }
    )
    resultat = codes_vers_indicateurs(bloc, {2: "le-monde", 4: "le-figaro"})
    assert resultat["le-monde"].tolist() == [1, 0, 0, 0]
    assert resultat["le-figaro"].tolist() == [1, 1, 0, 0]
    assert list(resultat.columns) == ["le-monde", "le-figaro"]  # code 1 (ST) et 17 ignorés
    assert set(resultat.dtypes) == {np.dtype("int8")}


def test_verifier_codes_detecte_un_code_renumerote():
    dico = {2: "Le Monde", 4: "Le Figaro"}
    verifier_codes("Q", {2: "le-monde", 4: "le-figaro"}, dico, ATTENDUS)
    with pytest.raises(ErreurCorrespondance, match="code 2"):
        verifier_codes("Q", {2: "le-figaro"}, dico, ATTENDUS)
    with pytest.raises(ErreurCorrespondance, match="absent du dictionnaire"):
        verifier_codes("Q", {9: "le-monde"}, dico, ATTENDUS)


def test_rattacher_confiance_par_libelle_avec_ignores_et_forces():
    liste = {1: "Le Monde", 2: "Un autre journal", 3: "RCI Martinique", 4: "Le Figaro"}
    resultat = rattacher_confiance(liste, ATTENDUS, ignorer={3}, forcer={2: "autre-journal"})
    assert resultat == {1: "le-monde", 2: "autre-journal", 4: "le-figaro"}


def test_rattacher_confiance_refuse_les_ambiguites_et_les_inconnus():
    with pytest.raises(ErreurCorrespondance, match="ambigu"):
        rattacher_confiance({1: "Un autre journal"}, ATTENDUS, ignorer=set(), forcer={})
    with pytest.raises(ErreurCorrespondance, match="aucun média"):
        rattacher_confiance({1: "Média inconnu"}, ATTENDUS, ignorer=set(), forcer={})


def test_note_politique_garde_la_note_detaillee_et_le_centre():
    from pipeline.prepare.arcom import note_politique

    # Colonne 1 : sous-totaux (4 = ST Gauche, 8 = ST Centre, 9 = ST Droite) ; colonne 2 : note.
    valeurs = {7: 4, 8: 5, 10: 6}
    bloc = pd.DataFrame({"Q_1": [4, 8, 9, np.nan], "Q_2": [7, np.nan, 10, np.nan]})
    notes = note_politique(bloc, valeurs)
    assert notes.iloc[:3].tolist() == [4, 5, 6]
    assert np.isnan(notes.iloc[3])  # non-réponse


def test_note_politique_refuse_deux_notes():
    from pipeline.prepare.arcom import note_politique

    with pytest.raises(ErreurCorrespondance, match="plusieurs notes"):
        note_politique(pd.DataFrame({"Q_1": [7], "Q_2": [10]}), {7: 4, 10: 6})


def test_verifier_libelles_detecte_une_renumerotation():
    from pipeline.prepare.arcom import verifier_libelles

    dico = {1: "18-24 ans", 2: "25-34 ans"}
    verifier_libelles("AGE", {1: "18-24 ans", 2: "25-34 ans"}, dico)
    with pytest.raises(ErreurCorrespondance, match="code 1"):
        verifier_libelles("AGE", {1: "25-34 ans"}, dico)
