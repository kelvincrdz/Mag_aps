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
  Loader2
} from 'lucide-react';
import { processMagFile } from './services/magService';
import { Cassette } from './components/Cassette';
import { MarkdownViewer } from './components/MarkdownViewer';
import { AudioTrack, DocumentFile, AppState, ACCESS_CODE } from './types';

function App() {
  // --- State ---
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [accessCode, setAccessCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // File Data
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [docs, setDocs] = useState<DocumentFile[]>([]);
  
  // Playback State
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Helpers ---
  const currentTrack = currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const cleanFileName = (name: string) => {
    return name.replace(/\.(md|markdown)$/i, '');
  };

  // --- Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === ACCESS_CODE) {
      setAppState(AppState.PLAYER);
    } else {
      setLoginError('Invalid Access Code');
      setTimeout(() => setLoginError(''), 2000);
    }
  };

  const handleLogout = () => {
    // Reset everything
    setAppState(AppState.LOGIN);
    setAccessCode('');
    setTracks([]);
    setDocs([]);
    setCurrentTrackIndex(-1);
    setIsPlaying(false);
    setProgress(0);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.mag') && !file.name.endsWith('.zip')) {
      alert("Please upload a .mag or .zip file");
      return;
    }

    setIsLoading(true);
    try {
      const packageData = await processMagFile(file);
      setTracks(packageData.tracks);
      setDocs(packageData.documents);
      
      if (packageData.tracks.length > 0) {
        setCurrentTrackIndex(0);
      }
    } catch (error) {
      console.error(error);
      alert("Error processing file. Is it a valid .mag archive?");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime += seconds;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current && duration > 0) {
      const newTime = (val / 100) * duration;
      audioRef.current.currentTime = newTime;
      setProgress(val);
      setCurrentTime(newTime);
    }
  };

  const changeTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true); // Auto-play on track switch
    // Note: The useEffect on currentTrackIndex will handle loading the source
  };

  // --- Effects ---

  // Handle Track Change
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(e => console.warn("Autoplay blocked", e));
      }
    }
  }, [currentTrackIndex, currentTrack]); // Removed isPlaying to avoid loop re-triggering

  // Handle Time Update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const curr = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setCurrentTime(curr);
      setDuration(dur);
      if (dur > 0) {
        setProgress((curr / dur) * 100);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    // Optional: Auto-play next track
    if (currentTrackIndex < tracks.length - 1) {
      changeTrack(currentTrackIndex + 1);
    }
  };

  // --- Views ---

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-mag-mid to-mag-dark p-4">
      <div className="w-full max-w-md bg-mag-panel/50 backdrop-blur-lg border border-mag-light p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif text-white mb-2 tracking-wider">MAG PLAYER</h1>
          <div className="h-1 w-24 bg-mag-accent mx-auto rounded-full"></div>
          <p className="text-mag-cyan mt-4 text-sm uppercase tracking-widest opacity-80">Restricted Access System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-mag-text text-xs uppercase tracking-wider font-bold ml-1">Access Code</label>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full bg-mag-dark/80 border border-mag-light text-center text-xl text-white py-3 rounded focus:outline-none focus:border-mag-cyan focus:ring-1 focus:ring-mag-cyan transition-all placeholder-mag-light/30 font-mono tracking-widest"
              placeholder="XXX/XXXX-00.00"
            />
          </div>
          
          {loginError && (
            <div className="text-mag-accent text-center text-sm bg-mag-accent/10 py-2 rounded animate-pulse">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-mag-light to-mag-mid hover:from-mag-cyan hover:to-mag-light text-white font-bold py-3 rounded transition-all duration-300 transform hover:scale-[1.02] shadow-lg border border-white/10 uppercase tracking-widest"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );

  const renderPlayer = () => (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-10 md:pb-0">
      
      {/* Cassette Visualization */}
      <div className="relative">
        <Cassette 
          isPlaying={isPlaying} 
          progress={duration > 0 ? currentTime / duration : 0} 
          title={currentTrack?.name || "NO TAPE LOADED"} 
        />
      </div>

      {/* Main Controls Panel */}
      <div className="bg-mag-panel/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-2xl">
        
        {/* Progress Bar */}
        <div className="mb-8 md:mb-6 flex items-center space-x-4">
          <span className="text-xs font-mono text-mag-cyan w-10 text-right shrink-0">{formatTime(currentTime)}</span>
          <div className="relative flex-1 h-4 group">
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-mag-dark rounded-full overflow-hidden">
               <div 
                  className="h-full bg-mag-accent transition-all duration-100 ease-out"
                  style={{ width: `${progress}%` }}
               />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleSeek}
              disabled={!currentTrack}
              className="absolute top-0 w-full h-full opacity-0 cursor-pointer"
            />
             {/* Thumb indicator for custom styling look */}
             <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow pointer-events-none transition-all duration-100 ease-out"
                style={{ left: `${progress}%`, marginLeft: '-6px' }}
             />
          </div>
          <span className="text-xs font-mono text-mag-cyan w-10 shrink-0">{formatTime(duration)}</span>
        </div>

        {/* Buttons Row - RESPONSIVE LAYOUT */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0">
          
          {/* Group 1: File Actions (Order 3 on Mobile = Bottom) */}
          <div className="flex space-x-4 md:space-x-2 order-3 md:order-1 w-full md:w-auto justify-center md:justify-start border-t md:border-t-0 border-white/5 pt-6 md:pt-0">
            {/* File Upload Hidden Input */}
            <input 
              type="file" 
              id="mag-upload" 
              className="hidden" 
              accept=".mag,.zip" 
              onChange={handleFileUpload} 
            />
            <label 
              htmlFor="mag-upload"
              className={`p-3 rounded-full bg-mag-light/20 border border-mag-light/50 text-mag-text hover:bg-mag-cyan hover:text-mag-dark transition-all cursor-pointer ${isLoading ? 'animate-pulse pointer-events-none' : ''}`}
              title="Load Tape (.mag)"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <FolderOpen className="w-6 h-6" />}
            </label>

            <button 
              onClick={() => setAppState(AppState.BROWSER)}
              className="p-3 rounded-full bg-mag-light/20 border border-mag-light/50 text-mag-text hover:bg-mag-cyan hover:text-mag-dark transition-all"
              title="View Archives"
              disabled={tracks.length === 0 && docs.length === 0}
            >
              <FileText className="w-6 h-6" />
            </button>
          </div>

          {/* Group 2: Playback Controls (Order 1 on Mobile = Top) */}
          <div className="flex items-center space-x-8 md:space-x-6 order-1 md:order-2 w-full justify-center md:w-auto">
            <button 
              onClick={() => skip(-10)}
              className="text-mag-text hover:text-mag-cyan transition-colors disabled:opacity-30 p-2"
              disabled={!currentTrack}
            >
              <Rewind className="w-8 h-8" />
            </button>

            <button 
              onClick={togglePlay}
              disabled={!currentTrack}
              className="w-20 h-20 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-mag-accent to-red-800 flex items-center justify-center text-white shadow-[0_0_20px_rgba(236,29,37,0.4)] hover:shadow-[0_0_30px_rgba(236,29,37,0.6)] hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale"
            >
              {isPlaying ? <Pause className="w-10 h-10 md:w-8 md:h-8 fill-current" /> : <Play className="w-10 h-10 md:w-8 md:h-8 fill-current pl-1" />}
            </button>

            <button 
              onClick={() => skip(10)}
              className="text-mag-text hover:text-mag-cyan transition-colors disabled:opacity-30 p-2"
              disabled={!currentTrack}
            >
              <FastForward className="w-8 h-8" />
            </button>
          </div>

          {/* Group 3: Track Select & Logout (Order 2 on Mobile = Middle) */}
          <div className="flex space-x-3 order-2 md:order-3 w-full md:w-auto justify-center md:justify-end">
            <div className="relative group flex-1 md:flex-none max-w-[240px] md:max-w-none">
                <select 
                    className="appearance-none bg-mag-dark text-mag-text pl-10 pr-4 py-3 rounded-full border border-mag-light/50 focus:outline-none focus:border-mag-cyan w-full md:w-48 truncate cursor-pointer hover:bg-mag-light/20 text-sm"
                    value={currentTrackIndex}
                    onChange={(e) => changeTrack(Number(e.target.value))}
                    disabled={tracks.length === 0}
                >
                    {tracks.map((t, idx) => (
                        <option key={t.id} value={idx}>{t.name}</option>
                    ))}
                    {tracks.length === 0 && <option value={-1}>No Audio</option>}
                </select>
                <Music className="w-5 h-5 text-mag-cyan absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-3 rounded-full bg-mag-light/10 border border-mag-light/30 text-mag-text/70 hover:bg-red-900/50 hover:text-red-200 hover:border-red-800 transition-all shrink-0"
              title="Eject / Logout"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );

  const renderBrowser = () => (
    <div className="h-full flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 md:overflow-hidden overflow-y-auto custom-scrollbar">
      
      {/* Mini Player / Sidebar */}
      <div className="w-full md:w-[350px] shrink-0 flex flex-col gap-4 md:overflow-y-auto custom-scrollbar pr-2 pb-4">
        <button 
          onClick={() => setAppState(AppState.PLAYER)}
          className="flex items-center text-mag-cyan hover:text-white transition-colors self-start mb-2 sticky top-0 bg-mag-dark/80 backdrop-blur z-10 w-full py-2"
        >
          <ChevronLeft className="w-5 h-5 mr-1" /> Back to Player
        </button>

        {/* Mini Cassette Visualization */}
        <div className="w-full max-w-[280px] md:max-w-none mx-auto aspect-[3/2] bg-mag-dark/50 rounded-xl p-2 border border-white/5 shadow-lg relative">
             <Cassette 
                isPlaying={isPlaying} 
                progress={duration > 0 ? currentTime / duration : 0} 
                title={currentTrack?.name || "NO TAPE"} 
            />
        </div>

        {/* Mini Controls */}
        <div className="bg-mag-panel/80 backdrop-blur border border-white/10 rounded-xl p-4 shadow-lg">
             <div className="flex items-center justify-between gap-2">
                <button onClick={() => skip(-10)} disabled={!currentTrack} className="p-2 text-mag-text hover:text-mag-cyan disabled:opacity-30"><Rewind size={20}/></button>
                <button 
                  onClick={togglePlay} 
                  disabled={!currentTrack} 
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-mag-accent to-red-800 text-white flex items-center justify-center hover:scale-105 transition shadow-lg disabled:opacity-50 disabled:grayscale"
                >
                    {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="pl-0.5 fill-current" />}
                </button>
                <button onClick={() => skip(10)} disabled={!currentTrack} className="p-2 text-mag-text hover:text-mag-cyan disabled:opacity-30"><FastForward size={20}/></button>
             </div>
             
             {/* Progress Bar Mini */}
             <div className="mt-3 flex items-center space-x-2">
                <span className="text-[10px] font-mono text-mag-cyan">{formatTime(currentTime)}</span>
                <div className="relative flex-1 h-2 bg-mag-dark rounded-full overflow-hidden">
                    <div className="h-full bg-mag-accent" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-[10px] font-mono text-mag-cyan">{formatTime(duration)}</span>
             </div>
             
             {currentTrack && (
                <div className="text-center mt-2 text-xs text-mag-cyan font-mono truncate">
                    {currentTrack.name}
                </div>
            )}
        </div>

        {/* Track List */}
        <div className="bg-mag-panel/80 backdrop-blur border border-white/10 rounded-xl p-4 shadow-lg flex-1 min-h-[200px] flex flex-col">
          <h3 className="text-sm font-serif text-mag-text mb-3 border-b border-white/10 pb-2 flex items-center uppercase tracking-wider">
            <Music className="w-3 h-3 mr-2 text-mag-accent" /> Tracks
          </h3>
          <div className="flex-1 space-y-1">
            {tracks.length === 0 ? (
                <p className="text-gray-500 italic text-xs text-center py-4">No audio tracks found.</p>
            ) : (
                tracks.map((track, idx) => (
                    <button
                        key={track.id}
                        onClick={() => changeTrack(idx)}
                        className={`w-full text-left p-2 rounded text-xs transition-all flex items-center justify-between group ${
                            currentTrackIndex === idx 
                            ? 'bg-mag-accent/20 border border-mag-accent/50 text-white' 
                            : 'hover:bg-mag-light/30 text-mag-text/70'
                        }`}
                    >
                        <span className="truncate flex-1">{track.name}</span>
                        {currentTrackIndex === idx && isPlaying && (
                            <div className="w-2 h-2 rounded-full bg-mag-accent animate-pulse ml-2"></div>
                        )}
                    </button>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer (Right Column) */}
      <div className="flex-1 bg-mag-panel/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl flex flex-col md:overflow-hidden h-auto md:h-full min-h-[500px]">
        <div className="p-4 border-b border-white/10 flex items-center bg-black/20 sticky top-0 z-10 backdrop-blur-md">
             <FileText className="w-5 h-5 mr-2 text-mag-cyan" /> 
             <h3 className="text-lg font-serif text-mag-text">Documentation</h3>
        </div>
        
        <div className="flex-1 md:overflow-y-auto overflow-visible custom-scrollbar p-6 md:p-10 bg-gradient-to-br from-mag-panel/50 to-black/40">
            {docs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-mag-text/30 py-20">
                    <FileText size={64} className="mb-6 opacity-20" />
                    <p className="font-serif text-lg">No documentation files found.</p>
                </div>
            ) : (
                <div className="space-y-16 max-w-4xl mx-auto">
                    {docs.map((doc) => (
                        <div key={doc.id} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                            <div className="mb-8 pb-4 border-b border-mag-light/30 flex items-baseline justify-between">
                                <h2 className="text-3xl font-serif text-mag-cyan tracking-wide break-words">
                                    {cleanFileName(doc.name)}
                                </h2>
                                <span className="text-xs font-mono text-mag-text/40 border border-mag-text/20 px-2 py-0.5 rounded shrink-0 ml-2">
                                    MD
                                </span>
                            </div>
                            <div className="bg-black/20 p-4 md:p-8 rounded-lg border border-white/5 shadow-inner overflow-x-hidden">
                                <MarkdownViewer content={doc.content} />
                            </div>
                        </div>
                    ))}
                    
                    {/* Footer spacer */}
                    <div className="h-12 flex items-center justify-center text-mag-text/20 text-xs font-mono pt-8 border-t border-white/5">
                        END OF DOCUMENT
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-mag-text font-sans selection:bg-mag-accent selection:text-white relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#002838] via-[#001010] to-[#000000] -z-20"></div>
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 -z-10 mix-blend-overlay"></div>

      {/* Audio Element */}
      <audio 
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
        onError={() => alert("Error playing audio track.")}
      />

      <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
        {appState === AppState.LOGIN ? renderLogin() : (
           <>
              <header className="flex justify-between items-center mb-6 shrink-0 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center space-x-3">
                   <div className="w-3 h-10 bg-mag-accent rounded-sm shadow-[0_0_15px_rgba(236,29,37,0.5)]"></div>
                   <div>
                       <h1 className="text-2xl font-serif font-bold tracking-widest text-white leading-none">MAG</h1>
                       <span className="text-mag-cyan text-xs tracking-[0.3em] uppercase block">Audio System</span>
                   </div>
                </div>
                <div className="text-right hidden md:block">
                   <div className="text-xs text-mag-text/50 font-mono">FIRMWARE V2.4</div>
                   <div className={`text-xs font-mono font-bold flex items-center justify-end ${isPlaying ? 'text-green-500' : 'text-yellow-500'}`}>
                       <div className={`w-2 h-2 rounded-full mr-2 ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                       {isPlaying ? 'PLAYING' : 'STANDBY'}
                   </div>
                </div>
              </header>

              <main className="flex-1 min-h-0 flex flex-col justify-center relative">
                 {appState === AppState.PLAYER && renderPlayer()}
                 {appState === AppState.BROWSER && renderBrowser()}
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