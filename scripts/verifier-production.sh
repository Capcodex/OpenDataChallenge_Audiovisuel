#!/usr/bin/env sh
# Vérifications du site en ligne (T-088, ENF-11, CdC technique § 14) : HTTPS, en-têtes de sécurité,
# pages et liens permanents, aperçus Open Graph, temps de chargement des données (ENF-01).
# Usage : scripts/verifier-production.sh https://graphe-medias-718967467429.europe-west9.run.app
# Lancé par .github/workflows/deploy.yml après chaque déploiement ; utilisable à la main.
set -eu

URL=${1:?Adresse du site attendue, par exemple https://…run.app}
URL=${URL%/}
echecs=0
ok() { echo "✓ $1"; }
ko() { echo "✗ $1" >&2; echecs=$((echecs + 1)); }
code() { curl -s -o /dev/null -w '%{http_code}' "$URL$1"; }

# Le service peut démarrer à froid : quelques essais avant le premier contrôle.
for _ in 1 2 3 4 5 6; do curl -sf -o /dev/null "$URL/" && break; sleep 5; done

case $URL in https://*) ok "HTTPS" ;; *) ko "l'adresse n'est pas en HTTPS" ;; esac

entetes=$(curl -sI "$URL/")
for entete in \
  "content-security-policy: default-src 'self'" \
  "strict-transport-security: max-age=" \
  "x-content-type-options: nosniff" \
  "x-frame-options: deny" \
  "referrer-policy: strict-origin-when-cross-origin" \
  "permissions-policy: camera=()" \
  "cross-origin-opener-policy: same-origin"; do
  if printf '%s\n' "$entetes" | tr 'A-Z' 'a-z' | grep -q "^$(printf '%s' "$entete" | tr 'A-Z' 'a-z')"; then
    ok "en-tête ${entete%%:*}"
  else
    ko "en-tête manquant : $entete"
  fi
done

for page in / /methode /tableau /media/le-monde /media/le-monde/ \
  /data/graph.json /telechargements/liens.csv /telechargements/dictionnaire.md; do
  if [ "$(code "$page")" = 200 ]; then ok "200 $page"; else ko "$page ne répond pas 200"; fi
done
if [ "$(code /page-absente)" = 404 ]; then ok "404 pour une page absente"; else ko "pas de 404"; fi
if [ "$(code /jt)" = 301 ]; then ok "301 /jt (page retirée en V2)"; else ko "/jt n'est pas redirigée"; fi
if [ "$(code /proprietaires)" = 301 ]; then ok "301 /proprietaires (vue de la carte en V2)"; else ko "/proprietaires n'est pas redirigée"; fi

# Aperçu d'un lien partagé (E2-04) et lien permanent vers cette adresse (EF-M7-01).
fiche=$(curl -s "$URL/media/le-monde/")
printf '%s' "$fiche" | grep -q 'property="og:title" content="Le Monde' && ok "Open Graph : titre" \
  || ko "Open Graph : titre absent"
printf '%s' "$fiche" | grep -q "property=\"og:url\" content=\"$URL/media/le-monde\"" \
  && ok "Open Graph : adresse = $URL" || ko "og:url ne pointe pas vers $URL (config/params.yaml ?)"
curl -s "$URL/data/graph.json" | grep -q "\"adresse_site\":\"$URL\"" \
  && ok "graph.json : adresse_site = $URL" || ko "graph.json : adresse_site différente de $URL"

duree=$(curl -s -o /dev/null -w '%{time_total}' "$URL/data/graph.json")
if awk "BEGIN { exit !($duree < 3) }"; then ok "graph.json servi en ${duree} s (< 3 s)"; else ko "graph.json en ${duree} s"; fi

if [ "$echecs" -gt 0 ]; then
  echo "$echecs vérification(s) en échec" >&2
  exit 1
fi
echo "Toutes les vérifications sont passées."
