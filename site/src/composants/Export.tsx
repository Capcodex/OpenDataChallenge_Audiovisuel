/**
 * Fenêtre « Exporter l'image » (E6-01, EF-M7-03, T-075, maquette « Export »). L'aperçu est l'image
 * exportée elle-même. Le cartouche de source est toujours inclus (case cochée et désactivée).
 * Les médias exportés sont ceux de la vue courante : filtres de type et de famille appliqués.
 */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { visible } from "../etat/magasin";
import { imagePng, imageSvg, TAILLES, telecharger } from "../export/image-svg";
import type { Graphe } from "../graph/types";
import { fr } from "../i18n/fr";

type Format = "png" | "svg";

export function BoutonExport({
  donnees: g,
  misEnAvant = null,
  titre,
}: {
  donnees: Graphe;
  misEnAvant?: ReadonlySet<string> | null;
  titre?: string;
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [format, setFormat] = useState<Format>("png");
  const [taille, setTaille] = useState(0);
  const [noms, setNoms] = useState(true);
  const [liens, setLiens] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const t = fr.export;

  const svg = useMemo(
    () =>
      ouvert
        ? imageSvg(g, g.nodes.filter(visible), {
            ...TAILLES[taille],
            noms,
            liens,
            misEnAvant,
            titre,
          })
        : "",
    [g, ouvert, taille, noms, liens, misEnAvant, titre],
  );
  const [apercu, setApercu] = useState<string | null>(null);
  useEffect(() => {
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [svg]);

  const ouvrirDialogue = () => {
    setOuvert(true);
    setErreur(null);
    dialogue.current?.showModal();
  };
  const fermerDialogue = () => dialogue.current?.close();

  const exporter = async () => {
    const nom = `graphe-medias-${g.meta.edition}.${format}`;
    try {
      if (format === "svg") telecharger(new Blob([svg], { type: "image/svg+xml" }), nom);
      else {
        const { largeur, hauteur } = TAILLES[taille];
        telecharger(await imagePng(svg, largeur, hauteur), nom);
      }
      fermerDialogue();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <button type="button" class="bouton" onClick={ouvrirDialogue}>
        {fr.actions.exporterImage}
      </button>
      <dialog
        ref={dialogue}
        class="export"
        aria-labelledby="export-titre"
        onClose={() => setOuvert(false)}
      >
        <div class="export__apercu">
          <span class="panneau__type">{t.apercu}</span>
          {apercu && <img src={apercu} alt={t.apercu} />}
          <p class="panneau__discret">{t.cartoucheObligatoire}</p>
        </div>
        <form
          class="export__options"
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            void exporter();
          }}
        >
          <div class="export__titre">
            <h2 id="export-titre">{t.titre}</h2>
            <button
              type="button"
              class="fiche__fermer"
              aria-label={fr.actions.fermer}
              onClick={fermerDialogue}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <fieldset>
            <legend>{t.format}</legend>
            {(["png", "svg"] as Format[]).map((f) => (
              <label key={f} class="export__choix">
                <input
                  type="radio"
                  name="format"
                  checked={format === f}
                  onChange={() => setFormat(f)}
                />
                {f === "png" ? t.png : t.svg}
                <span class="panneau__discret"> · {f === "png" ? t.pngUsage : t.svgUsage}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>{t.taille}</legend>
            <label for="export-taille" class="visuellement-masque">
              {t.taille}
            </label>
            <select
              id="export-taille"
              class="champ"
              value={taille}
              onChange={(e) => setTaille(Number(e.currentTarget.value))}
            >
              {TAILLES.map((x, i) => (
                <option key={x.libelle} value={i}>
                  {x.libelle}
                </option>
              ))}
            </select>
          </fieldset>
          <fieldset>
            <legend>{t.contenu}</legend>
            <label class="export__case">
              <input type="checkbox" checked={noms} onChange={() => setNoms(!noms)} />
              {t.noms}
            </label>
            <label class="export__case">
              <input type="checkbox" checked={liens} onChange={() => setLiens(!liens)} />
              {t.liens}
            </label>
            <label class="export__case export__case--obligatoire">
              <input type="checkbox" checked disabled />
              {t.cartouche}
            </label>
          </fieldset>
          {erreur && (
            <p class="message-alerte" role="alert">
              {erreur}
            </p>
          )}
          <div class="export__boutons">
            <button type="button" class="bouton" onClick={fermerDialogue}>
              {fr.actions.annuler}
            </button>
            <button type="submit" class="bouton bouton--principal">
              {t.telecharger(format.toUpperCase())}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
