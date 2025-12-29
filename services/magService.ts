import JSZip from "jszip";
import { MagPackage, AudioTrack, DocumentFile, GameFile } from "../types";

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
  type: "audio" | "document";
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
  const fd = new FormData();
  fd.set("campaign", campaign);
  fd.set("folder", folder);
  fd.set("filename", filename);
  fd.set("contentType", contentType);
  fd.set("file", fileOrBlob);
  const resp = await fetch("/api/upload", { method: "POST", body: fd });
  if (!resp.ok) throw new Error("Falha ao enviar arquivo");
  return resp.json();
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
