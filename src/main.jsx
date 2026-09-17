import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import WizardApp from "./wizard/WizardApp.jsx";

const Root = window.location.pathname.startsWith("/wizard") ? WizardApp : App;

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
