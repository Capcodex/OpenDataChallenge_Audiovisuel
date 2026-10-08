"""Lecture des fichiers de configuration (config/*.yaml)."""

from dataclasses import asdict, dataclass, fields
from pathlib import Path
from typing import Any

import yaml

from pipeline.chemins import Chemins


class ErreurConfiguration(Exception):
    """Fichier de configuration absent ou invalide."""


def charger_yaml(chemin: Path) -> dict[str, Any]:
    if not chemin.exists():
        raise ErreurConfiguration(f"Fichier de configuration introuvable : {chemin}")
    with chemin.open(encoding="utf-8") as f:
        contenu = yaml.safe_load(f)
    if not isinstance(contenu, dict):
        raise ErreurConfiguration(f"{chemin} doit contenir un dictionnaire YAML")
    return contenu


@dataclass(frozen=True)
class Source:
    id: str
    url: str
    fichier: str
    sha256: str


def charger_sources(chemins: Chemins) -> dict[str, Source]:
    contenu = charger_yaml(chemins.config / "sources.yaml")
    sources: dict[str, Source] = {}
    for entree in contenu.get("sources", []):
        manquantes = {"id", "url", "fichier", "sha256"} - set(entree)
        if manquantes:
            raise ErreurConfiguration(f"Source incomplète {entree!r} : manque {sorted(manquantes)}")
        if entree["id"] in sources:
            raise ErreurConfiguration(f"Identifiant de source en double : {entree['id']}")
        sources[entree["id"]] = Source(
            **{k: str(entree[k]) for k in ("id", "url", "fichier", "sha256")}
        )
    return sources


def chemin_source(chemins: Chemins, source_id: str) -> Path:
    sources = charger_sources(chemins)
    if source_id not in sources:
        raise ErreurConfiguration(f"Source inconnue dans sources.yaml : {source_id}")
    return chemins.data / sources[source_id].fichier


# Paramètres (config/params.yaml, RG-08, T-016). Chaque section est une classe figée ; la
# validation refuse les clés absentes, inconnues, de mauvais type ou hors plage.


@dataclass(frozen=True)
class Seuils:
    media_affichable_min: int
    chiffre_fragile_sous: int
    lien_effectif_commun_min: int
    lien_lift_borne_basse_min: float
    confiance_effectif_min: int
    ecart_effectif_min_par_bord: int


@dataclass(frozen=True)
class Bootstrap:
    iterations: int
    niveau_confiance: float

    @property
    def quantiles(self) -> tuple[float, float]:
        alpha = 1 - self.niveau_confiance
        return alpha / 2, 1 - alpha / 2


@dataclass(frozen=True)
class Attributs:
    age_valeur_65_plus: float
    gauche_max: int
    droite_min: int


@dataclass(frozen=True)
class Affichage:
    voisins_min_par_media: int


@dataclass(frozen=True)
class Communautes:
    algorithme: str
    liens: str
    poids: str
    resolution: float
    sous_echantillons: int
    stabilite_noeud_min: float
    part_noeuds_stables_min: float
    ponts_nombre: int


@dataclass(frozen=True)
class Layout:
    algorithme: str
    iterations: int


@dataclass(frozen=True)
class Params:
    edition: str
    seed: int
    seuils: Seuils
    bootstrap: Bootstrap
    attributs: Attributs
    affichage: Affichage
    communautes: Communautes
    layout: Layout

    def publies(self) -> dict[str, Any]:
        """Paramètres sous forme de dictionnaire, pour le journal et les exports."""
        return asdict(self)


