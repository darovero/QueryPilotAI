import { useState, useEffect } from "react";
import { Connection } from "../types";
import { toast } from "sonner";
import { useMsal } from "@azure/msal-react";

const sanitizeConnectionsForStorage = (items: Connection[]) =>
  items.map(({ password: _password, ...connection }) => connection);

export function useConnections(
  userId: string | undefined, 
  fetchWithAuth: (url: string, options?: any) => Promise<Response>,
  addLog: (level: any, msg: string) => void,
  setCurrentView: (view: string) => void
) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [connForm, setConnForm] = useState<Partial<Connection>>({ 
    name: "My Postgres Database", host: "db.mypostgres.com", port: "5432", 
    database: "analytics_db", username: "postgres_admin", password: "", type: "PostgreSQL" 
  });
  const [connError, setConnError] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const { instance } = useMsal();

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConns = localStorage.getItem('qp_connections');
      if (savedConns) try { setConnections(sanitizeConnectionsForStorage(JSON.parse(savedConns))); } catch {}
    }
  }, []);

  // Save to localStorage
  useEffect(() => { 
    localStorage.setItem('qp_connections', JSON.stringify(sanitizeConnectionsForStorage(connections))); 
  }, [connections]);

  const handleMsalLogin = async () => {
    try {
      const loginResponse = await instance.loginPopup({
        scopes: ["https://database.windows.net//user_impersonation"]
      });
      if (loginResponse && loginResponse.accessToken) {
        setConnForm(prev => ({ 
          ...prev, 
          username: loginResponse.account?.username || 'Azure AD User',
          password: loginResponse.accessToken,
          authType: 'AzureADToken'
        }));
        addLog("INFO", "Microsoft Entra ID token acquired via MSAL.");
      }
    } catch (err: any) {
      console.error(err);
      setConnError("Microsoft login failed: " + err.message);
    }
  };

  const handleSaveConnection = async () => {
    if (!connForm.name?.trim()) {
        setConnError("Connection name is required.");
        return;
    }
    
    if (editingConnId && connections.some(c => c.id !== editingConnId && c.name.toLowerCase() === connForm.name!.trim().toLowerCase())) {
        setConnError("A connection with this name already exists.");
        return;
    }
    
    if (!editingConnId && connections.some(c => c.name.toLowerCase() === connForm.name!.trim().toLowerCase())) {
        setConnError("A connection with this name already exists.");
        return;
    }

    setConnError("");
    setIsTestingConnection(true);
    setTestSuccess(false);

    try {
        // ── Step 1: Test the connection against the REAL external database ──
        let testRes: Response;
        try {
            testRes = await fetchWithAuth("/api/connections/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editingConnId || connForm.id,
                    dbType: connForm.type || "Azure SQL",
                    host: connForm.host,
                    port: connForm.port,
                    databaseName: connForm.database,
                    username: connForm.username,
                    encryptedPassword: connForm.password,
                    authType: connForm.authType
                })
            });
        } catch (fetchErr: any) {
            throw new Error("Network error: Could not reach the backend. Is the server running?");
        }

        // ── Step 2: Parse the response and BLOCK if not successful ──
        let testBody: any = {};
        try {
            const rawText = await testRes.text();
            testBody = rawText ? JSON.parse(rawText) : {};
        } catch { /* body might not be JSON */ }

        if (!testRes.ok || testBody.success === false) {
            const errorMsg = testBody.error || `Connection test failed (HTTP ${testRes.status}).`;
            throw new Error(errorMsg);
        }

        // ── Step 3: Show success indicator briefly ──
        setTestSuccess(true);
        await new Promise(resolve => setTimeout(resolve, 1200));
        setTestSuccess(false);

        // ── Step 4: ONLY NOW persist the connection ──
        const connId = editingConnId || crypto.randomUUID();
        const connToSave = { ...connForm, id: connId, name: connForm.name!.trim() } as Connection;

        if (editingConnId) {
            setConnections(prev => prev.map(c => c.id === editingConnId ? { ...c, ...connToSave } : c));
        } else {
            setConnections(prev => [...prev, connToSave]);
        }

        // Persist to backend (fire-and-forget is OK here; localStorage is the source of truth for now)
        try {
            await fetchWithAuth('/api/connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: connId,
                    userId: userId,
                    connectionName: connToSave.name,
                    dbType: connToSave.type || "Azure SQL",
                    host: connToSave.host,
                    port: connToSave.port,
                    databaseName: connToSave.database,
                    username: connToSave.username,
                    encryptedPassword: connToSave.password,
                    authType: connToSave.authType
                })
            });
        } catch { /* backend save is best-effort */ }

        setConnError("");
        setCurrentView('manage_connections');
        toast.success(`Connection "${connToSave.name}" saved successfully.`);
    } catch (e: any) {
        setConnError(e.message);
        toast.error(e.message);
    } finally {
        setIsTestingConnection(false);
        setTestSuccess(false);
    }
  };

  return {
    connections,
    setConnections,
    editingConnId,
    setEditingConnId,
    connForm,
    setConnForm,
    connError,
    setConnError,
    isTestingConnection,
    testSuccess,
    handleMsalLogin,
    handleSaveConnection
  };
}
