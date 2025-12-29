
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { User, GameFile, FileType } from '../types';
import { Upload, Users, FileAudio, FileText, Check, X, Shield, Plus, Loader2 } from 'lucide-react';

interface AdminPanelProps {
  users: User[];
  files: GameFile[];
  onAddUser: (name: string) => void;
  onUploadFile: (file: GameFile) => void;
  onUpdatePermissions: (fileId: string, userIds: string[]) => void;
  onExit: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  users, 
  files, 
  onAddUser, 
  onUploadFile, 
  onUpdatePermissions,
  onExit
}) => {
  // --- Local State for Forms ---
  const [newUserName, setNewUserName] = useState('');
  
  // Upload Form
  const [campaignName, setCampaignName] = useState('MAG 01');
  const [folderName, setFolderName] = useState('Arquivos'); // Acts as "Type"
  const [isUploading, setIsUploading] = useState(false);

  // --- Handlers ---

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      onAddUser(newUserName);
      setNewUserName('');
    }
  };

  const handleUploadSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;

    if (!fileInput.files || fileInput.files.length === 0) {
      alert("Selecione um arquivo.");
      return;
    }

    const file = fileInput.files[0];
    setIsUploading(true);

    try {
      // Determine Type for frontend logic
      let fileType: FileType = 'document';
      if (file.name.endsWith('.mp3')) fileType = 'audio';
      else if (file.name.endsWith('.md')) fileType = 'document';
      else {
        alert('Apenas arquivos .md ou .mp3 são permitidos.');
        setIsUploading(false);
        return;
      }

      // Call Vercel Serverless Function
      const response = await fetch(
        `/api/files/upload?filename=${encodeURIComponent(file.name)}&campaign=${encodeURIComponent(campaignName)}&type=${encodeURIComponent(folderName)}`,
        {
          method: 'POST',
          body: file,
        }
      );

      if (!response.ok) {
        throw new Error('Falha no upload para Vercel Blob');
      }

      const blobResult = await response.json();

      // Create local representation (Simulating DB record returned from API)
      const newFile: GameFile = {
        id: blobResult.url, // Using URL as ID since it's unique from Blob
        name: file.name,
        type: fileType,
        campaign: campaignName,
        folder: folderName,
        content: blobResult.url, // Vercel Blob Public URL
        allowedUserIds: [] // Default: no access
      };

      onUploadFile(newFile);
      
      // Reset Form
      form.reset();
      
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao enviar arquivo para o servidor.");
    } finally {
      setIsUploading(false);
    }
  };

  const togglePermission = (fileId: string, userId: string, currentAllowed: string[]) => {
    const newAllowed = currentAllowed.includes(userId)
      ? currentAllowed.filter(id => id !== userId)
      : [...currentAllowed, userId];
    
    onUpdatePermissions(fileId, newAllowed);
  };

  // Only show players, not admins, in permission lists
  const playerUsers = users.filter(u => u.role !== 'admin');

  return (
    <div className="h-full flex flex-col bg-mag-dark/95 text-mag-text p-6 overflow-hidden custom-scrollbar">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-mag-light/30 pb-4">
        <div className="flex items-center gap-3">
            <Shield className="text-mag-accent w-8 h-8" />
            <div>
                <h1 className="text-2xl font-serif text-white">Painel do Mestre</h1>
                <p className="text-xs text-mag-cyan uppercase tracking-wider">Vercel Blob & Permissions</p>
            </div>
        </div>
        <button onClick={onExit} className="px-4 py-2 border border-mag-light/50 rounded hover:bg-mag-light/20">
            Sair do Admin
        </button>
      </div>

      <div className="flex-1 flex gap-8 min-h-0 overflow-hidden">
        
        {/* Left Column: Management */}
        <div className="w-1/3 flex flex-col gap-8 overflow-y-auto custom-scrollbar pr-2">
            
            {/* User Creation */}
            <div className="bg-mag-panel/50 p-6 rounded-lg border border-white/5">
                <h3 className="text-lg font-serif text-mag-cyan mb-4 flex items-center gap-2">
                    <Users size={18} /> Novo Usuário
                </h3>
                <form onSubmit={handleCreateUser} className="flex gap-2">
                    <input 
                        type="text" 
                        value={newUserName}
                        onChange={e => setNewUserName(e.target.value)}
                        placeholder="Nome do Jogador..."
                        className="flex-1 bg-black/30 border border-mag-light/30 rounded px-3 py-2 focus:border-mag-accent outline-none"
                    />
                    <button type="submit" className="bg-mag-light/20 p-2 rounded hover:bg-mag-cyan hover:text-mag-dark">
                        <Plus size={20} />
                    </button>
                </form>
                <div className="mt-4 flex flex-wrap gap-2">
                    {playerUsers.map(u => (
                        <span key={u.id} className="text-xs bg-black/50 px-2 py-1 rounded border border-white/10 text-mag-text/70">
                            {u.name}
                        </span>
                    ))}
                </div>
            </div>

            {/* Upload Form */}
            <div className="bg-mag-panel/50 p-6 rounded-lg border border-white/5">
                <h3 className="text-lg font-serif text-mag-cyan mb-4 flex items-center gap-2">
                    <Upload size={18} /> Upload Remoto
                </h3>
                
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs uppercase tracking-wider text-mag-text/60 block mb-1">Campanha</label>
                        <select 
                            value={campaignName}
                            onChange={e => setCampaignName(e.target.value)}
                            className="w-full bg-black/30 border border-mag-light/30 rounded px-3 py-2 text-white"
                        >
                          <option value="MAG 01">MAG 01</option>
                          <option value="REV 02">REV 02</option>
                          <option value="EXTRAS">EXTRAS</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs uppercase tracking-wider text-mag-text/60 block mb-1">Tipo / Pasta</label>
                        <select 
                            value={folderName}
                            onChange={e => setFolderName(e.target.value)}
                            className="w-full bg-black/30 border border-mag-light/30 rounded px-3 py-2 text-white"
                        >
                          <option value="Arquivos">Arquivos</option>
                          <option value="Depoimentos">Depoimentos</option>
                          <option value="Pistas">Pistas</option>
                        </select>
                    </div>

                    <div className="pt-2">
                         <input 
                            name="file" 
                            type="file" 
                            accept=".md,.mp3" 
                            className="w-full text-sm text-mag-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-mag-light/20 file:text-mag-cyan hover:file:bg-mag-light/40 cursor-pointer"
                            disabled={isUploading}
                          />
                    </div>

                    <button 
                      type="submit" 
                      disabled={isUploading}
                      className="w-full py-3 bg-mag-accent hover:bg-red-700 text-white font-bold rounded flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                      {isUploading ? "Enviando para Vercel Blob..." : "Enviar Arquivo"}
                    </button>
                </form>
            </div>
        </div>

        {/* Right Column: Permission Management */}
        <div className="flex-1 bg-mag-panel/30 rounded-lg border border-white/5 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <h3 className="font-serif text-mag-cyan">Gestão de Permissões</h3>
                <span className="text-xs text-mag-text/40">{files.length} arquivos encontrados</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {files.length === 0 && (
                    <div className="text-center py-20 text-mag-text/30 italic">
                      Nenhum arquivo encontrado no banco de dados.
                    </div>
                )}
                
                {files.map(file => (
                    <div key={file.id} className="bg-black/40 p-4 rounded border border-white/5 hover:border-mag-light/30 transition-colors">
                        <div className="flex items-start justify-between mb-3 border-b border-white/5 pb-2">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded ${file.type === 'audio' ? 'bg-orange-900/20 text-orange-400' : 'bg-blue-900/20 text-blue-400'}`}>
                                    {file.type === 'audio' ? <FileAudio size={20} /> : <FileText size={20} />}
                                </div>
                                <div>
                                    <div className="font-medium text-white">{file.name}</div>
                                    <div className="text-xs text-mag-text/50 flex gap-2">
                                        <span className="bg-white/10 px-1.5 rounded uppercase">{file.campaign}</span>
                                        <span className="bg-white/10 px-1.5 rounded uppercase">{file.folder}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] text-mag-text/30 font-mono max-w-[150px] truncate" title={file.content}>
                              {file.content.startsWith('blob:') ? 'Local Blob' : 'Vercel Remote'}
                            </div>
                        </div>

                        {/* User Checkboxes */}
                        <div className="pl-11">
                           <p className="text-xs uppercase tracking-wider text-mag-text/40 mb-2">Acesso Permitido:</p>
                           <div className="flex flex-wrap gap-2">
                             {playerUsers.length === 0 && <span className="text-xs text-mag-text/30">Sem jogadores cadastrados.</span>}
                             
                             {playerUsers.map(user => {
                               const isAllowed = file.allowedUserIds.includes(user.id);
                               return (
                                 <label 
                                   key={user.id} 
                                   className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm cursor-pointer transition-all select-none ${
                                     isAllowed 
                                     ? 'bg-mag-cyan/10 border-mag-cyan/50 text-mag-cyan' 
                                     : 'bg-black/20 border-white/10 text-mag-text/50 hover:border-white/30'
                                   }`}
                                 >
                                   <input 
                                      type="checkbox" 
                                      checked={isAllowed}
                                      onChange={() => togglePermission(file.id, user.id, file.allowedUserIds)}
                                      className="hidden"
                                   />
                                   {isAllowed ? <Check size={14} /> : <div className="w-3.5 h-3.5" />}
                                   {user.name}
                                 </label>
                               );
                             })}
                           </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};
