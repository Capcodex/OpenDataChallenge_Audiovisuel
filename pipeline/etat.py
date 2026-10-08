"""Mémorisation de l'état des étapes : une étape dont les entrées n'ont pas changé est sautée."""

import hashlib
import json
from pathlib import Path


def sha256_fichier(chemin: Path, taille_bloc: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with chemin.open("rb") as f:
        while bloc := f.read(taille_bloc):
            h.update(bloc)
    return h.hexdigest()


def empreinte(fichiers: list[Path]) -> str:
    """Empreinte combinée d'une liste de fichiers (nom + contenu). Fichier absent = erreur."""
    h = hashlib.sha256()
    for f in sorted(fichiers, key=str):
        if not f.exists():
            raise FileNotFoundError(f"Entrée manquante : {f}")
        h.update(str(f.name).encode())
        h.update(sha256_fichier(f).encode())
    return h.hexdigest()


class Etat:
    def __init__(self, chemin: Path):
        self.chemin = chemin
        self._etat: dict[str, str] = {}
        if chemin.exists():
            self._etat = json.loads(chemin.read_text(encoding="utf-8"))

    def est_a_jour(self, etape: str, empreinte_entrees: str, sorties: list[Path]) -> bool:
        return self._etat.get(etape) == empreinte_entrees and all(s.exists() for s in sorties)

    def enregistrer(self, etape: str, empreinte_entrees: str) -> None:
        self._etat[etape] = empreinte_entrees
        self.chemin.parent.mkdir(parents=True, exist_ok=True)
        self.chemin.write_text(json.dumps(self._etat, indent=2, sort_keys=True), encoding="utf-8")
