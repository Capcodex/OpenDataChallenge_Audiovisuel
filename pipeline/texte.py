"""Normalisation des libellés, pour comparer des textes saisis différemment."""

import re
import unicodedata


def normaliser(texte: str) -> str:
    """Minuscules, sans accents, sans ponctuation ni espaces.

    « Le Parisien / Aujourd’hui en France... » et « le parisien aujourd'hui en france »
    donnent la même clé.
    """
    sans_accents = unicodedata.normalize("NFKD", str(texte))
    sans_accents = "".join(c for c in sans_accents if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9+]", "", sans_accents.lower())
