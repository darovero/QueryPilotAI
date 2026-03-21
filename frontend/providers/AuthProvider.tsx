'use client';

import { ReactNode, useEffect, useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { msalConfig, loginRequest } from '../lib/authConfig';

const msalInstance = new PublicClientApplication(msalConfig);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isMsalInitialized, setIsMsalInitialized] = useState(false);

    useEffect(() => {
        const initializeMsal = async () => {
            await msalInstance.initialize();
            await msalInstance.handleRedirectPromise();
            setIsMsalInitialized(true);
        };
        initializeMsal();
    }, []);

    if (!isMsalInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
                Verificando autenticación...
            </div>
        );
    }

    return (
        <MsalProvider instance={msalInstance}>
            <RequireAuth>{children}</RequireAuth>
        </MsalProvider>
    );
}

function RequireAuth({ children }: { children: ReactNode }) {
    const { instance } = useMsal();
    const isAuthenticated = useIsAuthenticated();

        if (!isAuthenticated) {
        return (
            <div className="relative min-h-screen flex items-center justify-center bg-zinc-50 overflow-hidden font-sans selection:bg-zinc-900 selection:text-white">
                {/* Dotted Background Mosaico */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-60"
                    style={{
                        backgroundImage: 'radial-gradient(circle at center, #e4e4e7 1.5px, transparent 1.5px)',
                        backgroundSize: '24px 24px'
                    }}
                ></div>

                <div className="relative z-10 bg-white border border-zinc-200 p-10 pt-12 pb-8 rounded-3xl shadow-xl flex flex-col items-center max-w-[420px] w-full mx-4">
                    
                    <div className="w-16 h-16 mb-6 rounded-2xl overflow-hidden bg-zinc-900 flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-white text-[32px]">auto_awesome</span>
                    </div>
                    
                    <h1 className="text-2xl font-bold text-zinc-900 mb-2 tracking-tight">
                        Welcome to InsightForge AI
                    </h1>
                    <p className="text-zinc-500 text-[15px] mb-10 text-center">
                        Login securely to access your enterprise analytics workspace.
                    </p>

                    <div className="w-full space-y-3">
                        <button 
                            onClick={() => instance.loginRedirect(loginRequest)}
                            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 text-[15px] font-medium py-3.5 px-4 rounded-2xl transition-all shadow-sm group"
                        >
                            <svg className="w-[18px] h-[18px]" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#f25022" d="M1 1h9v9H1z"/>
                                <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                                <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                                <path fill="#ffb900" d="M11 11h9v9h-9z"/>
                            </svg>
                            <span className="group-hover:text-zinc-900 transition-colors">Continue with Microsoft</span>
                        </button>
                    </div>
                    
                    <div className="mt-14 text-[12px] text-zinc-400 text-center">
                        By logging in you agree to our <a href="#" className="underline hover:text-zinc-600 transition-colors">Privacy Policy</a> and <a href="#" className="underline hover:text-zinc-600 transition-colors">Terms of Service</a>
                    </div>
                </div>
                
            </div>
        );
    }

    return children;
}

