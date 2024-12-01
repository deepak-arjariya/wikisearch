import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { CssBaseline } from "@mui/material";
import { Auth0Provider } from "@auth0/auth0-react";

// Replace these values with your Auth0 Domain and Client ID

const domain = process.env.REACT_APP_AUTH_DOMAIN
const clientId = process.env.REACT_APP_AUTH_CLIENT_ID
const redirectUri = process.env.REACT_APP_AUTH_REDIRECT_URI

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {/* Auth0Provider wraps the entire app to provide auth context */}
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{ redirect_uri: redirectUri }} // Redirect URI after login
    >
      <CssBaseline />
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
