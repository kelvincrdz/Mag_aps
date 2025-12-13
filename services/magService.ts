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
    
    // Check for audio files
    if (/\.(mp3|wav|ogg|m4a|aac|flac|oga)$/.test(lowerName)) {
      const promise = zipEntry.async('blob').then((blob) => {
        const url = URL.createObjectURL(blob);
        // Simple heuristic to clean up filename
        const name = relativePath.split('/').pop() || relativePath;
        tracks.push({
          id: relativePath,
          name,
          url,
          blob,
          type: 'audio'
        });
      });
      filePromises.push(promise);
    }
    
    // Check for markdown files
    if (/\.(md|markdown)$/.test(lowerName)) {
      const promise = zipEntry.async('string').then((content) => {
        const name = relativePath.split('/').pop() || relativePath;
        documents.push({
          id: relativePath,
          name,
          content
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
