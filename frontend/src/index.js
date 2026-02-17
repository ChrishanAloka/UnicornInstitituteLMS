// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// import { AuthProvider } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/auth-context";
import { PWAProvider } from "./context/PWAContext";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PWAProvider>
          <App />
        </PWAProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();