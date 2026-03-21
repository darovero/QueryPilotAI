import os, sys, glob

def patch_unified_chat():
    p = r"c:\Users\Jessy\Documents\GitHub\QueryPilotAI\frontend\components\UnifiedChat.tsx"
    with open(p, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = content.replace('"user@agent.com"', 'userId')
    new_content = new_content.replace("'user@agent.com'", 'userId')

    if "hooks/useApi" not in content:
        new_content = new_content.replace('import { useMsal } from "@azure/msal-react";', 'import { useMsal } from "@azure/msal-react";\nimport { useApi } from "@/hooks/useApi";')
        new_content = new_content.replace('const { instance } = useMsal();', 'const { instance } = useMsal();\n  const { fetchWithAuth, userId, account } = useApi();')
        
    new_content = new_content.replace('fetch("/api', 'fetchWithAuth("/api')

    if new_content != content:
        with open(p, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Patched UnifiedChat.tsx")

def patch_apis():
    api_dir = r"c:\Users\Jessy\Documents\GitHub\QueryPilotAI\frontend\app\api\*\route.ts"
    for path in glob.glob(api_dir):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        
        if "Authorization" not in content:
            new_c = content.replace("export async function POST(request: NextRequest) {", "export async function POST(request: NextRequest) {\n  const authHeader = request.headers.get('Authorization');")
            new_c = new_c.replace('headers: { "Content-Type": "application/json" }', 'headers: { "Content-Type": "application/json", ...(authHeader ? { "Authorization": authHeader } : {}) }')
            
            new_c = new_c.replace('export async function GET(request: NextRequest, {\n  params\n}: { params: { id: string } }) {', 'export async function GET(request: NextRequest, { params }: { params: { id: string } }) {\n  const authHeader = request.headers.get("Authorization");')
            new_c = new_c.replace('export async function GET(request: NextRequest) {', 'export async function GET(request: NextRequest) {\n  const authHeader = request.headers.get("Authorization");')
            new_c = new_c.replace('headers: {}', 'headers: { ...(authHeader ? { "Authorization": authHeader } : {}) }')
            
            if new_c != content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_c)
                print(f"Patched {path}")

patch_unified_chat()
patch_apis()
