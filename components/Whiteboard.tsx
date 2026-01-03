import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pencil, Eraser, Type, Square, Circle, Trash2, Download, Save,
  Palette, X, Move, Image as ImageIcon, FileVideo, FileText, Maximize2
} from 'lucide-react';
import { WhiteboardElement, GameFile, UserPresence } from '../types';
import { saveWhiteboard, loadWhiteboard, updatePresence, loadPresence } from '../services/magService';

interface WhiteboardProps {
  campaignName: string;
  currentUser: { id: string; name: string };
  availableFiles: GameFile[]; // Arquivos que o usuário pode anexar
  onSave: (imageData: string) => void;
  onExit: () => void;
}

type Tool = 'select' | 'pen' | 'eraser' | 'text' | 'rectangle' | 'circle' | 'move';

interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({
  campaignName,
  currentUser,
  availableFiles,
  onSave,
  onExit
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<{ x: number, y: number }[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [textInputPos, setTextInputPos] = useState({ x: 0, y: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [otherUsers, setOtherUsers] = useState<UserPresence[]>([]);
  const [myColor, setMyColor] = useState('#FF6B6B');

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#FFA500', '#800080'];

  // Debounce save (500ms para ser mais estável)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(0);
  const pendingSaveRef = useRef<boolean>(false);

  const debouncedSave = useCallback((elementsToSave: WhiteboardElement[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    pendingSaveRef.current = true;

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        await saveWhiteboard({
          campaign: campaignName,
          elements: elementsToSave,
        });
        lastSaveRef.current = Date.now();
        pendingSaveRef.current = false;
        console.log('[Whiteboard] Auto-save concluído com', elementsToSave.length, 'elementos');
      } catch (err) {
        console.error('[Whiteboard] Erro no auto-save:', err);
        pendingSaveRef.current = false;
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, [campaignName]);

  // Load initial whiteboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadWhiteboard(campaignName);
        if (data && data.elements) {
          setElements(data.elements);
        }
      } catch (err) {
        console.error('Erro ao carregar whiteboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [campaignName]);

  // Sincronização em tempo real (1000ms polling) - mais espaçado para estabilidade
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      // Não sincronizar se estiver desenhando ou salvando
      if (isDrawing || pendingSaveRef.current) {
        return;
      }

      try {
        const data = await loadWhiteboard(campaignName);
        if (data && data.elements) {
          setElements(currentElements => {
            // Se não há elementos locais, simplesmente usa os do servidor
            if (currentElements.length === 0) {
              return data.elements;
            }

            // Criar mapa de elementos locais por ID
            const localMap = new Map(currentElements.map(e => [e.id, e]));
            const serverMap = new Map(data.elements.map(e => [e.id, e]));

            // Começar com elementos do servidor
            const mergedElements = [...data.elements];

            // Adicionar elementos locais que são mais recentes ou não existem no servidor
            currentElements.forEach(localElement => {
              const serverElement = serverMap.get(localElement.id);

              if (!serverElement) {
                // Elemento existe apenas localmente
                const age = Date.now() - localElement.timestamp;
                // Manter elementos locais recentes (últimos 5 segundos)
                if (age < 5000) {
                  mergedElements.push(localElement);
                }
              } else if (localElement.timestamp > serverElement.timestamp) {
                // Elemento local é mais recente
                const index = mergedElements.findIndex(e => e.id === localElement.id);
                if (index >= 0) {
                  mergedElements[index] = localElement;
                }
              }
            });

            // Ordenar por timestamp
            mergedElements.sort((a, b) => a.timestamp - b.timestamp);

            // Evitar re-renderização desnecessária se os dados são idênticos
            if (JSON.stringify(currentElements) === JSON.stringify(mergedElements)) {
              return currentElements;
            }

            return mergedElements;
          });
        }
      } catch (err) {
        console.error('Erro ao sincronizar whiteboard:', err);
      }
    }, 1000); // Polling a cada 1 segundo

    return () => clearInterval(syncInterval);
  }, [campaignName, isDrawing]);

  // Auto-save periódico (a cada 3 segundos se houver mudanças pendentes)
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (pendingSaveRef.current && elements.length > 0 && !isDrawing && !isSaving) {
        console.log('[Whiteboard] Salvamento periódico forçado');
        debouncedSave(elements);
      }
    }, 3000);

    return () => clearInterval(autoSaveInterval);
  }, [elements, isDrawing, isSaving, debouncedSave]);

  // Atualizar presença do usuário (1000ms)
  useEffect(() => {
    const presenceInterval = setInterval(async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        await updatePresence(
          campaignName,
          currentUser.id,
          currentUser.name,
          rect.width / 2,
          rect.height / 2,
          selectedElementId || undefined,
          myColor
        );
      } catch (err) {
        console.error('Erro ao atualizar presença:', err);
      }
    }, 1000);

    return () => clearInterval(presenceInterval);
  }, [campaignName, currentUser, selectedElementId, myColor]);

  // Carregar presença de outros usuários (1500ms)
  useEffect(() => {
    const loadPresenceInterval = setInterval(async () => {
      try {
        const presence = await loadPresence(campaignName);
        if (presence && presence.users) {
          const others = presence.users.filter(u => u.userId !== currentUser.id);
          setOtherUsers(others);
        }
      } catch (err) {
        console.error('Erro ao carregar presença:', err);
      }
    }, 1500);

    return () => clearInterval(loadPresenceInterval);
  }, [campaignName, currentUser.id]);

  // Gerar cor única para o usuário
  useEffect(() => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
    ];

    let hash = 0;
    for (let i = 0; i < currentUser.id.length; i++) {
      hash = currentUser.id.charCodeAt(i) + ((hash << 5) - hash);
    }

    setMyColor(colors[Math.abs(hash) % colors.length]);
  }, [currentUser.id]);

  // Redraw canvas when elements or presence change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear and fill with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all elements
    elements.forEach(element => {
      drawElement(ctx, element);

      // Highlight se está sendo editado por outro usuário
      const editingUser = otherUsers.find(u => u.editingElementId === element.id);
      if (editingUser) {
        drawEditingIndicator(ctx, element, editingUser);
      }
    });

    // Draw selection box
    if (selectedElementId) {
      const element = elements.find(e => e.id === selectedElementId);
      if (element) {
        drawSelectionBox(ctx, element);
      }
    }

    // Draw other users' cursors
    otherUsers.forEach(user => {
      drawUserCursor(ctx, user);
    });
  }, [elements, selectedElementId, otherUsers]);

  const drawElement = (ctx: CanvasRenderingContext2D, element: WhiteboardElement) => {
    ctx.save();

    // Apply rotation if exists
    if (element.rotation && (element.x !== undefined && element.y !== undefined)) {
      ctx.translate(element.x, element.y);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.translate(-element.x, -element.y);
    }

    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;

    switch (element.type) {
      case 'path':
        if (element.data.points && element.data.points.length > 0) {
          ctx.lineWidth = element.data.lineWidth || 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(element.data.points[0].x, element.data.points[0].y);
          element.data.points.forEach((point: { x: number, y: number }) => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        }
        break;
      case 'text':
        ctx.font = `${element.data.fontSize || 20}px Arial`;
        ctx.fillText(element.data.text, element.x || element.data.x, element.y || element.data.y);
        break;
      case 'shape':
        ctx.lineWidth = element.data.lineWidth || 3;
        const shapeX = element.x || element.data.x;
        const shapeY = element.y || element.data.y;
        if (element.data.shapeType === 'rectangle') {
          const width = element.width || element.data.width;
          const height = element.height || element.data.height;
          ctx.strokeRect(shapeX, shapeY, width, height);
        } else if (element.data.shapeType === 'circle') {
          const radius = element.data.radius;
          ctx.beginPath();
          ctx.arc(shapeX, shapeY, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;
      case 'image':
      case 'video':
      case 'pdf':
        // Desenhar thumbnail ou placeholder
        const mediaWidth = element.width || 200;
        const mediaHeight = element.height || 150;
        const mediaX = element.x || 0;
        const mediaY = element.y || 0;

        // Background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(mediaX, mediaY, mediaWidth, mediaHeight);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(mediaX, mediaY, mediaWidth, mediaHeight);

        // Load and draw image if not loaded yet
        if (element.type === 'image' && element.data.url) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, mediaX, mediaY, mediaWidth, mediaHeight);
          };
          if (!img.src) img.src = element.data.url;
        } else {
          // Draw icon
          ctx.fillStyle = '#666';
          ctx.font = '48px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const icon = element.type === 'video' ? '▶' : element.type === 'pdf' ? '📄' : '🖼';
          ctx.fillText(icon, mediaX + mediaWidth / 2, mediaY + mediaHeight / 2);
          ctx.font = '12px Arial';
          ctx.fillText(element.data.name || 'Mídia', mediaX + mediaWidth / 2, mediaY + mediaHeight / 2 + 30);
        }
        break;
    }

    ctx.restore();
  };

  const drawSelectionBox = (ctx: CanvasRenderingContext2D, element: WhiteboardElement) => {
    const bounds = getElementBounds(element);
    if (!bounds) return;

    ctx.strokeStyle = myColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
    ctx.setLineDash([]);

    // Draw resize handles
    const handleSize = 8;
    ctx.fillStyle = myColor;
    const handles = [
      { x: bounds.x - handleSize / 2, y: bounds.y - handleSize / 2 }, // top-left
      { x: bounds.x + bounds.width - handleSize / 2, y: bounds.y - handleSize / 2 }, // top-right
      { x: bounds.x - handleSize / 2, y: bounds.y + bounds.height - handleSize / 2 }, // bottom-left
      { x: bounds.x + bounds.width - handleSize / 2, y: bounds.y + bounds.height - handleSize / 2 }, // bottom-right
    ];
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
    });
  };

  const drawEditingIndicator = (ctx: CanvasRenderingContext2D, element: WhiteboardElement, user: UserPresence) => {
    const bounds = getElementBounds(element);
    if (!bounds) return;

    // Outline colorido
    ctx.strokeStyle = user.color;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6);

    // Badge com nome
    ctx.fillStyle = user.color;
    ctx.fillRect(bounds.x, bounds.y - 25, ctx.measureText(user.userName).width + 10, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText(user.userName, bounds.x + 5, bounds.y - 10);
  };

  const drawUserCursor = (ctx: CanvasRenderingContext2D, user: UserPresence) => {
    // Draw cursor pointer
    ctx.fillStyle = user.color;
    ctx.beginPath();
    ctx.moveTo(user.cursorX, user.cursorY);
    ctx.lineTo(user.cursorX + 12, user.cursorY + 12);
    ctx.lineTo(user.cursorX + 6, user.cursorY + 12);
    ctx.lineTo(user.cursorX, user.cursorY + 18);
    ctx.closePath();
    ctx.fill();

    // Draw name label
    ctx.fillStyle = user.color;
    const labelWidth = ctx.measureText(user.userName).width + 10;
    ctx.fillRect(user.cursorX + 15, user.cursorY, labelWidth, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText(user.userName, user.cursorX + 20, user.cursorY + 14);
  };

  const getElementBounds = (element: WhiteboardElement): SelectionBox | null => {
    switch (element.type) {
      case 'path':
        if (!element.data.points || element.data.points.length === 0) return null;
        const xs = element.data.points.map((p: { x: number }) => p.x);
        const ys = element.data.points.map((p: { y: number }) => p.y);
        return {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        };
      case 'text':
        const x = element.x || element.data.x;
        const y = element.y || element.data.y;
        const fontSize = element.data.fontSize || 20;
        const textWidth = element.data.text.length * fontSize * 0.6;
        return { x, y: y - fontSize, width: textWidth, height: fontSize };
      case 'shape':
        if (element.data.shapeType === 'rectangle') {
          return {
            x: element.x || element.data.x,
            y: element.y || element.data.y,
            width: element.width || element.data.width,
            height: element.height || element.data.height,
          };
        } else if (element.data.shapeType === 'circle') {
          const cx = element.x || element.data.x;
          const cy = element.y || element.data.y;
          const r = element.data.radius;
          return { x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
        }
        break;
      case 'image':
      case 'video':
      case 'pdf':
        return {
          x: element.x || 0,
          y: element.y || 0,
          width: element.width || 200,
          height: element.height || 150,
        };
    }
    return null;
  };

  const isPointInElement = (x: number, y: number, element: WhiteboardElement): boolean => {
    const bounds = getElementBounds(element);
    if (!bounds) return false;
    return x >= bounds.x && x <= bounds.x + bounds.width &&
      y >= bounds.y && y <= bounds.y + bounds.height;
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);

    if (currentTool === 'select' || currentTool === 'move') {
      // Check if clicking on existing element
      const clickedElement = [...elements].reverse().find(el => isPointInElement(coords.x, coords.y, el));

      if (clickedElement) {
        setSelectedElementId(clickedElement.id);
        if (currentTool === 'move') {
          const bounds = getElementBounds(clickedElement);
          if (bounds) {
            setDragOffset({
              x: coords.x - bounds.x,
              y: coords.y - bounds.y,
            });
            setIsDrawing(true);
          }
        }
        // Marcar como sendo editado
        updatePresence(
          campaignName,
          currentUser.id,
          currentUser.name,
          coords.x,
          coords.y,
          clickedElement.id,
          myColor
        );
      } else {
        setSelectedElementId(null);
      }
      return;
    }

    setIsDrawing(true);
    setStartPos(coords);

    if (currentTool === 'pen' || currentTool === 'eraser') {
      setCurrentPath([coords]);
    } else if (currentTool === 'text') {
      setTextInputPos(coords);
      setTextInputValue('');
      setShowTextInput(true);
      setIsDrawing(false);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const coords = getCoordinates(e);

    if (currentTool === 'move' && selectedElementId) {
      // Move selected element
      setElements(prev => prev.map(el => {
        if (el.id === selectedElementId) {
          const bounds = getElementBounds(el);
          if (bounds) {
            const newX = coords.x - dragOffset.x;
            const newY = coords.y - dragOffset.y;

            if (el.type === 'path') {
              const dx = newX - bounds.x;
              const dy = newY - bounds.y;
              return {
                ...el,
                data: {
                  ...el.data,
                  points: el.data.points.map((p: { x: number, y: number }) => ({
                    x: p.x + dx,
                    y: p.y + dy,
                  })),
                },
                timestamp: Date.now(),
              };
            } else {
              return { ...el, x: newX, y: newY, timestamp: Date.now() };
            }
          }
        }
        return el;
      }));
    } else if (currentTool === 'pen' || currentTool === 'eraser') {
      setCurrentPath(prev => [...prev, coords]);
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);

    const coords = getCoordinates(e);

    if (currentTool === 'move' && selectedElementId) {
      // Save after moving - usar setTimeout para garantir que state foi atualizado
      setTimeout(() => {
        setElements(currentElements => {
          debouncedSave(currentElements);
          return currentElements;
        });
      }, 0);
      return;
    }

    if (currentTool === 'pen' || currentTool === 'eraser') {
      if (currentPath.length > 0) {
        const newElement: WhiteboardElement = {
          id: crypto.randomUUID(),
          type: 'path',
          data: {
            points: currentPath,
            lineWidth: currentTool === 'eraser' ? lineWidth * 3 : lineWidth,
          },
          color: currentTool === 'eraser' ? '#ffffff' : currentColor,
          timestamp: Date.now(),
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        setCurrentPath([]);
        debouncedSave(newElements);
      }
    } else if (currentTool === 'rectangle' && startPos) {
      const newElement: WhiteboardElement = {
        id: crypto.randomUUID(),
        type: 'shape',
        data: {
          shapeType: 'rectangle',
          x: Math.min(startPos.x, coords.x),
          y: Math.min(startPos.y, coords.y),
          width: Math.abs(coords.x - startPos.x),
          height: Math.abs(coords.y - startPos.y),
          lineWidth,
        },
        x: Math.min(startPos.x, coords.x),
        y: Math.min(startPos.y, coords.y),
        width: Math.abs(coords.x - startPos.x),
        height: Math.abs(coords.y - startPos.y),
        color: currentColor,
        timestamp: Date.now(),
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      debouncedSave(newElements);
    } else if (currentTool === 'circle' && startPos) {
      const radius = Math.sqrt(
        Math.pow(coords.x - startPos.x, 2) + Math.pow(coords.y - startPos.y, 2)
      );
      const newElement: WhiteboardElement = {
        id: crypto.randomUUID(),
        type: 'shape',
        data: {
          shapeType: 'circle',
          x: startPos.x,
          y: startPos.y,
          radius,
          lineWidth,
        },
        x: startPos.x,
        y: startPos.y,
        color: currentColor,
        timestamp: Date.now(),
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      debouncedSave(newElements);
    }
  };

  const handleTextSubmit = () => {
    if (textInputValue.trim()) {
      const newElement: WhiteboardElement = {
        id: crypto.randomUUID(),
        type: 'text',
        data: {
          text: textInputValue,
          x: textInputPos.x,
          y: textInputPos.y,
          fontSize: lineWidth * 6,
        },
        x: textInputPos.x,
        y: textInputPos.y,
        color: currentColor,
        timestamp: Date.now(),
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      debouncedSave(newElements);
    }
    setShowTextInput(false);
    setTextInputValue('');
  };

  const handleAddMedia = (file: GameFile) => {
    const newElement: WhiteboardElement = {
      id: crypto.randomUUID(),
      type: file.type === 'audio' ? 'image' : file.type as 'image' | 'video' | 'pdf',
      data: {
        url: file.content,
        name: file.name,
        fileId: file.id,
      },
      x: 50,
      y: 50,
      width: 200,
      height: 150,
      color: currentColor,
      timestamp: Date.now(),
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    setShowMediaPicker(false);
    debouncedSave(newElements);
  };

  const handleDeleteSelected = () => {
    if (selectedElementId) {
      const newElements = elements.filter(e => e.id !== selectedElementId);
      setElements(newElements);
      setSelectedElementId(null);
      debouncedSave(newElements);
    }
  };

  const handleClear = () => {
    setElements([]);
    setSelectedElementId(null);
    setShowClearConfirm(false);
    debouncedSave([]);
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL('image/png');
    onSave(imageData);
    setSaveMessage('✓ Salvo!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${campaignName}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-white text-xl">Carregando quadro branco...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Header */}
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Sair"
          >
            <X size={20} />
          </button>
          <h2 className="text-lg font-semibold">{campaignName} - Quadro Branco</h2>
          {isSaving && <span className="text-xs text-yellow-400">Salvando...</span>}
          {saveMessage && <span className="text-xs text-green-400">{saveMessage}</span>}
        </div>

        {/* User presence indicators */}
        <div className="flex items-center gap-2">
          {otherUsers.length > 0 && (
            <div className="flex items-center gap-1">
              {otherUsers.map(user => (
                <div
                  key={user.userId}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold"
                  style={{ backgroundColor: user.color }}
                  title={user.userName}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-800 text-white px-4 py-2 flex items-center gap-2 border-b border-gray-700 flex-wrap">
        {/* Tools */}
        <div className="flex gap-1 border-r border-gray-700 pr-2">
          <button
            onClick={() => setCurrentTool('select')}
            className={`p-2 rounded ${currentTool === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Selecionar (clique para selecionar objetos)"
          >
            <Move size={18} />
          </button>
          <button
            onClick={() => setCurrentTool('move')}
            className={`p-2 rounded ${currentTool === 'move' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Mover (arraste para mover objetos)"
          >
            <Maximize2 size={18} />
          </button>
          <button
            onClick={() => setCurrentTool('pen')}
            className={`p-2 rounded ${currentTool === 'pen' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Caneta"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => setCurrentTool('eraser')}
            className={`p-2 rounded ${currentTool === 'eraser' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Borracha"
          >
            <Eraser size={18} />
          </button>
          <button
            onClick={() => setCurrentTool('text')}
            className={`p-2 rounded ${currentTool === 'text' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Texto"
          >
            <Type size={18} />
          </button>
          <button
            onClick={() => setCurrentTool('rectangle')}
            className={`p-2 rounded ${currentTool === 'rectangle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Retângulo"
          >
            <Square size={18} />
          </button>
          <button
            onClick={() => setCurrentTool('circle')}
            className={`p-2 rounded ${currentTool === 'circle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
            title="Círculo"
          >
            <Circle size={18} />
          </button>
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-2 border-r border-gray-700 pr-2">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded hover:bg-gray-700"
            title="Cor"
          >
            <Palette size={18} />
          </button>
          <div
            className="w-6 h-6 rounded border-2 border-white cursor-pointer"
            style={{ backgroundColor: currentColor }}
            onClick={() => setShowColorPicker(!showColorPicker)}
          />
        </div>

        {/* Line width */}
        <div className="flex items-center gap-2 border-r border-gray-700 pr-2">
          <span className="text-xs">Espessura:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-xs w-6">{lineWidth}</span>
        </div>

        {/* Media */}
        <button
          onClick={() => setShowMediaPicker(true)}
          className="p-2 rounded hover:bg-gray-700"
          title="Adicionar mídia"
        >
          <ImageIcon size={18} />
        </button>

        {/* Actions */}
        <div className="flex gap-1 border-l border-gray-700 pl-2 ml-auto">
          {selectedElementId && (
            <button
              onClick={handleDeleteSelected}
              className="p-2 rounded hover:bg-red-600"
              title="Deletar selecionado"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-2 rounded hover:bg-red-600"
            title="Limpar tudo"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={downloadCanvas}
            className="p-2 rounded hover:bg-gray-700"
            title="Baixar como imagem"
          >
            <Download size={18} />
          </button>
          <button
            onClick={saveCanvas}
            className="p-2 rounded hover:bg-green-600"
            title="Salvar imagem"
          >
            <Save size={18} />
          </button>
        </div>
      </div>

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="absolute top-24 left-4 bg-gray-800 p-4 rounded-lg shadow-xl z-10 border border-gray-700">
          <div className="grid grid-cols-5 gap-2 mb-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => {
                  setCurrentColor(color);
                  setShowColorPicker(false);
                }}
                className="w-8 h-8 rounded border-2 border-white hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-full h-8 cursor-pointer"
          />
        </div>
      )}

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-white text-lg font-semibold mb-4">Digite o texto</h3>
            <input
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded mb-4"
              placeholder="Digite aqui..."
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowTextInput(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleTextSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-white text-lg font-semibold mb-4">Limpar tudo?</h3>
            <p className="text-gray-300 mb-6">
              Isso vai apagar todos os elementos do quadro branco. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Adicionar Mídia</h3>
              <button
                onClick={() => setShowMediaPicker(false)}
                className="p-2 hover:bg-gray-700 rounded"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {availableFiles.map(file => (
                  <button
                    key={file.id}
                    onClick={() => handleAddMedia(file)}
                    className="bg-gray-700 p-4 rounded hover:bg-gray-600 text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {file.type === 'video' && <FileVideo size={20} className="text-purple-400" />}
                      {file.type === 'document' && <FileText size={20} className="text-blue-400" />}
                      {file.type === 'audio' && <ImageIcon size={20} className="text-green-400" />}
                    </div>
                    <div className="text-white text-sm font-medium truncate">{file.name}</div>
                    <div className="text-gray-400 text-xs">{file.folder}</div>
                  </button>
                ))}
              </div>
              {availableFiles.length === 0 && (
                <div className="text-gray-400 text-center py-8">
                  Nenhum arquivo disponível
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
};
