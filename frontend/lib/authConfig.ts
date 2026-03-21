import { Configuration, LogLevel } from '@azure/msal-browser';

// Configuración de MSAL para Azure Entra ID External (CIAM)
// Reemplazar estas variables de entorno en .env.local
export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || 'client-id-placeholder',
        authority: process.env.NEXT_PUBLIC_AZURE_AD_AUTHORITY || 'https://tenant.ciamlogin.com/tenant-id/v2.0',
        redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || '/',
        postLogoutRedirectUri: process.env.NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI || '/'
    },
    cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                }
            }
        }
    }
};

export const loginRequest = {
    scopes: ['openid', 'profile', 'offline_access']
};
