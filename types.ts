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
  WHITEBOARD,
}

export interface WhiteboardElement {
  id: string;
  type: "path" | "text" | "shape" | "image" | "video" | "pdf";
  data: any;
  color: string;
  timestamp: number;
  x?: number; // Posição X do objeto
  y?: number; // Posição Y do objeto
  width?: number; // Largura do objeto
  height?: number; // Altura do objeto
  rotation?: number; // Rotação em graus
  lockedBy?: string; // ID do usuário editando
  lockedAt?: number; // Timestamp do lock
}

export interface WhiteboardData {
  campaign: string;
  elements: WhiteboardElement[];
}

export interface UserPresence {
  userId: string;
  userName: string;
  cursorX: number;
  cursorY: number;
  editingElementId?: string;
  lastSeen: number;
  color: string; // Cor única para cada usuário
}

export interface WhiteboardPresence {
  campaign: string;
  users: UserPresence[];
}

// Default initial users
export const INITIAL_USERS: User[] = [
  { id: "admin-01", name: "Mestre (Admin)", role: "admin" },
  { id: "player-01", name: "Jogador 1", role: "player" },
  { id: "player-02", name: "Jogador 2", role: "player" },
];
