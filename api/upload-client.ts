import { supabase } from "../lib/supabase";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-");
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const pathname = String(form.get("pathname") || "");

    if (!(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400,
      });
    }

    // Expect path format campaigns/<campaign>/<folder>/<file>
    const parts = pathname.split("/");
    let campaign = "Imported";
    let folder = "Arquivos";
    if (parts.length >= 4 && parts[0] === "campaigns") {
      campaign = parts[1];
      folder = parts[2];
    }

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("mag-files")
      .upload(pathname, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("mag-files").getPublicUrl(pathname);

    // Create file record
    const record = {
      id: pathname,
      name: pathname.split("/").pop() || pathname,
      type: file.type?.startsWith("audio")
        ? ("audio" as const)
        : ("document" as const),
      campaign,
      folder,
      url: publicUrl,
      allowedUserIds: [],
    };

    // Merge into index.json for campaign
    const indexPath = `campaigns/${slugify(campaign)}/index.json`;
    let current: any[] = [];

    // Try to read existing index
    const {
      data: { publicUrl: indexUrl },
    } = supabase.storage.from("mag-files").getPublicUrl(indexPath);

    try {
      const resp = await fetch(indexUrl);
      if (resp.ok) current = await resp.json();
    } catch (e) {
      // Index doesn't exist yet
    }

    const idx = current.findIndex((r) => r.id === record.id);
    if (idx >= 0) current[idx] = record;
    else current.push(record);

    // Save updated index
    const indexBlob = new Blob([JSON.stringify(current, null, 2)], {
      type: "application/json",
    });

    await supabase.storage.from("mag-files").upload(indexPath, indexBlob, {
      contentType: "application/json",
      upsert: true,
    });

    return new Response(JSON.stringify({ url: publicUrl, pathname }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Client upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(error) }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }
}

export { handler as POST };
