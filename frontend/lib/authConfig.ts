import { Configuration, LogLevel } from '@azure/msal-browser';

export type AuthRuntimeConfig = {
    clientId: string;
    authority: string;
    redirectUri: string;
    postLogoutRedirectUri: string;
};

function normalizeUri(value: string | undefined, origin: string): string {
    const trimmed = value?.trim();

    if (!trimmed) {
        return origin;
    }

    if (trimmed.startsWith('/')) {
        return new URL(trimmed, origin).toString();
    }

    return trimmed;
}

function ensureValidAuthority(authority: string): string {
    const trimmed = authority.trim().replace(/\/$/, '');

    if (!trimmed || trimmed.includes('tenant.ciamlogin.com/tenant-id')) {
        throw new Error('La autoridad de Azure AD no es valida. Configure NEXT_PUBLIC_AZURE_AD_AUTHORITY con el tenant real.');
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'https:') {
            throw new Error('Authority must use HTTPS.');
        }
    }
    catch {
        throw new Error('La autoridad de Azure AD no tiene un formato valido.');
    }

    return trimmed;
}

export function resolveAuthRuntimeConfig(config: Partial<AuthRuntimeConfig>): AuthRuntimeConfig {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const clientId = config.clientId?.trim();

    if (!clientId || clientId === 'client-id-placeholder') {
        throw new Error('El cliente de Azure AD no esta configurado.');
    }

    const redirectUri = normalizeUri(config.redirectUri, origin);
    const postLogoutRedirectUri = normalizeUri(config.postLogoutRedirectUri ?? config.redirectUri, origin);

    return {
        clientId,
        authority: ensureValidAuthority(config.authority ?? ''),
        redirectUri,
        postLogoutRedirectUri
    };
}

export function createMsalConfig(config: AuthRuntimeConfig): Configuration {
    return {
        auth: {
            clientId: config.clientId,
            authority: config.authority,
            redirectUri: config.redirectUri,
            postLogoutRedirectUri: config.postLogoutRedirectUri
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
}

export const loginRequest = {
    scopes: ['openid', 'profile', 'offline_access'],
    prompt: 'select_account'
};
