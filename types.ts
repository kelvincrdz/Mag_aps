export type FileType = "audio" | "document" | "video";

export interface User {
  id: string;
  name: string;
  role: "admin" | "player";
}

export interface GameFile {
  id: string;
  name: string;
  type: FileType;
  campaign: string;
  folder: string; // e.g., "Depoimentos", "Arquivos"
  content: string; // URL for audio, Text for Markdown
  blob?: Blob; // Keep blob for audio mainly
  allowedUserIds: string[];
}

export interface AudioTrack extends GameFile {
  type: "audio";
  url: string; // Alias for content
}

export interface VideoFile extends GameFile {
  type: "video";
  url: string;
}

export interface DocumentFile extends GameFile {
  type: "document";
}

export interface MagPackage {
  tracks: AudioTrack[];
  documents: DocumentFile[];
}

export enum AppState {
  LOGIN,
  CAMPAIGN_SELECT,
  PLAYER,
  BROWSER,
  ADMIN,
}

// Default initial users
export const INITIAL_USERS: User[] = [
  { id: "admin-01", name: "Mestre (Admin)", role: "admin" },
  { id: "player-01", name: "Jogador 1", role: "player" },
  { id: "player-02", name: "Jogador 2", role: "player" },
];
