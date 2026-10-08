import { fr } from "./i18n/fr";

// Squelette : la carte (Sigma.js) arrive au sprint 5. Tous les textes viennent de i18n/fr.ts.
export function App() {
  return (
    <main class="squelette">
      <h1>{fr.titrePage}</h1>
      <p>{fr.bandeau}</p>
      <p>{fr.etats.chargement}</p>
    </main>
  );
}
