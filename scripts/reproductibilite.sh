#!/usr/bin/env sh
# Reproductibilité (ENF-12, T-049) : deux exécutions complètes et forcées du pipeline doivent
# produire des fichiers identiques, octet pour octet.
# Usage : scripts/reproductibilite.sh  (depuis la racine du dépôt ; Docker seulement)
set -eu

empreintes() {
  find data/interim data/output site/public/data site/public/telechargements -type f \
    ! -name '.gitkeep' ! -name 'graphe_provisoire.gexf' -print0 \
    | sort -z | xargs -0 sha256sum
}

lancer() {
  docker compose run --rm pipeline python -m pipeline run --force >/dev/null 2>&1 \
    || { echo "Le pipeline a échoué" >&2; exit 1; }
}

premiere=$(mktemp)
seconde=$(mktemp)
trap 'rm -f "$premiere" "$seconde"' EXIT

echo "1re exécution…"
lancer
empreintes >"$premiere"
echo "2e exécution…"
lancer
empreintes >"$seconde"

if diff -u "$premiere" "$seconde"; then
  echo "✓ $(wc -l <"$premiere" | tr -d ' ') fichiers identiques d'une exécution à l'autre"
else
  echo "✗ Sorties différentes entre deux exécutions" >&2
  exit 1
fi
