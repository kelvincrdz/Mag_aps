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
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const body = await req.json();
    const users: User[] = body.users;

    console.log("[save-users] Saving", users?.length, "users");

    if (!users || !Array.isArray(users)) {
      console.error("[save-users] Invalid users payload");
      return new Response(JSON.stringify({ error: "Invalid users payload" }), {
        status: 400,
      });
    }

    const usersPath = "users.json";

    // Write users to Supabase Storage
    const usersBlob = new Blob([JSON.stringify(users, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabase.storage
      .from("mag-files")
      .upload(usersPath, usersBlob, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to save users: ${error.message}`);
    }

    console.log("[save-users] Users saved successfully");

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("Save users error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to save users";
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
