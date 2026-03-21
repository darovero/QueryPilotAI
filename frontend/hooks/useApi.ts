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
                ...loginRequest,
                account: account
            });
        } catch (e) {
            console.warn("Intento de token silencioso falló, solicitando token interactivo...");
            tokenResponse = await instance.acquireTokenPopup(loginRequest);
        }

        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string>),
            "Authorization": `Bearer ${tokenResponse.accessToken}`
        };

        return fetch(url, { ...options, headers });
    };

    const userId = accounts[0]?.localAccountId || accounts[0]?.homeAccountId || "";

    return { fetchWithAuth, userId, account: accounts[0] };
}
