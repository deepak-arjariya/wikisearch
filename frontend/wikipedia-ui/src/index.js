import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { CssBaseline } from "@mui/material";
import { Auth0Provider } from "@auth0/auth0-react";

// Replace these values with your Auth0 Domain and Client ID
const domain = "dev-vvk6ffsi4ip5unr2.us.auth0.com"; // e.g., dev-12345.us.auth0.com
const clientId = "lCHqmMCTaJcws0m5hlCxeh9A66hNw23Z"; // e.g., your-client-id

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {/* Auth0Provider wraps the entire app to provide auth context */}
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{ redirect_uri: 'https://5e1a-183-83-52-94.ngrok-free.app' }} // Redirect URI after login
    >
      <CssBaseline />
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
