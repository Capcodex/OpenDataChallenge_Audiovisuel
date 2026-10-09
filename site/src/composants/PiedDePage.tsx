import type { Graphe } from "../graph/types";
import { fr } from "../i18n/fr";

/** EF-M6-05 : sources, licences et date de traitement, toujours visibles. */
export function PiedDePage({ meta }: { meta: Graphe["meta"] }) {
  const date = new Date(`${meta.date_traitement}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <footer class="pied">
      <span>
        {fr.pied.sources} :{" "}
        {meta.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && " · "}
            <a href={s.url} rel="noopener noreferrer">
              {s.producer}, {s.name}
            </a>{" "}
            ({s.license})
          </span>
        ))}
      </span>
      <span>
        {fr.pied.traitement(date)}. {fr.pied.licence}
      </span>
    </footer>
  );
}
