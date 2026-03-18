const BACKEND_BASE_URL = process.env.BACKEND_API_BASE_URL ?? "http://localhost:7071";

type RouteContext = {
  params: Promise<{
    instanceId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { instanceId } = await context.params;

  try {
    const payload = await request.json();
    const upstream = await fetch(`${BACKEND_BASE_URL}/api/orchestrations/${instanceId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const bodyText = await upstream.text();
    return new Response(bodyText, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected proxy error";
    return Response.json({ error: message }, { status: 500 });
  }
}
