import { render } from "preact";

import "./styles/base.css";
import { App } from "./App";

const racine = document.getElementById("app");
if (racine) {
  // Le résumé pré-généré (lisible sans JavaScript, scripts/pages-statiques.ts) laisse la place à
  // l'application.
  racine.replaceChildren();
  render(<App />, racine);
}
