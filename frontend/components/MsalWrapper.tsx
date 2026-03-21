"use client";

import { PublicClientApplication, Configuration } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { ReactNode } from "react";

const msalConfig: Configuration = {
  auth: {
    clientId: "439a8182-8c80-49ce-8dc7-703af41c724c",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "http://localhost:3000",
  },
  cache: {
    cacheLocation: "sessionStorage", 
    storeAuthStateInCookie: false,
  }
};

const pca = new PublicClientApplication(msalConfig);

export function MsalWrapper({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={pca}>
      {children}
    </MsalProvider>
  );
}
