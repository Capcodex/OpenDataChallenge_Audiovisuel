"""Aperçu de la carte et export GEXF provisoire (T-035) : hors produit, pour le jalon J2.

Lancement : `make exploration`. Écrit :
- docs/exploration/carte.svg : aperçu statique (positions, familles, liens affichés) ;
- data/output/graphe_provisoire.gexf : graphe complet pour Gephi (non publié avant le sprint 4).
"""

import html
import json
from pathlib import Path

import networkx as nx
import pandas as pd

from pipeline.chemins import Chemins

CHEMINS = Chemins.depuis_environnement()
SVG = Path(__file__).with_suffix(".svg")
# Palette catégorielle des maquettes (familles A à E) ; gris si les familles ne sont pas affichées.
PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"]
GRIS = "#5A616B"
LARGEUR, HAUTEUR, MARGE = 1600, 1200, 60


def main() -> None:
    medias = pd.read_parquet(CHEMINS.output / "medias.parquet").set_index("media_id")
    familles = pd.read_parquet(CHEMINS.output / "familles.parquet").set_index("media_id")
    xy = pd.read_parquet(CHEMINS.output / "disposition.parquet").set_index("media_id")
    attributs = pd.read_parquet(CHEMINS.output / "attributs_medias.parquet").set_index("media_id")
    liens = pd.read_parquet(CHEMINS.output / "liens.parquet")
    journal = json.loads((CHEMINS.output / "journal_familles.json").read_text(encoding="utf-8"))
    affichees = journal["familles_affichees"]

    def px(m: str) -> tuple[float, float]:
        return (
            MARGE + xy.loc[m, "x"] * (LARGEUR - 2 * MARGE),
            MARGE + xy.loc[m, "y"] * (HAUTEUR - 2 * MARGE),
        )

    def couleur(m: str) -> str:
        return PALETTE[(familles.loc[m, "famille"] - 1) % len(PALETTE)] if affichees else GRIS

    parties = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{LARGEUR}" height="{HAUTEUR}" '
        f'viewBox="0 0 {LARGEUR} {HAUTEUR}" font-family="IBM Plex Sans, sans-serif">',
        f'<rect width="{LARGEUR}" height="{HAUTEUR}" fill="#FFFFFF"/>',
    ]
    for lien in liens[liens["affiche"]].itertuples():
        (x1, y1), (x2, y2) = px(lien.source), px(lien.cible)
        meme = familles.loc[lien.source, "famille"] == familles.loc[lien.cible, "famille"]
        trait = couleur(lien.source) if meme and affichees else "#8A9099"
        parties.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{trait}" '
            f'stroke-opacity="0.25" stroke-width="{min(lien.lift, 6) * 0.5:.2f}"/>'
        )
    part_max = medias.loc[xy.index, "part_ponderee"].max()
    for m in xy.index:
        x, y = px(m)
        rayon = 6 + 22 * (medias.loc[m, "part_ponderee"] / part_max) ** 0.5
        bord = ' stroke="#14171C" stroke-width="2"' if familles.loc[m, "pont"] else ""
        parties.append(
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rayon:.1f}" fill="{couleur(m)}"{bord}/>'
        )
        parties.append(
            f'<text x="{x:.1f}" y="{y - rayon - 4:.1f}" font-size="14" text-anchor="middle" '
            f'fill="#14171C">{html.escape(medias.loc[m, "nom"])}</text>'
        )
    parties.append(
        f'<text x="{MARGE}" y="{HAUTEUR - 20}" font-size="16" fill="#3D434B">Aperçu provisoire : '
        f"{len(xy)} médias, {int(liens['affiche'].sum())} liens affichés, "
        f"{journal['familles']} familles ({100 * journal['part_medias_stables']:.0f} % stables). "
        "Taille = part du public ; contour noir = média pont.</text>"
    )
    parties.append("</svg>")
    SVG.write_text("\n".join(parties), encoding="utf-8")

    # GEXF : tous les liens retenus, attributs principaux (lecture dans Gephi).
    g = nx.Graph()
    for m in xy.index:
        g.add_node(
            m,
            label=medias.loc[m, "nom"],
            type=medias.loc[m, "type"],
            n_repondants=int(medias.loc[m, "n_repondants"]),
            famille=int(familles.loc[m, "famille"]),
            stabilite=float(familles.loc[m, "stabilite"]),
            pol_moy=float(attributs.loc[m, "pol_moy"]),
            age_moy=float(attributs.loc[m, "age_moy"]),
            viz={"position": {"x": 1000 * xy.loc[m, "x"], "y": -1000 * xy.loc[m, "y"], "z": 0.0}},
        )
    for lien in liens.itertuples():
        g.add_edge(
            lien.source,
            lien.cible,
            weight=float(lien.lift),
            lift_bas=float(lien.lift_bas),
            n_communs=int(lien.n_communs),
            affiche=bool(lien.affiche),
        )
    nx.write_gexf(g, CHEMINS.output / "graphe_provisoire.gexf")
    print(f"Aperçu écrit : {SVG} ; GEXF : {CHEMINS.output / 'graphe_provisoire.gexf'}")


if __name__ == "__main__":
    main()
