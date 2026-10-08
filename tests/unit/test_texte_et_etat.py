from pipeline.etat import Etat, empreinte
from pipeline.texte import normaliser


def test_normaliser_ignore_casse_accents_et_ponctuation():
    assert normaliser("Le Parisien / Aujourd’hui en France...") == normaliser(
        "le parisien aujourd'hui en france"
    )
    assert normaliser("Télérama") == "telerama"
    assert normaliser("Canal+") == "canal+"
    assert normaliser("France24") == normaliser("France 24")


def test_empreinte_change_quand_le_contenu_change(tmp_path):
    f = tmp_path / "a.txt"
    f.write_text("un")
    e1 = empreinte([f])
    f.write_text("deux")
    assert empreinte([f]) != e1


def test_etat_saute_une_etape_inchangee_seulement_si_les_sorties_existent(tmp_path):
    etat = Etat(tmp_path / "etat.json")
    sortie = tmp_path / "sortie.parquet"
    etat.enregistrer("etape", "abc")
    assert not etat.est_a_jour("etape", "abc", [sortie])  # sortie absente
    sortie.write_text("x")
    assert etat.est_a_jour("etape", "abc", [sortie])
    assert not etat.est_a_jour("etape", "autre", [sortie])  # entrées modifiées
    assert Etat(tmp_path / "etat.json").est_a_jour("etape", "abc", [sortie])  # persistance
