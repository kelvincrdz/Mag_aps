import React, { useState } from 'react';
import { useWhiteboard, WhiteboardElement } from '../hooks/useWhiteboard';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';

interface WhiteboardProps {
    campaign: string;
    readOnly?: boolean;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ campaign, readOnly = false }) => {
    const { data, loading, error, saveData, refreshData } = useWhiteboard(campaign, true);
    const [localText, setLocalText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleAddText = async () => {
        if (!localText.trim()) return;

        const newElement: WhiteboardElement = {
            id: crypto.randomUUID(),
            type: 'text',
            x: Math.random() * 200,
            y: Math.random() * 200,
            data: { text: localText },
        };

        try {
            setIsSaving(true);
            await saveData({
                elements: [...data.elements, newElement],
            });
            setLocalText('');
        } catch (err) {
            console.error('Erro ao adicionar texto:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = async () => {
        if (!confirm('Limpar todo o whiteboard?')) return;

        try {
            setIsSaving(true);
            await saveData({ elements: [] });
        } catch (err) {
            console.error('Erro ao limpar:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-mag-panel/50 rounded-lg border border-white/10 p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-lg font-serif text-mag-cyan">Whiteboard: {campaign}</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshData}
                        disabled={loading}
                        className="p-2 rounded hover:bg-mag-light/20 text-mag-text/70 hover:text-mag-cyan disabled:opacity-50"
                        title="Atualizar"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-mag-accent/10 border border-mag-accent/30 rounded p-3 flex items-start gap-2 text-sm">
                    <AlertCircle size={16} className="text-mag-accent mt-0.5 shrink-0" />
                    <div>
                        <div className="font-bold text-mag-accent">Erro de Conexão</div>
                        <div className="text-mag-text/70">{error}</div>
                        <div className="text-xs text-mag-text/50 mt-1">
                            Tentando reconectar automaticamente...
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="min-h-[300px] bg-black/30 rounded-lg border border-white/5 p-4 relative">
                {loading && data.elements.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mag-cyan"></div>
                    </div>
                )}

                {data.elements.length === 0 && !loading && (
                    <div className="text-center text-mag-text/30 py-12">
                        <p className="text-lg mb-2">Whiteboard vazio</p>
                        <p className="text-sm">Adicione elementos abaixo</p>
                    </div>
                )}

                {/* Render Elements */}
                <div className="space-y-2">
                    {data.elements.map((element) => (
                        <div
                            key={element.id}
                            className="bg-mag-light/20 rounded p-3 border border-mag-cyan/20"
                            style={{
                                transform: `translate(${element.x}px, ${element.y}px)`,
                            }}
                        >
                            {element.type === 'text' && (
                                <p className="text-sm text-mag-text">{element.data.text}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls (only if not readOnly) */}
            {!readOnly && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={localText}
                        onChange={(e) => setLocalText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                        placeholder="Digite uma nota..."
                        className="flex-1 bg-black/30 border border-mag-light/30 rounded px-3 py-2 text-sm focus:border-mag-cyan focus:outline-none"
                        disabled={isSaving}
                    />
                    <button
                        onClick={handleAddText}
                        disabled={isSaving || !localText.trim()}
                        className="px-4 py-2 bg-mag-cyan/20 hover:bg-mag-cyan/30 text-mag-cyan rounded disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save size={16} />
                        Adicionar
                    </button>
                    <button
                        onClick={handleClear}
                        disabled={isSaving || data.elements.length === 0}
                        className="px-4 py-2 bg-mag-accent/20 hover:bg-mag-accent/30 text-mag-accent rounded disabled:opacity-50"
                    >
                        Limpar
                    </button>
                </div>
            )}

            {/* Status */}
            <div className="text-xs text-mag-text/40 text-center">
                {data.timestamp > 0 && (
                    <span>Última atualização: {new Date(data.timestamp).toLocaleTimeString('pt-BR')}</span>
                )}
                {loading && <span className="ml-2">(Atualizando...)</span>}
            </div>
        </div>
    );
};
