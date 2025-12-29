
import React, { useState, ChangeEvent, useMemo } from 'react';
import { User, GameFile, FileType } from '../types';
import { Upload, Users, FileAudio, FileText, Check, X, Shield, Plus, Filter } from 'lucide-react';

interface AdminPanelProps {
    users: User[];
    files: GameFile[];
    onAddUser: (name: string) => void;
    onUpdateUser: (userId: string, name: string) => void;
    onUploadFile: (file: GameFile) => void;
    onUpdatePermissions: (fileId: string, userIds: string[]) => void;
    onDeleteCampaign: (campaignName: string) => void;
    onExit: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
    users,
    files,
    onAddUser,
    onUpdateUser,
    onUploadFile,
    onUpdatePermissions,
    onDeleteCampaign,
    onExit
}) => {
    // --- Local State for Forms ---
    const [newUserName, setNewUserName] = useState('');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editingUserName, setEditingUserName] = useState('');

    // Upload Form
    const [campaignName, setCampaignName] = useState('MAG 01');
    const [folderName, setFolderName] = useState('Arquivos');
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');

    // Permission Modal State
    const [editingFileId, setEditingFileId] = useState<string | null>(null);
    const [editingCampaign, setEditingCampaign] = useState<string | null>(null);

    // Filter State
    const [filterCampaign, setFilterCampaign] = useState<string>('');
    const [filterFolder, setFilterFolder] = useState<string>('');

    // --- Handlers ---

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (newUserName.trim()) {
            onAddUser(newUserName);
            setNewUserName('');
        }
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setIsProcessing(true);
        setUploadProgress(0);
        setUploadStatus(`Preparando ${uploadedFile.name}...`);

        // Determine Type
        let type: FileType = 'document';
        if (uploadedFile.name.endsWith('.mp3')) type = 'audio';
        else if (uploadedFile.name.endsWith('.mp4')) type = 'video';
        else if (uploadedFile.name.endsWith('.md')) type = 'document';
        else {
            alert('Apenas arquivos .md, .mp3 ou .mp4 são permitidos.');
            setIsProcessing(false);
            setUploadProgress(0);
            setUploadStatus('');
            return;
        }

        try {
            setUploadProgress(20);
            setUploadStatus('Lendo arquivo...');

            let content = '';
            let blob: Blob | undefined = undefined;

            if (type === 'audio' || type === 'video') {
                blob = uploadedFile;
                content = URL.createObjectURL(blob);
            } else {
                content = await uploadedFile.text();
            }

            setUploadProgress(40);
            setUploadStatus('Enviando para Vercel Blob...');

            const newFile: GameFile = {
                id: crypto.randomUUID(),
                name: uploadedFile.name,
                type,
                campaign: campaignName,
                folder: folderName,
                content,
                blob,
                allowedUserIds: [] // Default: no access
            };

            setUploadProgress(60);
            await onUploadFile(newFile);

            setUploadProgress(100);
            setUploadStatus('✓ Upload concluído!');

            // Clear status after 2 seconds
            setTimeout(() => {
                setUploadStatus('');
                setUploadProgress(0);
            }, 2000);
        } catch (error) {
            console.error("Upload error", error);
            setUploadStatus('✗ Erro no upload');
            alert("Erro ao processar arquivo.");
            setTimeout(() => {
                setUploadStatus('');
                setUploadProgress(0);
            }, 3000);
        } finally {
            setIsProcessing(false);
            // Reset input
            e.target.value = '';
        }
    };

    const toggleUserPermission = (userId: string, currentFile: GameFile) => {
        const currentPerms = new Set(currentFile.allowedUserIds);
        if (currentPerms.has(userId)) {
            currentPerms.delete(userId);
        } else {
            currentPerms.add(userId);
        }
        onUpdatePermissions(currentFile.id, Array.from(currentPerms));
    };

    const toggleCampaignPermission = (userId: string, campaign: string) => {
        const campaignFiles = files.filter(f => f.campaign === campaign);
        const accessibleFiles = campaignFiles.filter(f => f.allowedUserIds.includes(userId));
        const hasFullAccess = accessibleFiles.length === campaignFiles.length;

        // Se tem acesso total, remove de todos. Se não, adiciona a todos
        const shouldAdd = !hasFullAccess;

        campaignFiles.forEach(file => {
            const currentPerms = new Set(file.allowedUserIds);
            if (shouldAdd) {
                currentPerms.add(userId);
            } else {
                currentPerms.delete(userId);
            }
            onUpdatePermissions(file.id, Array.from(currentPerms));
        });
    };

    const editingFile = files.find(f => f.id === editingFileId);

    // Get unique campaigns and folders for filter
    const availableCampaigns = useMemo(() =>
        Array.from(new Set(files.map(f => f.campaign))).sort()
        , [files]);

    const availableFolders = useMemo(() =>
        Array.from(new Set(files.map(f => f.folder))).sort()
        , [files]);

    // Filtered files
    const filteredFiles = useMemo(() => {
        return files.filter(file => {
            const matchesCampaign = !filterCampaign || file.campaign === filterCampaign;
            const matchesFolder = !filterFolder || file.folder === filterFolder;
            return matchesCampaign && matchesFolder;
        });
    }, [files, filterCampaign, filterFolder]);

    return (
        <div className="h-full flex flex-col bg-mag-dark/95 text-mag-text p-6 overflow-hidden custom-scrollbar">

            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-mag-light/30 pb-4">
                <div className="flex items-center gap-3">
                    <Shield className="text-mag-accent w-8 h-8" />
                    <div>
                        <h1 className="text-2xl font-serif text-white">Painel do Mestre</h1>
                        <p className="text-xs text-mag-cyan uppercase tracking-wider">Gerenciamento de Arquivos e Permissões</p>
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
                            <Users size={18} /> Gerenciar Usuários
                        </h3>
                        <form onSubmit={handleCreateUser} className="flex gap-2 mb-4">
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
                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                            {users.filter(u => u.role !== 'admin').map(u => (
                                <div key={u.id} className="flex items-center justify-between bg-black/30 p-2 rounded border border-white/5 hover:border-mag-cyan/30 transition-colors">
                                    {editingUserId === u.id ? (
                                        <>
                                            <input
                                                type="text"
                                                value={editingUserName}
                                                onChange={e => setEditingUserName(e.target.value)}
                                                className="flex-1 bg-black/50 border border-mag-cyan/50 rounded px-2 py-1 text-sm focus:outline-none"
                                                autoFocus
                                            />
                                            <div className="flex gap-1 ml-2">
                                                <button
                                                    onClick={() => {
                                                        if (editingUserName.trim()) {
                                                            onUpdateUser(u.id, editingUserName);
                                                            setEditingUserId(null);
                                                        }
                                                    }}
                                                    className="p-1 bg-mag-cyan/20 hover:bg-mag-cyan/30 rounded"
                                                >
                                                    <Check size={14} className="text-mag-cyan" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingUserId(null)}
                                                    className="p-1 bg-mag-accent/20 hover:bg-mag-accent/30 rounded"
                                                >
                                                    <X size={14} className="text-mag-accent" />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-sm text-mag-text/90">{u.name}</span>
                                            <button
                                                onClick={() => {
                                                    setEditingUserId(u.id);
                                                    setEditingUserName(u.name);
                                                }}
                                                className="text-xs text-mag-cyan/70 hover:text-mag-cyan uppercase tracking-wider"
                                            >
                                                Editar
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                            {users.filter(u => u.role !== 'admin').length === 0 && (
                                <p className="text-center text-mag-text/30 text-xs py-2">Nenhum jogador cadastrado</p>
                            )}
                        </div>
                    </div>

                    {/* Upload */}
                    <div className="bg-mag-panel/50 p-6 rounded-lg border border-white/5">
                        <h3 className="text-lg font-serif text-mag-cyan mb-4 flex items-center gap-2">
                            <Upload size={18} /> Upload de Arquivos
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs uppercase tracking-wider text-mag-text/60 block mb-1">Campanha</label>
                                <input
                                    type="text"
                                    value={campaignName}
                                    onChange={e => setCampaignName(e.target.value)}
                                    className="w-full bg-black/30 border border-mag-light/30 rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider text-mag-text/60 block mb-1">Pasta / Tipo</label>
                                <input
                                    type="text"
                                    value={folderName}
                                    onChange={e => setFolderName(e.target.value)}
                                    className="w-full bg-black/30 border border-mag-light/30 rounded px-3 py-2"
                                />
                            </div>

                            <div className="pt-2 space-y-3">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-mag-light/30 rounded-lg cursor-pointer hover:bg-mag-light/10 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {isProcessing ? (
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mag-cyan"></div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 mb-2 text-mag-text/50" />
                                                <p className="text-sm text-mag-text/70"><span className="font-semibold">Clique para upload</span></p>
                                                <p className="text-xs text-mag-text/50">.MD, .MP3 ou .MP4</p>
                                            </>
                                        )}
                                    </div>
                                    <input type="file" className="hidden" accept=".md,.mp3,.mp4" onChange={handleFileUpload} disabled={isProcessing} />
                                </label>

                                {/* Progress Bar */}
                                {(isProcessing || uploadProgress > 0) && (
                                    <div className="space-y-2 animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-mag-text/70 truncate flex-1">{uploadStatus}</span>
                                            <span className="text-xs text-mag-cyan font-mono ml-2">{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden border border-mag-light/20">
                                            <div
                                                className="h-full bg-gradient-to-r from-mag-cyan to-mag-accent transition-all duration-500 ease-out rounded-full"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Campanhas Disponíveis */}
                    <div className="bg-mag-panel/50 p-6 rounded-lg border border-white/5 flex flex-col">
                        <h3 className="text-lg font-serif text-mag-cyan mb-4 flex items-center gap-2">
                            <FileText size={18} /> Campanhas Disponíveis
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                            {Array.from(new Set(files.map(f => f.campaign))).map(campaign => {
                                const fileCount = files.filter(f => f.campaign === campaign).length;
                                return (
                                    <div key={campaign} className="flex items-center justify-between bg-black/30 p-3 rounded border border-white/5 hover:border-mag-accent/30 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-white truncate">{campaign}</div>
                                            <div className="text-xs text-mag-text/50">{fileCount} arquivo{fileCount !== 1 ? 's' : ''}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingCampaign(campaign)}
                                                className="px-2 py-1 rounded text-xs text-mag-cyan/70 hover:bg-mag-cyan/10 hover:text-mag-cyan border border-mag-cyan/30 uppercase tracking-wider"
                                                title="Compartilhar campanha"
                                            >
                                                Compartilhar
                                            </button>
                                            <button
                                                onClick={() => onDeleteCampaign(campaign)}
                                                className="p-2 rounded text-mag-accent/70 hover:bg-mag-accent/10 hover:text-mag-accent transition-all"
                                                title="Deletar campanha"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {files.length === 0 && (
                                <p className="text-center text-mag-text/30 text-sm py-4">Nenhuma campanha cadastrada</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: File List & Permissions */}
                <div className="flex-1 bg-mag-panel/30 rounded-lg border border-white/5 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-black/20">
                        <h3 className="font-serif text-mag-cyan mb-3">Arquivos do Sistema</h3>

                        {/* Filter Controls */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-xs uppercase tracking-wider text-mag-text/50 block mb-1.5 flex items-center gap-1">
                                    <Filter size={12} /> Campanha
                                </label>
                                <select
                                    value={filterCampaign}
                                    onChange={(e) => setFilterCampaign(e.target.value)}
                                    className="w-full bg-black/30 border border-mag-light/30 rounded px-2 py-1.5 text-sm focus:border-mag-cyan focus:outline-none"
                                >
                                    <option value="">Todas</option>
                                    {availableCampaigns.map(campaign => (
                                        <option key={campaign} value={campaign}>{campaign}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs uppercase tracking-wider text-mag-text/50 block mb-1.5 flex items-center gap-1">
                                    <Filter size={12} /> Pasta/Tipo
                                </label>
                                <select
                                    value={filterFolder}
                                    onChange={(e) => setFilterFolder(e.target.value)}
                                    className="w-full bg-black/30 border border-mag-light/30 rounded px-2 py-1.5 text-sm focus:border-mag-cyan focus:outline-none"
                                >
                                    <option value="">Todas</option>
                                    {availableFolders.map(folder => (
                                        <option key={folder} value={folder}>{folder}</option>
                                    ))}
                                </select>
                            </div>
                            {(filterCampaign || filterFolder) && (
                                <button
                                    onClick={() => {
                                        setFilterCampaign('');
                                        setFilterFolder('');
                                    }}
                                    className="self-end px-3 py-1.5 bg-mag-accent/20 hover:bg-mag-accent/30 rounded text-xs text-mag-accent"
                                    title="Limpar filtros"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>

                        {/* Results count */}
                        <div className="mt-2 text-xs text-mag-text/50">
                            {filteredFiles.length} de {files.length} arquivo{files.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {filteredFiles.length === 0 && (
                            <div className="text-center py-20 text-mag-text/30 italic">
                                {files.length === 0 ? 'Nenhum arquivo no sistema.' : 'Nenhum arquivo corresponde aos filtros.'}
                            </div>
                        )}
                        {filteredFiles.map(file => (
                            <div key={file.id} className="flex items-center justify-between bg-black/40 p-3 rounded border border-white/5 hover:border-mag-light/30 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`p-2 rounded ${file.type === 'audio' ? 'bg-orange-900/20 text-orange-400' :
                                        file.type === 'video' ? 'bg-purple-900/20 text-purple-400' :
                                            'bg-blue-900/20 text-blue-400'
                                        }`}>
                                        {file.type === 'audio' ? <FileAudio size={20} /> :
                                            file.type === 'video' ? <FileAudio size={20} /> :
                                                <FileText size={20} />}
                                    </div>
                                    <div>
                                        <div className="font-medium truncate max-w-[200px]">{file.name}</div>
                                        <div className="text-xs text-mag-text/50 flex gap-2">
                                            <span className="bg-white/10 px-1.5 rounded">{file.campaign}</span>
                                            <span className="bg-white/10 px-1.5 rounded">{file.folder}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-xs text-right text-mag-text/40">
                                        {file.allowedUserIds.length} acessos
                                    </div>
                                    <button
                                        onClick={() => setEditingFileId(file.id)}
                                        className={`px-3 py-1.5 rounded text-xs uppercase tracking-wider border transition-all ${editingFileId === file.id
                                            ? 'bg-mag-accent text-white border-mag-accent'
                                            : 'border-mag-light/30 hover:border-mag-cyan hover:text-mag-cyan'
                                            }`}
                                    >
                                        Compartilhar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Permission Side Panel (Overlay or Third Column) */}
                {editingFile && (
                    <div className="w-64 bg-mag-dark border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b border-white/10 bg-mag-accent/10">
                            <h4 className="text-sm font-bold text-mag-accent uppercase tracking-widest mb-1">Permissões</h4>
                            <p className="text-xs truncate text-white">{editingFile.name}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                            {users.filter(u => u.role !== 'admin').map(user => {
                                const hasAccess = editingFile.allowedUserIds.includes(user.id);
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => toggleUserPermission(user.id, editingFile)}
                                        className={`w-full text-left p-3 rounded border flex items-center justify-between transition-all ${hasAccess
                                            ? 'bg-mag-cyan/10 border-mag-cyan/50 text-white'
                                            : 'bg-transparent border-white/5 text-mag-text/50 hover:bg-white/5'
                                            }`}
                                    >
                                        <span className="text-sm">{user.name}</span>
                                        {hasAccess ? <Check size={14} className="text-mag-cyan" /> : <X size={14} />}
                                    </button>
                                );
                            })}
                            {users.filter(u => u.role !== 'admin').length === 0 && (
                                <p className="text-xs text-center text-mag-text/30 mt-4">Nenhum jogador cadastrado.</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/10">
                            <button onClick={() => setEditingFileId(null)} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded text-xs uppercase">Concluir</button>
                        </div>
                    </div>
                )}

                {/* Campaign Permission Panel */}
                {editingCampaign && (
                    <div className="w-64 bg-mag-dark border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b border-white/10 bg-mag-cyan/10">
                            <h4 className="text-sm font-bold text-mag-cyan uppercase tracking-widest mb-1">Campanha</h4>
                            <p className="text-xs truncate text-white">{editingCampaign}</p>
                            <p className="text-xs text-mag-text/50 mt-1">{files.filter(f => f.campaign === editingCampaign).length} arquivos</p>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                            {users.filter(u => u.role !== 'admin').map(user => {
                                const campaignFiles = files.filter(f => f.campaign === editingCampaign);
                                const accessibleFiles = campaignFiles.filter(f => f.allowedUserIds.includes(user.id));
                                const hasFullAccess = accessibleFiles.length === campaignFiles.length;
                                const hasPartialAccess = accessibleFiles.length > 0 && accessibleFiles.length < campaignFiles.length;
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => toggleCampaignPermission(user.id, editingCampaign)}
                                        className={`w-full text-left p-3 rounded border flex items-center justify-between transition-all ${hasFullAccess
                                            ? 'bg-mag-cyan/10 border-mag-cyan/50 text-white'
                                            : hasPartialAccess
                                                ? 'bg-orange-500/10 border-orange-500/50 text-orange-300'
                                                : 'bg-transparent border-white/5 text-mag-text/50 hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <span className="text-sm block">{user.name}</span>
                                            {hasPartialAccess && (
                                                <span className="text-xs opacity-70">{accessibleFiles.length}/{campaignFiles.length} arquivos</span>
                                            )}
                                        </div>
                                        {hasFullAccess ? <Check size={14} className="text-mag-cyan" /> : hasPartialAccess ? <Check size={14} className="text-orange-400" /> : <X size={14} />}
                                    </button>
                                );
                            })}
                            {users.filter(u => u.role !== 'admin').length === 0 && (
                                <p className="text-xs text-center text-mag-text/30 mt-4">Nenhum jogador cadastrado.</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-white/10">
                            <button onClick={() => setEditingCampaign(null)} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded text-xs uppercase">Concluir</button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
