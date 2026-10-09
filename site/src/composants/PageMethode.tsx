/**
 * Page « Méthode » (E3-04, EF-M6-04, maquette « Méthode ») : sommaire et texte de docs/methode.md,
 * converti au build. Le HTML vient du dépôt (aucune saisie d'utilisateur) : il est inséré tel quel.
 */
import methode from "virtual:methode";

import { fr } from "../i18n/fr";

export function PageMethode() {
  return (
    <main class="page-texte">
      <nav class="sommaire" aria-label={fr.methode.sommaire}>
        <span class="sommaire__titre">{fr.methode.surCettePage}</span>
        <ul>
          {methode.sommaire.map(({ id, titre }) => (
            <li key={id}>
              <a href={`#${id}`}>{titre}</a>
            </li>
          ))}
        </ul>
      </nav>
      <article class="methode" dangerouslySetInnerHTML={{ __html: methode.html }} />
    </main>
  );
}
