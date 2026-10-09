import { fr } from "../i18n/fr";

/** RG-21 : rappel permanent de ce que mesure la carte. */
export function Bandeau({ edition }: { edition: string }) {
  return (
    <div class="bandeau" role="note">
      <span class="bandeau__edition">{fr.edition(edition)}</span>
      <p class="bandeau__texte">{fr.bandeau}</p>
    </div>
  );
}
