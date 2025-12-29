// Deprecated: use api/upload with put()
export const config = { runtime: "edge" };

export default async function handler(): Promise<Response> {
  return new Response(JSON.stringify({ error: "Deprecated endpoint" }), {
    status: 410,
    headers: { "content-type": "application/json" },
  });
}
