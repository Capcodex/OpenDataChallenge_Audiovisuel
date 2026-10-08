"""Étape « ingest » : téléchargement des sources et vérification de leur empreinte (T-008).

Un fichier déjà présent avec la bonne empreinte n'est pas retéléchargé. Une empreinte différente
de celle de config/sources.yaml arrête le pipeline : la source a changé et doit être revue.
"""

import json
import logging
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

from pipeline.chemins import Chemins
from pipeline.config import Source, charger_sources
from pipeline.etat import sha256_fichier

log = logging.getLogger(__name__)

USER_AGENT = "graphe-medias/0.1 (+https://github.com/; pipeline de données ouvertes)"
DELAI_SECONDES = 120


class ErreurEmpreinte(Exception):
    """Le fichier téléchargé ne correspond pas à l'empreinte attendue."""


def _telecharger_vers(url: str, destination: Path) -> None:
    requete = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with (
        urllib.request.urlopen(requete, timeout=DELAI_SECONDES) as reponse,
        destination.open("wb") as f,
    ):
        while bloc := reponse.read(1 << 20):
            f.write(bloc)


def recuperer(source: Source, chemins: Chemins) -> Path:
    """Garantit que le fichier de la source est présent et conforme ; renvoie son chemin."""
    destination = chemins.data / source.fichier
    if destination.exists() and sha256_fichier(destination) == source.sha256:
        log.info("  %-34s déjà présent, empreinte conforme", source.id)
        return destination

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporaire = destination.with_name(destination.name + ".part")
    try:
        log.info("  %-34s téléchargement…", source.id)
        _telecharger_vers(source.url, temporaire)
        obtenue = sha256_fichier(temporaire)
        if obtenue != source.sha256:
            raise ErreurEmpreinte(
                f"{source.id} : empreinte inattendue.\n"
                f"  attendue : {source.sha256}\n"
                f"  obtenue  : {obtenue}\n"
                f"La source a probablement été mise à jour par son producteur. "
                f"Vérifier le fichier, "
                f"puis mettre à jour config/sources.yaml si la nouvelle version est acceptée."
            )
        temporaire.replace(destination)
    finally:
        temporaire.unlink(missing_ok=True)
    return destination


def executer(chemins: Chemins) -> None:
    sources = charger_sources(chemins)
    manifeste = []
    for source in sources.values():
        chemin = recuperer(source, chemins)
        manifeste.append(
            {
                "id": source.id,
                "url": source.url,
                "fichier": source.fichier,
                "sha256": source.sha256,
                "octets": chemin.stat().st_size,
            }
        )
    sortie = chemins.raw / "manifest.json"
    sortie.write_text(
        json.dumps(
            {"verifie_le": datetime.now(UTC).isoformat(timespec="seconds"), "sources": manifeste},
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    log.info(
        "  %d sources conformes, manifeste : %s", len(manifeste), sortie.relative_to(chemins.racine)
    )


def sorties(chemins: Chemins) -> list[Path]:
    return [chemins.data / s.fichier for s in charger_sources(chemins).values()] + [
        chemins.raw / "manifest.json"
    ]


def entrees(chemins: Chemins) -> list[Path]:
    return [chemins.config / "sources.yaml"]
