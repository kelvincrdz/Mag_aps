import JSZip from "jszip";
import {
  MagPackage,
  AudioTrack,
  DocumentFile,
  GameFile,
  WhiteboardData,
  WhiteboardPresence,
  UserPresence,
} from "../types";
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
  try {
    const slug = (input: string) =>
      input
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "")
        .replace(/-+/g, "-");

    const path = `metadata/${slug(record.campaign)}/${record.id}.json`;

    const metadataBlob = new Blob([JSON.stringify(record, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabase.storage
      .from("mag-files")
      .upload(path, metadataBlob, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      throw new Error(`Erro ao salvar metadados: ${error.message}`);
    }
  } catch (error) {
    console.error("Erro ao salvar metadados:", error);
    throw new Error(
      `Falha ao salvar metadados: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export const listAllFiles = async (): Promise<GameFile[]> => {
  try {
    const allFiles: GameFile[] = [];

    // Tentar carregar de metadata/ (novo formato)
    const { data: metadataFolders, error: metaError } = await supabase.storage
      .from("mag-files")
      .list("metadata", {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });

    if (!metaError && metadataFolders && metadataFolders.length > 0) {
      console.log("Carregando de metadata/");
      for (const folder of metadataFolders) {
        if (!folder.name) continue;

        const { data: metadataFiles } = await supabase.storage
          .from("mag-files")
          .list(`metadata/${folder.name}`, { limit: 1000 });

        for (const file of metadataFiles || []) {
          if (!file.name.endsWith(".json")) continue;

          try {
            const { data: publicUrlData } = supabase.storage
              .from("mag-files")
              .getPublicUrl(`metadata/${folder.name}/${file.name}`);

            const resp = await fetch(publicUrlData.publicUrl);
            if (!resp.ok) continue;

            const record = await resp.json();
            allFiles.push({
              id: record.id,
              name: record.name,
              type: record.type,
              campaign: record.campaign,
              folder: record.folder,
              content: record.url,
              allowedUserIds: record.allowedUserIds || [],
            });
          } catch (err) {
            console.error(`Erro ao processar ${file.name}:`, err);
          }
        }
      }
    }

    // Também carregar de campaigns/ (formato antigo - compatibilidade)
    const { data: campaignFolders, error: campError } = await supabase.storage
      .from("mag-files")
      .list("campaigns", {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });

    if (!campError && campaignFolders && campaignFolders.length > 0) {
      console.log("Carregando de campaigns/");
      for (const campaignFolder of campaignFolders) {
        if (!campaignFolder.name) continue;

        const campaignName = campaignFolder.name
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        // Tentar buscar metadados para obter allowedUserIds
        let campaignAllowedUserIds: string[] = [];
        try {
          const { data: metadataFiles } = await supabase.storage
            .from("mag-files")
            .list(`metadata/${campaignFolder.name}`, { limit: 1 });

          if (metadataFiles && metadataFiles.length > 0) {
            const { data: publicUrlData } = supabase.storage
              .from("mag-files")
              .getPublicUrl(
                `metadata/${campaignFolder.name}/${metadataFiles[0].name}`
              );

            const resp = await fetch(publicUrlData.publicUrl);
            if (resp.ok) {
              const metadata = await resp.json();
              campaignAllowedUserIds = metadata.allowedUserIds || [];
            }
          }
        } catch (err) {
          console.log("Sem metadados, permitindo acesso a todos");
        }

        // Listar subpastas dentro da campanha
        const { data: subfolders } = await supabase.storage
          .from("mag-files")
          .list(`campaigns/${campaignFolder.name}`, { limit: 1000 });

        for (const subfolder of subfolders || []) {
          if (!subfolder.name) continue;

          const folderName = subfolder.name
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

          // Listar arquivos dentro da subpasta
          const { data: files } = await supabase.storage
            .from("mag-files")
            .list(`campaigns/${campaignFolder.name}/${subfolder.name}`, {
              limit: 1000,
            });

          for (const file of files || []) {
            if (!file.name) continue;

            const { data: publicUrlData } = supabase.storage
              .from("mag-files")
              .getPublicUrl(
                `campaigns/${campaignFolder.name}/${subfolder.name}/${file.name}`
              );

            const fileType: "audio" | "video" | "document" = file.name.endsWith(
              ".mp3"
            )
              ? "audio"
              : file.name.endsWith(".mp4")
              ? "video"
              : "document";

            allFiles.push({
              id: `${campaignFolder.name}-${subfolder.name}-${file.name}`,
              name: file.name,
              type: fileType,
              campaign: campaignName,
              folder: folderName,
              content: publicUrlData.publicUrl,
              allowedUserIds:
                campaignAllowedUserIds.length > 0
                  ? campaignAllowedUserIds
                  : ["*"], // '*' = todos
            });
          }
        }
      }
    }

    console.log(`Total de arquivos carregados: ${allFiles.length}`);
    return allFiles;
  } catch (error) {
    console.error("Erro ao listar arquivos:", error);
    return [];
  }
};

// --- User Management ---
import { User } from "../types";

export const saveUsers = async (users: User[]): Promise<void> => {
  try {
    const usersBlob = new Blob([JSON.stringify(users, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabase.storage
      .from("mag-files")
      .upload("users.json", usersBlob, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      throw new Error(`Erro ao salvar usuários: ${error.message}`);
    }
  } catch (error) {
    console.error("Erro ao salvar usuários:", error);
    throw new Error(
      `Falha ao salvar usuários: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export const listUsers = async (): Promise<User[]> => {
  try {
    const { data: publicUrlData } = supabase.storage
      .from("mag-files")
      .getPublicUrl("users.json");

    const resp = await fetch(publicUrlData.publicUrl);
    if (!resp.ok) {
      console.log("Arquivo users.json não encontrado, retornando lista vazia");
      return [];
    }

    const users = await resp.json();
    return users || [];
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return [];
  }
};

// --- Campaign Management ---
export const deleteCampaignFiles = async (
  campaignName: string
): Promise<void> => {
  try {
    const slug = (input: string) =>
      input
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "")
        .replace(/-+/g, "-");

    const safeCampaign = slug(campaignName);

    // Deletar arquivos da campanha
    const { data: campaignFiles, error: listError } = await supabase.storage
      .from("mag-files")
      .list(`campaigns/${safeCampaign}`, {
        limit: 1000,
      });

    if (listError) {
      console.error("Erro ao listar arquivos da campanha:", listError);
    }

    if (campaignFiles && campaignFiles.length > 0) {
      const filesToDelete = campaignFiles.map(
        (file) => `campaigns/${safeCampaign}/${file.name}`
      );

      const { error: deleteError } = await supabase.storage
        .from("mag-files")
        .remove(filesToDelete);

      if (deleteError) {
        console.error("Erro ao deletar arquivos:", deleteError);
      }
    }

    // Deletar metadados
    const { data: metadataFiles, error: metaListError } = await supabase.storage
      .from("mag-files")
      .list(`metadata/${safeCampaign}`, {
        limit: 1000,
      });

    if (metaListError) {
      console.error("Erro ao listar metadados:", metaListError);
    }

    if (metadataFiles && metadataFiles.length > 0) {
      const metaToDelete = metadataFiles.map(
        (file) => `metadata/${safeCampaign}/${file.name}`
      );

      const { error: deleteMetaError } = await supabase.storage
        .from("mag-files")
        .remove(metaToDelete);

      if (deleteMetaError) {
        console.error("Erro ao deletar metadados:", deleteMetaError);
      }
    }

    // Deletar whiteboard da campanha
    const whiteboardPath = `whiteboards/${safeCampaign}.json`;
    const { error: whiteboardError } = await supabase.storage
      .from("mag-files")
      .remove([whiteboardPath]);

    if (whiteboardError) {
      console.error("Erro ao deletar whiteboard:", whiteboardError);
    }
  } catch (error) {
    console.error("Erro ao deletar campanha:", error);
    throw new Error(
      `Falha ao deletar campanha: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

// --- Whiteboard Management ---
export const saveWhiteboard = async (
  whiteboardData: WhiteboardData
): Promise<void> => {
  try {
    const slug = (input: string) =>
      input
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "")
        .replace(/-+/g, "-");

    const safeCampaign = slug(whiteboardData.campaign);
    const path = `whiteboards/${safeCampaign}.json`;

    console.log("[saveWhiteboard] Salvando em:", path);
    console.log("[saveWhiteboard] Elementos:", whiteboardData.elements.length);

    const whiteboardBlob = new Blob([JSON.stringify(whiteboardData, null, 2)], {
      type: "application/json",
    });

    const { data, error } = await supabase.storage
      .from("mag-files")
      .upload(path, whiteboardBlob, {
        contentType: "application/json",
        upsert: true,
      });

    if (error) {
      console.error("[saveWhiteboard] Erro ao salvar:", error);
      throw new Error(`Erro ao salvar quadro branco: ${error.message}`);
    }

    console.log("[saveWhiteboard] Salvo com sucesso:", data);
  } catch (error) {
    console.error("[saveWhiteboard] Exceção:", error);
    throw new Error(
      `Falha ao salvar quadro branco: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export const loadWhiteboard = async (
  campaign: string
): Promise<WhiteboardData | null> => {
  try {
    const slug = (input: string) =>
      input
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "")
        .replace(/-+/g, "-");

    const safeCampaign = slug(campaign);
    const path = `whiteboards/${safeCampaign}.json`;

    const { data: publicUrlData } = supabase.storage
      .from("mag-files")
      .getPublicUrl(path);

    const resp = await fetch(publicUrlData.publicUrl);
    if (!resp.ok) {
      // Arquivo não existe ainda
      return null;
    }

    const data = await resp.json();
    return {
      campaign: data.campaign,
      elements: data.elements || [],
    };
  } catch (error) {
    console.error("Erro ao carregar whiteboard:", error);
    return null;
  }
};

// --- Presence Management ---
export const updatePresence = async (
  campaign: string,
  userId: string,
  userName: string,
  cursorX: number,
  cursorY: number,
  editingElementId?: string,
  color?: string
): Promise<void> => {
  try {
    const slug = (input: string) =>
      input
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "")
        .replace(/-+/g, "-");

    const safeCampaign = slug(campaign);
    const path = `whiteboards/presence/${safeCampaign}.json`;

    // Carregar presença atual
    let currentPresence: WhiteboardPresence = {
      campaign,
      users: [],
    };

    try {
      const { data: publicUrlData } = supabase.storage
        .from("mag-files")
        .getPublicUrl(path);

      const resp = await fetch(publicUrlData.publicUrl);
      if (resp.ok) {
        currentPresence = await resp.json();
      }
    } catch {
      // Arquivo não existe ainda
    }

    // Remover usuários inativos (mais de 10 segundos)
    const now = Date.now();
    currentPresence.users = currentPresence.users.filter(
      (u) => now - u.lastSeen < 10000
    );

    // Atualizar ou adicionar este usuário
    const existingIndex = currentPresence.users.findIndex(
      (u) => u.userId === userId
    );

    const userPresence: UserPresence = {
      userId,
      userName,
      cursorX,
      cursorY,
      editingElementId,
      lastSeen: now,
      color: color || generateUserColor(userId),
    };

    if (existingIndex >= 0) {
      currentPresence.users[existingIndex] = userPresence;
    } else {
      currentPresence.users.push(userPresence);
    }

    // Salvar
    const presenceBlob = new Blob([JSON.stringify(currentPresence, null, 2)], {
      type: "application/json",
    });

    await supabase.storage.from("mag-files").upload(path, presenceBlob, {
      contentType: "application/json",
      upsert: true,
    });
  } catch (error) {
    console.error("Erro ao atualizar presença:", error);
  }
};

export const loadPresence = async (
  campaign: string
): Promise<WhiteboardPresence | null> => {
  try {
    const slug = (input: string) =>
      input
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "")
        .replace(/-+/g, "-");

    const safeCampaign = slug(campaign);
    const path = `whiteboards/presence/${safeCampaign}.json`;

    const { data: publicUrlData } = supabase.storage
      .from("mag-files")
      .getPublicUrl(path);

    const resp = await fetch(publicUrlData.publicUrl);
    if (!resp.ok) {
      return null;
    }

    const data = await resp.json();

    // Filtrar usuários inativos
    const now = Date.now();
    data.users = (data.users || []).filter(
      (u: UserPresence) => now - u.lastSeen < 10000
    );

    return data;
  } catch (error) {
    console.error("Erro ao carregar presença:", error);
    return null;
  }
};

// Gerar cor única baseada no userId
const generateUserColor = (userId: string): string => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
    "#F8B739",
    "#52B788",
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};
