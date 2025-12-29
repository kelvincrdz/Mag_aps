import { supabase } from "../lib/supabase";

export const config = {
  runtime: "edge",
};

interface User {
  id: string;
  name: string;
  role: "admin" | "player";
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    console.log("[list-users] Request received");

    const usersPath = "users.json";

    const {
      data: { publicUrl },
    } = supabase.storage.from("mag-files").getPublicUrl(usersPath);

    try {
      const resp = await fetch(publicUrl);
      if (resp.ok) {
        const users: User[] = await resp.json();
        console.log("[list-users] Found", users.length, "users");
        return new Response(JSON.stringify({ users }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } else {
        console.log("[list-users] No users file found, returning empty list");
        return new Response(JSON.stringify({ users: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    } catch (e) {
      console.log("[list-users] Error fetching users file:", e);
      return new Response(JSON.stringify({ users: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
  } catch (err) {
    console.error("List users error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to list users";
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
