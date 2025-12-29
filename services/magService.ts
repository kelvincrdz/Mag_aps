
import JSZip from 'jszip';
import { MagPackage, AudioTrack, DocumentFile } from '../types';

export const processMagFile = async (file: File): Promise<MagPackage> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  
  const tracks: AudioTrack[] = [];
  const documents: DocumentFile[] = [];
  
  const filePromises: Promise<void>[] = [];

  loadedZip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;

    const lowerName = zipEntry.name.toLowerCase();
    const parts = relativePath.split('/');
    const name = parts.pop() || relativePath;
    
    // Heuristic for metadata from path: Campaign/Folder/File
    let campaign = 'Imported';
    let folder = 'Geral';
    
    if (parts.length >= 2) {
      campaign = parts[0];
      folder = parts[parts.length - 1];
    } else if (parts.length === 1) {
      folder = parts[0];
    }
    
    // Check for audio files
    if (/\.(mp3|wav|ogg|m4a|aac|flac|oga)$/.test(lowerName)) {
      const promise = zipEntry.async('blob').then((blob) => {
        const url = URL.createObjectURL(blob);
        tracks.push({
          id: relativePath,
          name,
          url,
          content: url,
          blob,
          type: 'audio',
          campaign,
          folder,
          allowedUserIds: []
        });
      });
      filePromises.push(promise);
    }
    
    // Check for markdown files
    if (/\.(md|markdown)$/.test(lowerName)) {
      const promise = zipEntry.async('string').then((content) => {
        documents.push({
          id: relativePath,
          name,
          content,
          type: 'document',
          campaign,
          folder,
          allowedUserIds: []
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