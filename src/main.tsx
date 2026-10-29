import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { UpdatePrompt } from "./components/UpdatePrompt";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <UpdatePrompt />
  </>,
);
