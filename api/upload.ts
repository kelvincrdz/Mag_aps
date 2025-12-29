import { supabase } from "../lib/supabase";

export const config = {
  runtime: "edge",
};

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
    const campaign = String(form.get("campaign") || "default");
    const folder = String(form.get("folder") || "Arquivos");
    const filename = String(form.get("filename") || "file");
    const contentType = String(
      form.get("contentType") || "application/octet-stream"
    );
    const fileBlob = form.get("file");

    console.log("[upload] Received:", {
      campaign,
      folder,
      filename,
      size: fileBlob instanceof Blob ? fileBlob.size : 0,
    });

    if (!(fileBlob instanceof Blob)) {
      console.error("[upload] No file blob");
      return new Response(JSON.stringify({ error: "Missing file blob" }), {
        status: 400,
      });
    }

    const safeCampaign = slugify(campaign);
    const safeFolder = slugify(folder);
    const safeName = slugify(filename);
    const ts = Date.now();
    const pathname = `campaigns/${safeCampaign}/${safeFolder}/${ts}-${safeName}`;

    console.log("[upload] Uploading to:", pathname);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("mag-files")
      .upload(pathname, fileBlob, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("[upload] Supabase error:", error);
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    console.log("[upload] Success:", data);

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("mag-files").getPublicUrl(pathname);

    return new Response(
      JSON.stringify({ url: publicUrl, pathname: pathname }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Upload error:", err);
    const errorMessage = err instanceof Error ? err.message : "Upload failed";
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export { handler as POST };
