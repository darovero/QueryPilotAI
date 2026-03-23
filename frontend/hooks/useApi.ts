import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../lib/authConfig";

export function useApi() {
    const { instance, accounts } = useMsal();

    const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
        const account = accounts[0];
        if (!account) {
            throw new Error("No hay una cuenta activa. El usuario no está autenticado.");
        }

        let tokenResponse;
        try {
            tokenResponse = await instance.acquireTokenSilent({
                scopes: ['openid', 'profile', 'offline_access'],
                account: account
            });
        } catch (e) {
            console.warn("Intento de token silencioso falló, solicitando token interactivo...");
            tokenResponse = await instance.acquireTokenPopup({
                scopes: ['openid', 'profile', 'offline_access'],
            });
        }

        // Use idToken (a proper JWT with oid/sub claims) instead of accessToken
        // (which is opaque when only requesting openid/profile scopes)
        const token = tokenResponse.idToken || tokenResponse.accessToken;
        console.log('[fetchWithAuth] Token type used:', tokenResponse.idToken ? 'idToken' : 'accessToken', 'Token starts with:', token?.substring(0, 20));

        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string>),
            "Authorization": `Bearer ${token}`
        };

        return fetch(url, { ...options, headers });
    };

    const userId = accounts[0]?.localAccountId || accounts[0]?.homeAccountId || "";

    return { fetchWithAuth, userId, account: accounts[0] };
}
