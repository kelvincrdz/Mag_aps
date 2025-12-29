
import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import {
  FolderOpen,
  FileText,
  Rewind,
  Play,
  Pause,
  FastForward,
  LogOut,
  Music,
  ChevronLeft,
  ChevronRight,
  Folder,
  Settings,
  Video
} from 'lucide-react';
import { Cassette } from './components/Cassette';
import { MarkdownViewer } from './components/MarkdownViewer';
import { AdminPanel } from './components/AdminPanel';
import { AppState, GameFile, User, INITIAL_USERS } from './types';
import { uploadViaApi, saveFileMetadata, listAllFiles, saveUsers, listUsers, deleteCampaignFiles } from './services/magService';

function App() {
  // --- Global State ---
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [files, setFiles] = useState<GameFile[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  // --- Session State ---
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUserLoginId, setSelectedUserLoginId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- View State ---
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [currentDoc, setCurrentDoc] = useState<GameFile | null>(null);

  // --- Playback State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Computed Data ---

  // Filter files the current user can see
  const userFiles = files.filter(f => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return f.allowedUserIds.includes(currentUser.id);
  });

  // Get unique campaigns available to the user
  const availableCampaigns = Array.from(new Set(userFiles.map(f => f.campaign)));

  // Get folders for selected campaign
  const campaignFiles = selectedCampaign
    ? userFiles.filter(f => f.campaign === selectedCampaign)
    : [];

  // Group campaign files by folder
  const folders = campaignFiles.reduce((acc, file) => {
    if (!acc[file.folder]) acc[file.folder] = [];
    acc[file.folder].push(file);
    return acc;
  }, {} as Record<string, GameFile[]>);

  // Sorted list of tracks for the player (from current campaign)
  const tracks = campaignFiles.filter(f => f.type === 'audio' || f.type === 'video').sort((a, b) => a.name.localeCompare(b.name));

  const currentTrack = currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null;

  // --- Handlers ---

  // Load users from backend on mount
  useEffect(() => {
    if (!usersLoaded) {
      listUsers()
        .then(loadedUsers => {
          if (loadedUsers.length > 0) {
            setUsers(loadedUsers);
          }
          setUsersLoaded(true);
        })
        .catch(err => {
          console.error('Falha ao carregar usuários', err);
          setUsersLoaded(true);
        });
    }
  }, [usersLoaded]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.id === selectedUserLoginId);

    if (user) {
      if (user.role === 'admin') {
        if (password === '535846') {
          setCurrentUser(user);
          setAppState(AppState.CAMPAIGN_SELECT);
          // Load remote files from Blob
          listAllFiles()
            .then(remote => setFiles(remote))
            .catch(err => console.error('Listagem falhou', err));
          setPassword('');
          setLoginError('');
        } else {
          setLoginError('Senha de Administrador Incorreta');
          setTimeout(() => setLoginError(''), 3000);
        }
      } else {
        setCurrentUser(user);
        setAppState(AppState.CAMPAIGN_SELECT);
        listAllFiles()
          .then(remote => setFiles(remote))
          .catch(err => console.error('Listagem falhou', err));
      }
    }
  };

  const handleLogout = () => {
    setAppState(AppState.LOGIN);
    setCurrentUser(null);
    setSelectedCampaign(null);
    setCurrentTrackIndex(-1);
    setIsPlaying(false);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // --- Admin Handlers ---

  const addUser = async (name: string) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      role: 'player'
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    try {
      await saveUsers(updatedUsers);
    } catch (err) {
      console.error('Falha ao salvar usuário', err);
      alert('Erro ao salvar usuário');
    }
  };

  const updateUser = async (userId: string, name: string) => {
    const updatedUsers = users.map(u =>
      u.id === userId ? { ...u, name } : u
    );
    setUsers(updatedUsers);
    try {
      await saveUsers(updatedUsers);
    } catch (err) {
      console.error('Falha ao atualizar usuário', err);
      alert('Erro ao atualizar usuário');
    }
  };

  const addFile = async (file: GameFile) => {
    try {
      const contentType =
        file.type === 'audio' ? (file.blob as Blob)?.type || 'audio/mpeg' :
          file.type === 'video' ? (file.blob as Blob)?.type || 'video/mp4' :
            'text/markdown';
      const blobToSend = (file.type === 'audio' || file.type === 'video') && file.blob
        ? file.blob
        : new Blob([file.content], { type: 'text/markdown' });
      const uploaded = await uploadViaApi(file.campaign, file.folder, file.name, blobToSend, contentType);
      const remoteUrl = uploaded.url;
      await saveFileMetadata({
        id: file.id,
        name: file.name,
        type: file.type,
        campaign: file.campaign,
        folder: file.folder,
        url: remoteUrl,
        allowedUserIds: file.allowedUserIds,
      });
      const newLocal: GameFile = { ...file, content: remoteUrl, blob: undefined };
      setFiles([...files, newLocal]);
    } catch (err) {
      alert('Falha no upload/salvamento.');
      console.error(err);
    }
  };

  const updatePermissions = async (fileId: string, userIds: string[]) => {
    const target = files.find(f => f.id === fileId);
    if (!target) return;
    const updated = { ...target, allowedUserIds: userIds };
    try {
      await saveFileMetadata({
        id: updated.id,
        name: updated.name,
        type: updated.type,
        campaign: updated.campaign,
        folder: updated.folder,
        url: updated.content,
        allowedUserIds: updated.allowedUserIds,
      });
      setFiles(files.map(f => f.id === fileId ? updated : f));
    } catch (err) {
      alert('Falha ao atualizar permissões.');
      console.error(err);
    }
  };

  const deleteCampaign = async (campaignName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a campanha "${campaignName}" e todos os seus arquivos?`)) {
      return;
    }

    try {
      // Delete from backend
      await deleteCampaignFiles(campaignName);

      // Remove todos os arquivos da campanha localmente
      const updatedFiles = files.filter(f => f.campaign !== campaignName);
      setFiles(updatedFiles);

      // Se a campanha deletada estava selecionada, volta para seleção
      if (selectedCampaign === campaignName) {
        setSelectedCampaign(null);
        setCurrentTrackIndex(-1);
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }
    } catch (err) {
      console.error('Falha ao deletar campanha', err);
      alert('Erro ao deletar campanha');
    }
  };

  // --- Playback Handlers ---

  const togglePlay = () => {
    if (!currentTrack) return;
    const mediaElement = currentTrack.type === 'video' ? videoRef.current : audioRef.current;
    if (!mediaElement) return;
    if (isPlaying) mediaElement.pause();
    else mediaElement.play();
    setIsPlaying(!isPlaying);
  };

  const skip = (seconds: number) => {
    if (!currentTrack) return;
    const mediaElement = currentTrack.type === 'video' ? videoRef.current : audioRef.current;
    if (!mediaElement) return;
    mediaElement.currentTime += seconds;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (currentTrack && duration > 0) {
      const mediaElement = currentTrack.type === 'video' ? videoRef.current : audioRef.current;
      if (!mediaElement) return;
      const newTime = (val / 100) * duration;
      mediaElement.currentTime = newTime;
      setProgress(val);
      setCurrentTime(newTime);
    }
  };

  const changeTrack = (fileId: string) => {
    const index = tracks.findIndex(t => t.id === fileId);
    if (index !== -1) {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
    }
  };

  // --- Effects ---

  useEffect(() => {
    if (currentTrack) {
      if (currentTrack.type === 'video') {
        if (videoRef.current) {
          videoRef.current.src = currentTrack.content;
          videoRef.current.load();
          if (isPlaying) {
            videoRef.current.play().catch(e => console.warn("Autoplay blocked", e));
          }
        }
        // Pause audio if playing
        if (audioRef.current) {
          audioRef.current.pause();
        }
      } else {
        if (audioRef.current) {
          audioRef.current.src = currentTrack.content;
          audioRef.current.load();
          if (isPlaying) {
            audioRef.current.play().catch(e => console.warn("Autoplay blocked", e));
          }
        }
        // Pause video if playing
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }
    }
  }, [currentTrackIndex, currentTrack]);

  const handleTimeUpdate = () => {
    const mediaElement = currentTrack?.type === 'video' ? videoRef.current : audioRef.current;
    if (mediaElement) {
      const curr = mediaElement.currentTime;
      const dur = mediaElement.duration;
      setCurrentTime(curr);
      setDuration(dur);
      if (dur > 0) setProgress((curr / dur) * 100);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // --- Views ---

  const selectedUser = users.find(u => u.id === selectedUserLoginId);
  const isAdminSelected = selectedUser?.role === 'admin';

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-mag-mid to-mag-dark p-4">
      <div className="w-full max-w-md bg-mag-panel/50 backdrop-blur-lg border border-mag-light p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif text-white mb-2 tracking-wider">MAG PLAYER</h1>
          <div className="h-1 w-24 bg-mag-accent mx-auto rounded-full"></div>
          <p className="text-mag-cyan mt-4 text-sm uppercase tracking-widest opacity-80">Identificação Requerida</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-mag-text text-xs uppercase tracking-wider font-bold ml-1">Selecione o Usuário</label>
            <div className="relative">
              <select
                value={selectedUserLoginId}
                onChange={(e) => {
                  setSelectedUserLoginId(e.target.value);
                  setPassword('');
                  setLoginError('');
                }}
                className="w-full bg-mag-dark/80 border border-mag-light text-white py-3 px-4 rounded appearance-none focus:outline-none focus:border-mag-cyan focus:ring-1 focus:ring-mag-cyan transition-all font-mono tracking-wide cursor-pointer"
              >
                <option value="" disabled>-- Selecione --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-mag-cyan">
                <ChevronLeft className="-rotate-90 w-4 h-4" />
              </div>
            </div>
          </div>

          {isAdminSelected && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-mag-text text-xs uppercase tracking-wider font-bold ml-1 text-mag-accent">Senha de Mestre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-mag-dark/80 border border-mag-accent/50 text-center text-xl text-white py-3 rounded focus:outline-none focus:border-mag-accent focus:ring-1 focus:ring-mag-accent transition-all placeholder-mag-light/30 font-mono tracking-widest"
                placeholder="******"
              />
            </div>
          )}

          {loginError && (
            <div className="text-mag-accent text-center text-sm bg-mag-accent/10 py-2 rounded animate-pulse border border-mag-accent/20">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedUserLoginId || (isAdminSelected && !password)}
            className="w-full bg-gradient-to-r from-mag-light to-mag-mid hover:from-mag-cyan hover:to-mag-light text-white font-bold py-3 rounded transition-all duration-300 transform hover:scale-[1.02] shadow-lg border border-white/10 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );

  const renderCampaignSelect = () => (
    <div className="max-w-6xl mx-auto pt-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-10 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-3xl font-serif text-white mb-2">Campanhas Disponíveis</h2>
          <p className="text-mag-text/60">Selecione uma pasta para acessar os arquivos.</p>
        </div>
        <div className="flex gap-4">
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setAppState(AppState.ADMIN)}
              className="flex items-center gap-2 bg-mag-light/20 hover:bg-mag-accent/20 border border-mag-light/50 px-4 py-2 rounded text-mag-cyan hover:text-white transition-all uppercase text-xs tracking-wider"
            >
              <Settings size={16} /> Painel Mestre
            </button>
          )}
        </div>
      </div>

      {availableCampaigns.length === 0 ? (
        <div className="text-center py-20 bg-mag-panel/30 rounded-lg border border-white/5 border-dashed">
          <Folder size={48} className="mx-auto text-mag-text/20 mb-4" />
          <p className="text-mag-text/40">Nenhuma campanha disponível para seu usuário.</p>
          {currentUser?.role === 'admin' && (
            <p className="text-xs text-mag-accent mt-2">Acesse o Painel Mestre para criar arquivos.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableCampaigns.map(camp => (
            <button
              key={camp}
              onClick={() => {
                setSelectedCampaign(camp);
                setAppState(AppState.BROWSER);
              }}
              className="group relative h-48 bg-mag-panel/60 border border-white/5 hover:border-mag-cyan/50 rounded-xl p-6 text-left transition-all hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(108,207,246,0.2)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Folder size={100} />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono text-mag-accent mb-2">CONFIDENTIAL</div>
                  <h3 className="text-2xl font-serif text-white group-hover:text-mag-cyan transition-colors">{camp}</h3>
                </div>
                <div className="flex items-center text-xs text-mag-text/60 group-hover:text-mag-text transition-colors">
                  <span>Abrir Arquivos</span>
                  <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderPlayerControls = () => (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-700">
      {currentTrack?.type === 'video' ? (
        <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl border border-mag-cyan/30">
          <video
            ref={videoRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onError={() => alert("Erro na reprodução do vídeo.")}
            className="w-full max-h-[60vh] object-contain"
            controls={false}
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Video className="w-20 h-20 text-mag-cyan/50" />
            </div>
          )}
        </div>
      ) : (
        <Cassette
          isPlaying={isPlaying}
          progress={duration > 0 ? currentTime / duration : 0}
          title={currentTrack?.name || "AGUARDANDO..."}
        />
      )}

      <div className="bg-mag-panel/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-2xl">
        <div className="mb-4 flex items-center space-x-4">
          <span className="text-xs font-mono text-mag-cyan w-10 text-right shrink-0">{formatTime(currentTime)}</span>
          <div className="relative flex-1 h-4 group">
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-mag-dark rounded-full overflow-hidden">
              <div className="h-full bg-mag-accent transition-all duration-100 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <input type="range" min="0" max="100" step="0.1" value={progress} onChange={handleSeek} disabled={!currentTrack} className="absolute top-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
          <span className="text-xs font-mono text-mag-cyan w-10 shrink-0">{formatTime(duration)}</span>
        </div>

        <div className="flex justify-center items-center gap-8">
          <button onClick={() => skip(-10)} disabled={!currentTrack} className="text-mag-text hover:text-mag-cyan disabled:opacity-30 p-2"><Rewind className="w-8 h-8" /></button>
          <button onClick={togglePlay} disabled={!currentTrack} className="w-16 h-16 rounded-full bg-gradient-to-br from-mag-accent to-red-800 flex items-center justify-center text-white hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:grayscale">
            {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current pl-1" />}
          </button>
          <button onClick={() => skip(10)} disabled={!currentTrack} className="text-mag-text hover:text-mag-cyan disabled:opacity-30 p-2"><FastForward className="w-8 h-8" /></button>
        </div>
      </div>
    </div>
  );

  const renderBrowser = () => (
    <div className="h-full flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Left: Folder Structure */}
      <div className="w-full md:w-[350px] shrink-0 flex flex-col gap-4 bg-black/20 rounded-xl border border-white/5 p-4 overflow-y-auto custom-scrollbar">
        <button
          onClick={() => {
            setAppState(AppState.CAMPAIGN_SELECT);
            setCurrentDoc(null);
          }}
          className="flex items-center text-mag-cyan hover:text-white transition-colors mb-2 text-sm uppercase tracking-wider font-bold"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar: {selectedCampaign}
        </button>

        {Object.entries(folders).map(([folderName, files]) => (
          <div key={folderName} className="mb-4">
            <h4 className="text-xs font-serif text-mag-text/50 uppercase border-b border-white/10 pb-1 mb-2 flex items-center">
              <Folder className="w-3 h-3 mr-2" /> {folderName}
            </h4>
            <div className="space-y-1">
              {files.map(file => (
                <button
                  key={file.id}
                  onClick={() => {
                    if (file.type === 'audio' || file.type === 'video') {
                      setAppState(AppState.PLAYER);
                      changeTrack(file.id);
                    } else {
                      setCurrentDoc(file);
                    }
                  }}
                  className={`w-full text-left p-2 rounded text-xs transition-all flex items-center gap-2 group ${(currentTrack?.id === file.id && isPlaying) || (currentDoc?.id === file.id)
                    ? 'bg-mag-accent/20 border border-mag-accent/50 text-white'
                    : 'hover:bg-mag-light/30 text-mag-text/80'
                    }`}
                >
                  {file.type === 'audio' ? <Music size={14} /> :
                    file.type === 'video' ? <Video size={14} /> :
                      <FileText size={14} />}
                  <span className="truncate flex-1">{file.name}</span>
                  {(file.type === 'audio' || file.type === 'video') && currentTrack?.id === file.id && isPlaying && (
                    <div className="w-1.5 h-1.5 rounded-full bg-mag-accent animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Right: Content Viewer (Doc or Player Placeholder) */}
      <div className="flex-1 bg-mag-panel/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
        {currentDoc ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-mag-cyan" />
                <h3 className="text-lg font-serif text-mag-text truncate max-w-[300px]">{currentDoc.name}</h3>
              </div>
              <button onClick={() => setCurrentDoc(null)} className="text-xs hover:text-white text-mag-text/50">FECHAR</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gradient-to-br from-mag-panel/50 to-black/40">
              <MarkdownViewer content={currentDoc.content} />
            </div>

            {/* Mini Player Flutuante quando está tocando */}
            {currentTrack && isPlaying && (
              <div className="absolute bottom-4 right-4 bg-mag-dark/95 backdrop-blur-xl border border-mag-accent/50 rounded-xl shadow-2xl p-4 w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <Music className="w-5 h-5 text-mag-accent animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-mag-text/50 uppercase tracking-wider">Tocando Agora</div>
                    <div className="text-sm text-white font-semibold truncate">{currentTrack.name}</div>
                  </div>
                  <button
                    onClick={() => {
                      setAppState(AppState.PLAYER);
                      setCurrentDoc(null);
                    }}
                    className="text-mag-cyan hover:text-white text-xs uppercase tracking-wider shrink-0"
                  >
                    Abrir
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-gradient-to-br from-mag-accent to-red-800 flex items-center justify-center text-white hover:scale-105 transition-all shadow-lg">
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current pl-0.5" />}
                  </button>

                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs font-mono text-mag-text/70">{formatTime(currentTime)}</span>
                    <div className="flex-1 h-1 bg-mag-light/20 rounded-full relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-mag-accent to-mag-cyan rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="text-xs font-mono text-mag-text/70">{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : appState === AppState.PLAYER ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
            <button
              onClick={() => setAppState(AppState.BROWSER)}
              className="absolute top-4 left-4 flex items-center text-xs text-mag-cyan hover:text-white md:hidden"
            >
              <ChevronLeft size={14} /> Arquivos
            </button>
            {renderPlayerControls()}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-mag-text/30 p-8 text-center">
            <FolderOpen size={64} className="mb-4 opacity-20" />
            <p className="font-serif text-lg">Selecione um arquivo para visualizar</p>
            <p className="text-xs mt-2 opacity-50">Áudios abrirão o player. Documentos abrirão aqui.</p>
          </div>
        )}
      </div>
    </div>
  );

  // --- Main Render ---

  if (appState === AppState.ADMIN && currentUser?.role === 'admin') {
    return (
      <AdminPanel
        users={users}
        files={files}
        onAddUser={addUser}
        onUpdateUser={updateUser}
        onUploadFile={addFile}
        onUpdatePermissions={updatePermissions}
        onDeleteCampaign={deleteCampaign}
        onExit={() => setAppState(AppState.CAMPAIGN_SELECT)}
      />
    );
  }

  return (
    <div className="min-h-screen text-mag-text font-sans selection:bg-mag-accent selection:text-white relative overflow-hidden bg-mag-dark">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#002838] via-[#001010] to-[#000000] -z-20"></div>
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 -z-10 mix-blend-overlay"></div>

      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} onError={() => alert("Erro na reprodução.")} />
      <video ref={videoRef} className="hidden" />

      <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
        {appState === AppState.LOGIN ? renderLogin() : (
          <>
            <header className="flex justify-between items-center mb-6 shrink-0 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setAppState(AppState.CAMPAIGN_SELECT)}>
                <div className="w-3 h-10 bg-mag-accent rounded-sm shadow-[0_0_15px_rgba(236,29,37,0.5)]"></div>
                <div>
                  <h1 className="text-2xl font-serif font-bold tracking-widest text-white leading-none">MAG</h1>
                  <span className="text-mag-cyan text-xs tracking-[0.3em] uppercase block">Audio System</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <div className="text-xs text-mag-text/50 font-mono">USUÁRIO</div>
                  <div className="text-sm font-bold text-white uppercase">{currentUser?.name}</div>
                </div>
                <button onClick={handleLogout} title="Sair" className="p-2 hover:bg-white/10 rounded-full text-mag-text/70 hover:text-white transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col relative">
              {appState === AppState.CAMPAIGN_SELECT && renderCampaignSelect()}
              {(appState === AppState.BROWSER || appState === AppState.PLAYER) && renderBrowser()}
            </main>

            <footer className="mt-4 shrink-0 text-center text-mag-text/30 text-xs font-mono pb-2">
              IFCE MAGNO ARCHIVES &copy; {new Date().getFullYear()}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
