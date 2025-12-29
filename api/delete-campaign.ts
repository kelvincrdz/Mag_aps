import { supabase } from "../lib/supabase";

export const config = {
  runtime: "edge",
};

function slug(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-");
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "DELETE") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const body = await req.json();
    const campaignName: string = body.campaignName;

    console.log("[delete-campaign] Deleting:", campaignName);

    if (!campaignName) {
      console.error("[delete-campaign] No campaign name provided");
      return new Response(
        JSON.stringify({ error: "Campaign name is required" }),
        {
          status: 400,
        }
      );
    }

    const safeCampaign = slug(campaignName);
    const campaignPath = `campaigns/${safeCampaign}`;

    console.log("[delete-campaign] Path:", campaignPath);

    // List all files in the campaign folder
    const { data: files, error: listError } = await supabase.storage
      .from("mag-files")
      .list(campaignPath, {
        limit: 1000,
      });

    if (listError) {
      console.error("[delete-campaign] Error listing files:", listError);
      throw new Error(`Failed to list campaign files: ${listError.message}`);
    }

    console.log(
      "[delete-campaign] Found",
      files?.length || 0,
      "items to delete"
    );

    // Delete all files in the campaign folder
    if (files && files.length > 0) {
      const filePaths = files.map(
        (file: any) => `${campaignPath}/${file.name}`
      );

      const { error: deleteError } = await supabase.storage
        .from("mag-files")
        .remove(filePaths);

      if (deleteError) {
        console.error("[delete-campaign] Error deleting files:", deleteError);
        throw new Error(`Failed to delete files: ${deleteError.message}`);
      }

      console.log(
        "[delete-campaign] Successfully deleted",
        files.length,
        "files"
      );
    }

    // Also try to list and delete any subdirectories
    const { data: subfolders } = await supabase.storage
      .from("mag-files")
      .list(campaignPath, {
        limit: 1000,
      });

    if (subfolders && subfolders.length > 0) {
      for (const folder of subfolders) {
        const folderPath = `${campaignPath}/${folder.name}`;
        const { data: subFiles } = await supabase.storage
          .from("mag-files")
          .list(folderPath, {
            limit: 1000,
          });

        if (subFiles && subFiles.length > 0) {
          const subFilePaths = subFiles.map(
            (file: any) => `${folderPath}/${file.name}`
          );
          await supabase.storage.from("mag-files").remove(subFilePaths);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("Delete campaign error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to delete campaign";
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
