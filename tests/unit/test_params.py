import pytest

from pipeline.config import ErreurConfiguration, valider_params


def test_params_du_projet_valides(params_yaml):
    p = valider_params(params_yaml)
    assert p.seuils.lien_effectif_commun_min == 30
    assert p.seuils.lien_lift_borne_basse_min == 1.0
    assert p.bootstrap.quantiles == pytest.approx((0.025, 0.975))
    assert p.publies()["seuils"]["media_affichable_min"] == 50


def test_entier_accepte_pour_un_reel(params_yaml):
    params_yaml["seuils"]["lien_lift_borne_basse_min"] = 1
    assert isinstance(valider_params(params_yaml).seuils.lien_lift_borne_basse_min, float)


@pytest.mark.parametrize(
    ("modifier", "message"),
    [
        (lambda c: c["seuils"].pop("lien_effectif_commun_min"), "manquantes"),
        (lambda c: c["seuils"].update(seuil_inconnu=3), "inconnues"),
        (lambda c: c["seuils"].update(media_affichable_min="50"), "type int"),
        (lambda c: c["seuils"].update(media_affichable_min=True), "type int"),
        (lambda c: c.pop("bootstrap"), "absente"),
        (lambda c: c.update(seed="abc"), "seed"),
        (lambda c: c["bootstrap"].update(niveau_confiance=95), "niveau_confiance"),
        (lambda c: c["seuils"].update(chiffre_fragile_sous=10), "fragile"),
        (lambda c: c["attributs"].update(gauche_max=6, droite_min=6), "gauche_max"),
        (lambda c: c["communautes"].update(sous_echantillons=50), "RG-07"),
    ],
)
def test_params_invalides_font_echouer(params_yaml, modifier, message):
    modifier(params_yaml)
    with pytest.raises(ErreurConfiguration, match=message):
        valider_params(params_yaml)
