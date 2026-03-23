import { useMsal } from "@azure/msal-react";
import { logger } from "../lib/logger";

export function useApi() {
    const { instance, accounts } = useMsal();

    const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
        const account = accounts[0];
        if (!account) {
            logger.error("No active account — user not authenticated");
            throw new Error("No hay una cuenta activa. El usuario no está autenticado.");
        }

        let tokenResponse;
        try {
            tokenResponse = await instance.acquireTokenSilent({
                scopes: ['openid', 'profile', 'offline_access'],
                account: account
            });
        } catch (e) {
            logger.warn("Silent token failed, requesting interactive token", {
                error: e instanceof Error ? e.message : String(e),
            });
            tokenResponse = await instance.acquireTokenPopup({
                scopes: ['openid', 'profile', 'offline_access'],
            });
        }

        const token = tokenResponse.idToken;
        if (!token) {
            throw new Error("No se pudo obtener un token de identidad válido.");
        }

        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string>),
            "Authorization": `Bearer ${token}`
        };

        const method = options.method?.toUpperCase() ?? 'GET';
        const start = performance.now();
        const response = await fetch(url, { ...options, headers });
        const ms = Math.round(performance.now() - start);

        const endpoint = url.replace(/^https?:\/\/[^/]+/, '');
        logger.info(`API ${method} ${endpoint}`, {
            status: response.status,
            durationMs: ms,
            ok: response.ok,
        });

        return response;
    };

    const userId = accounts[0]?.localAccountId || accounts[0]?.homeAccountId || "";

    return { fetchWithAuth, userId, account: accounts[0] };
}

