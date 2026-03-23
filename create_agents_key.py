from azure.core.credentials import AzureKeyCredential
from azure.ai.projects import AIProjectClient
import sys

api_key = "2014DrxI4S9tJHnIXg1hR5FWaKLsxvNnsSQQJCoCH6QY2PfwHgtVJQQJ99CCACYeBjFXJ3w3AAABACOGddis"
project_connection_string = "eastus.api.azureml.ms;3b7c5634-e239-4029-af7f-0cf8e8aeb29c;rg-insightforge-dev;insightforge-ai-project"

try:
    print("Conectando con API Key...")
    client = AIProjectClient.from_connection_string(
        credential=AzureKeyCredential(api_key),
        conn_str=project_connection_string
    )
    
    print("Creando agentes...")
    
    def create_agent(name, instructions):
        agent = client.agents.create_agent(
            model="gpt41mini-std",
            name=name,
            instructions=instructions
        )
        return agent.id
        
    sql_planner = create_agent(
        "SQL Planner Agent", 
        "Eres InsightForge SQL Planner, un agente especializado en ingeniería analítica. Transforma preguntas en consultas SQL seguras."
    )
    print(f"FoundryAgent__SqlPlannerAgentId={sql_planner}")
    
    res_inter = create_agent(
        "Result Interpreter Agent", 
        "Eres InsightForge Result Interpreter. Interpretas los resultados de una consulta SQL de fraude y los explicas en lenguaje claro."
    )
    print(f"FoundryAgent__ResultInterpreterAgentId={res_inter}")
    
    concierge = create_agent(
        "Concierge Agent", 
        "Eres el Conserje. Si un mensaje es simple saludo, responde naturalmente con texto. Si requiere análisis, responde con JSON { \"category\": \"analytical\" }."
    )
    print(f"FoundryAgent__ConciergeAgentId={concierge}")
    
except Exception as e:
    print(f"Error fatal: {e}")
    sys.exit(1)
