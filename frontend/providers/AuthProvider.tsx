'use client';

import { ReactNode, useEffect, useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { AuthRuntimeConfig, createMsalConfig, loginRequest, resolveAuthRuntimeConfig } from '../lib/authConfig';

type AuthProviderProps = {
    children: ReactNode;
    config: Partial<AuthRuntimeConfig>;
};

type LegalDocumentKey = 'privacy' | 'terms';

const legalDocuments: Record<LegalDocumentKey, { title: string; paragraphs: string[] }> = {
    privacy: {
        title: 'Politica de Privacidad',
        paragraphs: [
            'InsightForge AI procesa unicamente la informacion necesaria para autenticarte, habilitar tu sesion corporativa y proteger el acceso a las capacidades analiticas del sistema.',
            'Los datos de identidad y telemetria operativa se utilizan para auditoria, trazabilidad, seguridad y soporte. No se comparten con terceros fuera de los servicios autorizados por tu organizacion.',
            'Puedes solicitar la revision o eliminacion de tus datos conforme a las politicas internas de gobierno y cumplimiento aplicables a tu tenant corporativo.'
        ]
    },
    terms: {
        title: 'Terminos del Servicio',
        paragraphs: [
            'El acceso a InsightForge AI esta restringido a usuarios autorizados por la organizacion. Todo uso queda sujeto a monitoreo, controles de seguridad y registro de actividad.',
            'No debes cargar informacion sin autorizacion, intentar eludir controles de seguridad ni utilizar la plataforma para consultas o acciones fuera de las politicas corporativas.',
            'El servicio puede limitar o revocar el acceso cuando se detecten riesgos operativos, incumplimientos de seguridad o actividades incompatibles con el uso empresarial previsto.'
        ]
    }
};

export function AuthProvider({ children, config }: AuthProviderProps) {
    const [isMsalInitialized, setIsMsalInitialized] = useState(false);
    const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);
    const [configurationError, setConfigurationError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const initializeMsal = async () => {
            try {
                const runtimeConfig = resolveAuthRuntimeConfig(config);
                const instance = new PublicClientApplication(createMsalConfig(runtimeConfig));

                await instance.initialize();
                await instance.handleRedirectPromise();

                if (!cancelled) {
                    setMsalInstance(instance);
                    setConfigurationError(null);
                }
            }
            catch (error) {
                if (!cancelled) {
                    const message = error instanceof Error ? error.message : 'No fue posible inicializar la autenticacion.';
                    setConfigurationError(message);
                }
            }
            finally {
                if (!cancelled) {
                    setIsMsalInitialized(true);
                }
            }
        };

        initializeMsal();

        return () => {
            cancelled = true;
        };
    }, [config.authority, config.clientId, config.postLogoutRedirectUri, config.redirectUri]);

    if (!isMsalInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
                Verificando autenticación...
            </div>
        );
    }

    if (!msalInstance) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
                <div className="max-w-xl w-full rounded-3xl border border-rose-200 bg-white p-8 shadow-xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">Autenticacion</p>
                    <h1 className="mt-3 text-2xl font-bold text-zinc-900">La configuracion de acceso no es valida</h1>
                    <p className="mt-4 text-sm leading-6 text-zinc-600">{configurationError ?? 'No fue posible cargar la configuracion de Microsoft Entra ID.'}</p>
                    <p className="mt-4 text-sm leading-6 text-zinc-600">Verifica la autoridad publicada en el frontend y vuelve a desplegar el sitio con los valores correctos.</p>
                </div>
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
    const [activeDocument, setActiveDocument] = useState<LegalDocumentKey | null>(null);

    if (!isAuthenticated) {
        const legalDocument = activeDocument ? legalDocuments[activeDocument] : null;

        return (
            <div className="relative min-h-screen flex items-center justify-center bg-zinc-50 overflow-hidden font-sans selection:bg-zinc-900 selection:text-white">
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
                        Bienvenido a InsightForge AI
                    </h1>
                    <p className="text-zinc-500 text-[15px] mb-10 text-center">
                        Ingresa con tu cuenta corporativa para acceder al espacio analitico seguro de tu organizacion.
                    </p>

                    <div className="w-full space-y-3">
                        <button 
                            onClick={() => {
                                void instance.loginRedirect(loginRequest);
                            }}
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
                        Al iniciar sesion aceptas nuestra{' '}
                        <button type="button" onClick={() => setActiveDocument('privacy')} className="underline hover:text-zinc-600 transition-colors">
                            Politica de Privacidad
                        </button>{' '}
                        y los{' '}
                        <button type="button" onClick={() => setActiveDocument('terms')} className="underline hover:text-zinc-600 transition-colors">
                            Terminos del Servicio
                        </button>
                    </div>
                </div>

                {legalDocument ? (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/45 px-4">
                        <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-7 shadow-2xl">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Informacion legal</p>
                                    <h2 className="mt-2 text-2xl font-bold text-zinc-900">{legalDocument.title}</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveDocument(null)}
                                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                                >
                                    Cerrar
                                </button>
                            </div>

                            <div className="mt-6 space-y-4 text-sm leading-6 text-zinc-600">
                                {legalDocument.paragraphs.map((paragraph) => (
                                    <p key={paragraph}>{paragraph}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}
                
            </div>
        );
    }

    return children;
}

