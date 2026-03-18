const BACKEND_BASE_URL = process.env.BACKEND_API_BASE_URL ?? "http://localhost:7071";

export async function GET() {
  try {
    const upstream = await fetch(`${BACKEND_BASE_URL}/api/history`, {
      method: "GET",
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
