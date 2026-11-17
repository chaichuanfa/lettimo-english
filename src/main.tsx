import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "../css/style.css";
import "../css/words.css";
import "./react.css";
createRoot(document.getElementById("app")!).render(<App />);