def _section(contenu: dict[str, Any], nom: str, classe: type) -> Any:
    valeurs = contenu.get(nom)
    if not isinstance(valeurs, dict):
        raise ErreurConfiguration(f"params.yaml : section « {nom} » absente")
    attendues = {f.name: f.type for f in fields(classe)}
    manquantes = sorted(set(attendues) - set(valeurs))
    inconnues = sorted(set(valeurs) - set(attendues))
    if manquantes or inconnues:
        raise ErreurConfiguration(
            f"params.yaml, section « {nom} » : clés manquantes {manquantes}, inconnues {inconnues}"
        )
    for cle, type_attendu in attendues.items():
        valeur = valeurs[cle]
        # YAML lit « 1 » comme un entier : accepté là où un réel est attendu. Un booléen n'est
        # jamais un nombre valide.
        acceptes = (int, float) if type_attendu is float else (type_attendu,)
        if isinstance(valeur, bool) or not isinstance(valeur, acceptes):
            raise ErreurConfiguration(
                f"params.yaml : {nom}.{cle} doit être de type {type_attendu.__name__}, "
                f"pas {valeur!r}"
            )
    return classe(**{k: float(v) if attendues[k] is float else v for k, v in valeurs.items()})


def valider_params(contenu: dict[str, Any]) -> Params:
    edition, seed = contenu.get("edition"), contenu.get("seed")
    if not isinstance(edition, str) or not edition:
        raise ErreurConfiguration("params.yaml : « edition » doit être une chaîne")
    if isinstance(seed, bool) or not isinstance(seed, int):
        raise ErreurConfiguration("params.yaml : « seed » doit être un entier")
    p = Params(
        edition=edition,
        seed=seed,
        seuils=_section(contenu, "seuils", Seuils),
        bootstrap=_section(contenu, "bootstrap", Bootstrap),
        attributs=_section(contenu, "attributs", Attributs),
        affichage=_section(contenu, "affichage", Affichage),
        communautes=_section(contenu, "communautes", Communautes),
        layout=_section(contenu, "layout", Layout),
    )
    s, b, a, c = p.seuils, p.bootstrap, p.attributs, p.communautes
    regles = [
        (s.media_affichable_min >= 1, "seuils.media_affichable_min ≥ 1"),
        (s.chiffre_fragile_sous >= s.media_affichable_min, "chiffre_fragile_sous ≥ affichable"),
        (s.lien_effectif_commun_min >= 1, "seuils.lien_effectif_commun_min ≥ 1"),
        (s.lien_lift_borne_basse_min > 0, "seuils.lien_lift_borne_basse_min > 0"),
        (s.confiance_effectif_min >= 1, "seuils.confiance_effectif_min ≥ 1"),
        (s.ecart_effectif_min_par_bord >= 1, "seuils.ecart_effectif_min_par_bord ≥ 1"),
        (b.iterations >= 100, "bootstrap.iterations ≥ 100"),
        (0.5 < b.niveau_confiance < 1, "0,5 < bootstrap.niveau_confiance < 1"),
        (a.age_valeur_65_plus >= 65, "attributs.age_valeur_65_plus ≥ 65"),
        (0 <= a.gauche_max < a.droite_min <= 10, "0 ≤ gauche_max < droite_min ≤ 10"),
        (p.affichage.voisins_min_par_media >= 1, "affichage.voisins_min_par_media ≥ 1"),
        (c.algorithme == "leiden", "communautes.algorithme : leiden"),
        (c.liens in {"affiches", "retenus"}, "communautes.liens : affiches ou retenus"),
        (c.poids in {"log_lift", "lift"}, "communautes.poids : log_lift ou lift"),
        (c.ponts_nombre >= 0, "communautes.ponts_nombre ≥ 0"),
        (c.resolution > 0, "communautes.resolution > 0"),
        (c.sous_echantillons >= 100, "communautes.sous_echantillons ≥ 100 (RG-07)"),
        (0 < c.stabilite_noeud_min <= 1, "0 < communautes.stabilite_noeud_min ≤ 1"),
        (0 < c.part_noeuds_stables_min <= 1, "0 < communautes.part_noeuds_stables_min ≤ 1"),
        (p.layout.iterations >= 1, "layout.iterations ≥ 1"),
    ]
    echecs = [message for ok, message in regles if not ok]
    if echecs:
        raise ErreurConfiguration("params.yaml : règles non respectées : " + " ; ".join(echecs))
    return p


def charger_params(chemins: Chemins) -> Params:
    return valider_params(charger_yaml(chemins.config / "params.yaml"))
