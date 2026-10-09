/**
 * Copie de la mention de source (E3-03, EF-M7-02, RG-24, CdC technique § 9.5) : API presse-papiers,
 * avec repli sur une zone de texte sélectionnée si la copie est refusée ou indisponible.
 */
import { useEffect, useRef, useState } from "preact/hooks";

import { fr } from "../i18n/fr";

type Etat = "pret" | "copie" | "repli";

export function CopierMention({ mention }: { mention: string }) {
  const [etat, setEtat] = useState<Etat>("pret");
  const zone = useRef<HTMLTextAreaElement>(null);

  // Nouvelle fiche, nouvelle mention : le bouton revient à son état initial.
  useEffect(() => setEtat("pret"), [mention]);

  useEffect(() => {
    if (etat === "repli") zone.current?.select();
  }, [etat]);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(mention);
      setEtat("copie");
    } catch {
      setEtat("repli");
    }
  };

  return (
    <>
      <button type="button" class="bouton bouton--principal" onClick={copier}>
        {etat === "copie" ? fr.actions.mentionCopiee : fr.actions.copierMention}
      </button>
      <p class="visuellement-masque" role="status" aria-live="polite">
        {etat === "copie" ? fr.actions.mentionCopiee : ""}
      </p>
      {etat === "repli" && (
        <>
          <p class="fiche__aide">{fr.fiche.copieImpossible}</p>
          <textarea
            ref={zone}
            class="fiche__mention"
            readOnly
            rows={4}
            aria-label={fr.actions.copierMention}
            value={mention}
          />
        </>
      )}
    </>
  );
}
