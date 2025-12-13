export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  blob: Blob;
  type: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  content: string; // Markdown content
}

export interface MagPackage {
  tracks: AudioTrack[];
  documents: DocumentFile[];
}

export enum AppState {
  LOGIN,
  PLAYER,
  BROWSER
}

export const ACCESS_CODE = "ORC/DDAE-11.25";
