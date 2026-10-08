// Requêtes d'exemple sur la base graphe d'analyse (EF-M8-02, CdC technique § 10.4).
// Charger la base : `make neo4j`, puis ouvrir http://localhost:7474 (utilisateur neo4j).
// Chaque requête commence par un titre en commentaire et finit par un point-virgule :
// `python -m pipeline export-neo4j --verifier` les exécute toutes et échoue si l'une est vide.
// Rappel : un lien relie des PUBLICS (personnes qui suivent les deux médias), pas des lignes
// éditoriales.

// Les 10 médias dont le public est le plus proche de celui de France Inter
MATCH (m:Media {id: 'france-inter'})-[l:CO_AUDIENCE]-(v:Media)
RETURN v.nom AS media, round(l.lift, 2) AS lift, l.n_communs AS repondants_communs
ORDER BY l.lift DESC
LIMIT 10;

// Médias d'un même propriétaire ultime et lift moyen entre eux
MATCH (p:Proprietaire)<-[:DETENU_PAR]-(m:Media)
WITH p, collect(m) AS medias
WHERE size(medias) >= 2
UNWIND medias AS a
UNWIND medias AS b
WITH p, medias, a, b
WHERE a.id < b.id
OPTIONAL MATCH (a)-[l:CO_AUDIENCE]-(b)
RETURN p.nom AS proprietaire, size(medias) AS nb_medias,
       [m IN medias | m.nom] AS medias_detenus,
       round(avg(l.lift), 2) AS lift_moyen_entre_eux
ORDER BY nb_medias DESC;

// Médias « ponts » entre familles
MATCH (m:Media {pont: true})-[r:MEMBRE_DE]->(f:Famille)
RETURN m.nom AS media, f.nom AS famille, round(r.stabilite, 2) AS stabilite
ORDER BY m.nom;

// Plus court chemin de liens tracés entre deux médias
MATCH (a:Media {id: 'cnews'}), (b:Media {id: 'mediapart'})
MATCH chemin = shortestPath((a)-[:CO_AUDIENCE*..6]-(b))
WHERE all(l IN relationships(chemin) WHERE l.affiche)
RETURN [m IN nodes(chemin) | m.nom] AS chemin, length(chemin) AS etapes;

// Composition des familles, du média le plus suivi au moins suivi
MATCH (m:Media)-[:MEMBRE_DE]->(f:Famille)
WITH f, m ORDER BY m.n_repondants DESC
WITH f.id AS numero, f.nom AS famille, f.taille AS taille, collect(m.nom)[..8] AS principaux
RETURN famille, taille, principaux AS principaux_medias
ORDER BY numero;

// Groupes qui possèdent plusieurs médias du baromètre
MATCH (m:Media)-[:APPARTIENT_A]->(g:Groupe)
WITH g, collect(m.nom) AS medias
WHERE size(medias) >= 2
RETURN g.nom AS groupe, size(medias) AS nb_medias, medias
ORDER BY nb_medias DESC;
