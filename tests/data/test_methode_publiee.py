"""La page « Méthode » publie les résultats du dernier calcul (CdC fonctionnel § 12.1, T-081).

Chaque chiffre cité par docs/methode.md (source de la page /methode) est comparé au journal
d'exécution et à graph.json : après une nouvelle édition, une méthode non mise à jour fait échouer
les tests. Le résultat du test de stabilité des familles y est publié (critère « Stabilité »).
"""

import json

import pytest

from pipeline.chemins import Chemins

pytestmark = pytest.mark.data

CHEMINS = Chemins.depuis_environnement()


def _entier(n: int) -> str:
    """3377 → « 3 377 » (espace insécable ou espace simple, comme dans le document)."""
    return f"{n:,}".replace(",", " ")


@pytest.fixture(scope="module")
def methode() -> str:
    return (CHEMINS.racine / "docs" / "methode.md").read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def journal() -> dict:
    return json.loads((CHEMINS.site_public / "telechargements" / "journal.json").read_text())


@pytest.fixture(scope="module")
def graphe() -> dict:
    return json.loads((CHEMINS.site_public / "data" / "graph.json").read_text())


def test_repondants(methode, journal):
    r = journal["repondants"]
    assert f"**{_entier(r['total'])} personnes interrogées**" in methode
    assert f"**{_entier(r['base'])}**" in methode


def test_medias(methode, journal):
    m = journal["medias"]
    assert (
        f"{m['referentiel']} médias au référentiel, dont {m['generiques']} catégories génériques. "
        f"**{m['affichables']} médias sont affichables**, dont {m['fragiles']} fragiles."
    ) in methode


def test_liens(methode, journal):
    liens = journal["liens"]
    assert (
        f"{_entier(liens['paires_testees'])} paires testées, "
        f"**{_entier(liens['liens_retenus'])} liens gardés**. "
        f"{liens['rejet_effectif_commun_rg04']} paires sont écartées pour effectif insuffisant et "
        f"{liens['rejet_borne_basse_rg05']} pour un lift non significativement supérieur à 1"
    ) in methode
    assert f"cela fait **{liens['liens_affiches']} liens**" in methode
    lift_ref = f"{liens['lift_reference_intensite']:.2f}".replace(".", ",")
    assert f"environ **{lift_ref}**" in methode


def test_stabilite_des_familles_publiee(methode, journal):
    f = journal["familles"]
    part = round(f["part_medias_stables"] * 100)
    assert f"**{f['familles']} familles, {part} % des médias stables**" in methode
    for numero, taille in f["tailles"].items():
        assert f"| {numero} | {taille} |" in methode


def test_proprietaires_non_identifies(methode, graphe):
    n = sum(1 for m in graphe["nodes"] if m["owner_status"] == "non_identifie")
    assert f"{n} médias en {graphe['meta']['edition']}" in methode


def test_parametres_publies(methode, graphe):
    seuils = graphe["meta"]["params"]["seuils"]
    for cle in ("media_affichable_min", "chiffre_fragile_sous", "lien_effectif_commun_min"):
        assert f"| `{cle}` | {seuils[cle]} |" in methode
    assert f"| `publication.date_traitement` | {graphe['meta']['date_traitement']} |" in methode
