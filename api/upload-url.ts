import { generateUploadURL } from "@vercel/blob";

export const config = { runtime: "edge" };

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
    const body = await req.json();
    const campaign: string = body.campaign;
    const folder: string = body.folder || "Arquivos";
    const filename: string = body.filename;
    const allowedContentTypes: string[] = body.allowedContentTypes || [
      "audio/mpeg",
      "audio/wav",
      "text/markdown",
    ];

    if (!campaign || !filename) {
      return new Response(
        JSON.stringify({ error: "Missing campaign or filename" }),
        { status: 400 }
      );
    }

    const safeCampaign = slugify(campaign);
    const safeFolder = slugify(folder);
    const safeName = slugify(filename);
    const ts = Date.now();
    const pathname = `campaigns/${safeCampaign}/${safeFolder}/${ts}-${safeName}`;

    const { url } = await generateUploadURL({
      pathname,
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowedContentTypes,
    });

    return new Response(
      JSON.stringify({ uploadUrl: url, blobPath: pathname }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to create upload URL" }),
      { status: 500 }
    );
  }
}
