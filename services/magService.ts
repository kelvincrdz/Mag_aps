import JSZip from "jszip";
import { MagPackage, AudioTrack, DocumentFile, GameFile } from "../types";
import { supabase } from "../lib/supabase";

export const processMagFile = async (file: File): Promise<MagPackage> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  const tracks: AudioTrack[] = [];
  const documents: DocumentFile[] = [];

  const filePromises: Promise<void>[] = [];

  loadedZip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;

    const lowerName = zipEntry.name.toLowerCase();
    const parts = relativePath.split("/");
    const name = parts.pop() || relativePath;

    // Heuristic for metadata from path: Campaign/Folder/File
    let campaign = "Imported";
    let folder = "Geral";

    if (parts.length >= 2) {
      campaign = parts[0];
      folder = parts[parts.length - 1];
    } else if (parts.length === 1) {
      folder = parts[0];
    }

    // Check for audio files
    if (/\.(mp3|wav|ogg|m4a|aac|flac|oga)$/.test(lowerName)) {
      const promise = zipEntry.async("blob").then((blob) => {
        const url = URL.createObjectURL(blob);
        tracks.push({
          id: relativePath,
          name,
          url,
          content: url,
          blob,
          type: "audio",
          campaign,
          folder,
          allowedUserIds: [],
        });
      });
      filePromises.push(promise);
    }

    // Check for markdown files
    if (/\.(md|markdown)$/.test(lowerName)) {
      const promise = zipEntry.async("string").then((content) => {
        documents.push({
          id: relativePath,
          name,
          content,
          type: "document",
          campaign,
          folder,
          allowedUserIds: [],
        });
      });
      filePromises.push(promise);
    }
  });

  await Promise.all(filePromises);

  // Sort tracks alphabetically
  tracks.sort((a, b) => a.name.localeCompare(b.name));
  documents.sort((a, b) => a.name.localeCompare(b.name));

  return { tracks, documents };
};

// --- Vercel Blob Integration ---
interface SaveFilePayloadRecord {
  id: string;
  name: string;
  type: "audio" | "document" | "video";
  campaign: string;
  folder: string;
  url: string;
  allowedUserIds: string[];
}

export const uploadViaApi = async (
  campaign: string,
  folder: string,
  filename: string,
  fileOrBlob: File | Blob,
  contentType: string
): Promise<{ url: string }> => {
  try {
    // Upload direto para Supabase (evita limite de 4MB do Vercel Edge)
    const slugify = (s: string) =>
      s
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "")
        .replace(/-+/g, "-");

    const safeCampaign = slugify(campaign);
    const safeFolder = slugify(folder);
    const safeName = slugify(filename);
    const ts = Date.now();
    const pathname = `campaigns/${safeCampaign}/${safeFolder}/${ts}-${safeName}`;

    console.log("Uploading directly to Supabase:", {
      campaign,
      folder,
      filename,
      contentType,
      size: fileOrBlob.size,
      pathname,
    });

    // Upload direto para o Supabase Storage
    const { data, error } = await supabase.storage
      .from("mag-files")
      .upload(pathname, fileOrBlob, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(`Erro no upload: ${error.message}`);
    }

    console.log("Upload successful:", data);

    // Obter URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from("mag-files").getPublicUrl(pathname);

    return { url: publicUrl };
  } catch (error) {
    console.error("Upload error in service:", error);
    throw new Error(
      `Falha ao enviar arquivo: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export const saveFileMetadata = async (
  record: SaveFilePayloadRecord
): Promise<void> => {
  const resp = await fetch("/api/save-file", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ record }),
  });
  if (!resp.ok) throw new Error("Falha ao salvar metadados");
};

export const listAllFiles = async (): Promise<GameFile[]> => {
  const resp = await fetch("/api/list-files");
  if (!resp.ok) throw new Error("Falha ao listar arquivos");
  const data = await resp.json();
  const files: GameFile[] = (data.files || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    campaign: r.campaign,
    folder: r.folder,
    content: r.url,
    allowedUserIds: r.allowedUserIds || [],
  }));
  return files;
};
