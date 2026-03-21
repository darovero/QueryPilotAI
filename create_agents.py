from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
import sys

project_connection_string = "eastus.api.azureml.ms;3b7c5634-e239-4029-af7f-0cf8e8aeb29c;rg-insightforge-dev;insightforge-ai-project"
try:
    client = AIProjectClient.from_connection_string(
        credential=DefaultAzureCredential(),
        conn_str=project_connection_string
    )
    
    print(f"Project Endpoint: {client.agents._client._base_url}")
    
    def create_agent(name, instructions):
        agent = client.agents.create_agent(
            model="gpt41mini-std",
            name=name,
            instructions=instructions
        )
        return agent.id
        
    sql_planner = create_agent(
        "SQL Planner Agent", 
        "Eres InsightForge SQL Planner, un agente especializado en ingeniería analítica. Transforma preguntas precisas de negocio en consultas SQL seguras y correctas."
    )
    print(f"FoundryAgent__SqlPlannerAgentId={sql_planner}")
    
    res_inter = create_agent(
        "Result Interpreter Agent", 
        "Eres InsightForge Result Interpreter, un agente analítico. Interpretas los resultados de una consulta SQL de prevención de fraude y los explicas en lenguaje claro."
    )
    print(f"FoundryAgent__ResultInterpreterAgentId={res_inter}")
    
    concierge = create_agent(
        "Concierge Agent", 
        "Eres el Conserje. Si un mensaje es simple saludo, responde naturalmente con texto. Si requiere análisis de datos, responde con JSON { \"category\": \"analytical\" }."
    )
    print(f"FoundryAgent__ConciergeAgentId={concierge}")
    
    # Save the settings to local.settings.json directly? 
    # Or just print it so we can update it via multi_replace_file_content.
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
