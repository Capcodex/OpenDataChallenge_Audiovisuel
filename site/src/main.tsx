import { render } from "preact";

import "./styles/base.css";
import { App } from "./App";

const racine = document.getElementById("app");
if (racine) render(<App />, racine);
