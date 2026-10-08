"""Ligne de commande du pipeline : `python -m pipeline <commande>` (T-007, CdC technique § 6.1)."""

import argparse
import logging
import sys
import time

from pipeline import __version__
from pipeline.chemins import Chemins
from pipeline.etapes import ETAPES, NOMS, selectionner
from pipeline.etat import Etat, empreinte

log = logging.getLogger("pipeline")


def commande_run(args: argparse.Namespace, chemins: Chemins) -> int:
    etat = Etat(chemins.etat)
    etapes = selectionner(depuis=args.depuis, seulement=args.seulement)
    debut = time.monotonic()
    for etape in etapes:
        try:
            empreinte_entrees = empreinte(etape.entrees(chemins))
        except FileNotFoundError as e:
            log.error("Étape « %s » : %s. Lancer d'abord les étapes précédentes.", etape.nom, e)
            return 1
        if not args.force and etat.est_a_jour(etape.nom, empreinte_entrees, etape.sorties(chemins)):
            log.info("▸ %s : à jour, ignorée", etape.nom)
            continue
        log.info("▸ %s : %s", etape.nom, etape.description)
        t0 = time.monotonic()
        etape.executer(chemins)
        etape.valider(chemins)
        etat.enregistrer(etape.nom, empreinte_entrees)
        log.info("  terminé en %.1f s", time.monotonic() - t0)
    log.info("Pipeline terminé en %.1f s", time.monotonic() - debut)
    return 0


def commande_check(_: argparse.Namespace, chemins: Chemins) -> int:
    erreurs = 0
    for etape in ETAPES:
        manquantes = [s for s in etape.sorties(chemins) if not s.exists()]
        if manquantes:
            log.error("✗ %s : sorties manquantes %s", etape.nom, [str(m) for m in manquantes])
            erreurs += 1
            continue
        try:
            etape.valider(chemins)
        except Exception as e:  # on veut le détail de chaque échec de validation
            log.error("✗ %s : %s", etape.nom, e)
            erreurs += 1
            continue
        log.info("✓ %s", etape.nom)
    return 1 if erreurs else 0


def commande_export_neo4j(_: argparse.Namespace, __: Chemins) -> int:
    log.error("export-neo4j sera disponible au sprint 4 (tâche T-046).")
    return 2


def construire_parseur() -> argparse.ArgumentParser:
    parseur = argparse.ArgumentParser(prog="python -m pipeline", description=__doc__)
    parseur.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    parseur.add_argument("-v", "--verbeux", action="store_true", help="journal détaillé")
    sous = parseur.add_subparsers(dest="commande", required=True)

    run = sous.add_parser("run", help="exécuter le pipeline")
    groupe = run.add_mutually_exclusive_group()
    groupe.add_argument(
        "--from", dest="depuis", choices=NOMS, help="reprendre à partir de cette étape"
    )
    groupe.add_argument("--only", dest="seulement", choices=NOMS, help="exécuter cette seule étape")
    run.add_argument(
        "--force", action="store_true", help="réexécuter même si les entrées n'ont pas changé"
    )
    run.set_defaults(fonction=commande_run)

    check = sous.add_parser("check", help="valider les sorties existantes")
    check.set_defaults(fonction=commande_check)

    neo = sous.add_parser("export-neo4j", help="charger le graphe dans Neo4j (sprint 4)")
    neo.set_defaults(fonction=commande_export_neo4j)
    return parseur


def main(argv: list[str] | None = None) -> int:
    args = construire_parseur().parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbeux else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
    )
    return args.fonction(args, Chemins.depuis_environnement())


if __name__ == "__main__":
    sys.exit(main())
