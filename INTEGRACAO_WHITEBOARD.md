// filepath: d:\dev\Mag_aps\INTEGRACAO_WHITEBOARD.md

# Guia Rápido de Integração do Whiteboard

## ⚡ Integração Rápida (5 minutos)

### Opção 1: Adicionar no AdminPanel

Abra `components/AdminPanel.tsx` e adicione o whiteboard na seção de gerenciamento:

```tsx
// No topo do arquivo, adicionar import:
import { Whiteboard } from "./Whiteboard";

// Dentro do componente, adicionar estado:
const [showWhiteboard, setShowWhiteboard] = useState(false);

// No JSX, adicionar botão na seção de Campanhas:
<button
  onClick={() => setShowWhiteboard(!showWhiteboard)}
  className="px-4 py-2 bg-mag-cyan/20 text-mag-cyan rounded"
>
  {showWhiteboard ? "Ocultar" : "Mostrar"} Whiteboard
</button>;

// E renderizar o whiteboard:
{
  showWhiteboard && selectedCampaign && (
    <div className="mt-6">
      <Whiteboard campaign={selectedCampaign} readOnly={false} />
    </div>
  );
}
```

### Opção 2: Adicionar no Browser (para todos os usuários)

Abra `App.tsx` e adicione no `renderBrowser()`:

```tsx
// Import no topo:
import { Whiteboard } from "./components/Whiteboard";

// Dentro do renderBrowser, adicione uma nova coluna:
{
  selectedCampaign && (
    <div className="w-full lg:w-96 shrink-0">
      <Whiteboard
        campaign={selectedCampaign}
        readOnly={currentUser?.role !== "admin"}
      />
    </div>
  );
}
```

### Opção 3: Adicionar como Modal

```tsx
// Estado para controlar modal:
const [whiteboardOpen, setWhiteboardOpen] = useState(false);

// Botão para abrir:
<button onClick={() => setWhiteboardOpen(true)}>Abrir Whiteboard</button>;

// Modal:
{
  whiteboardOpen && (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-mag-dark max-w-4xl w-full max-h-[90vh] overflow-auto rounded-xl">
        <div className="p-4 flex justify-between items-center border-b border-white/10">
          <h2 className="text-xl font-serif text-white">Whiteboard</h2>
          <button onClick={() => setWhiteboardOpen(false)}>✕</button>
        </div>
        <div className="p-4">
          <Whiteboard campaign={selectedCampaign || "default"} />
        </div>
      </div>
    </div>
  );
}
```

## 📦 Deploy

```bash
# 1. Adicionar arquivos
git add .

# 2. Commit
git commit -m "feat: Adicionar whiteboard com polling para realtime"

# 3. Push para Vercel
git push
```

## ✅ Verificação Pós-Deploy

1. Abrir app no Vercel: `https://mag-aps.vercel.app`
2. Abrir Console (F12)
3. Verificar que **NÃO** aparece mais:
   - ❌ `Failed to load resource: 500`
   - ❌ `[SSE] Erro na conexão`
4. Verificar que aparece:
   - ✅ Whiteboard renderizado
   - ✅ Polling funcionando (a cada 5s)
   - ✅ Elementos salvam e carregam corretamente

## 🔧 Customização

### Mudar Intervalo de Polling

Arquivo: `hooks/useWhiteboard.ts` (linha ~61)

```tsx
// Padrão: 5 segundos
setInterval(() => {
  fetchData();
}, 5000);

// Para 2 segundos (mais rápido):
setInterval(() => {
  fetchData();
}, 2000);

// Para 10 segundos (mais econômico):
setInterval(() => {
  fetchData();
}, 10000);
```

### Adicionar Novos Tipos de Elementos

Arquivo: `hooks/useWhiteboard.ts`

```tsx
export interface WhiteboardElement {
  id: string;
  type: "text" | "draw" | "shape" | "image" | "link"; // Adicionar novos tipos
  x: number;
  y: number;
  data: any;
}
```

### Estilizar Elementos

Arquivo: `components/Whiteboard.tsx` (linha ~67)

```tsx
<div
  key={element.id}
  className="bg-mag-light/20 rounded p-3 border border-mag-cyan/20 hover:border-mag-cyan transition-all"
  style={{
    transform: `translate(${element.x}px, ${element.y}px)`,
    // Adicionar seus estilos:
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    backdropFilter: 'blur(10px)',
  }}
>
```

## 🎨 Melhorias Futuras (Opcional)

### 1. Arrastar e Soltar

```bash
npm install react-draggable
```

```tsx
import Draggable from "react-draggable";

<Draggable>
  <div className="whiteboard-element">{element.data.text}</div>
</Draggable>;
```

### 2. Editor de Markdown

```bash
npm install react-simplemde-editor
```

### 3. Desenho à Mão Livre

```bash
npm install react-canvas-draw
```

### 4. Realtime com Supabase (latência < 1s)

```bash
npm install @supabase/realtime-js
```

```tsx
import { RealtimeChannel } from "@supabase/realtime-js";

const channel: RealtimeChannel = supabase
  .channel(`whiteboard:${campaign}`)
  .on("broadcast", { event: "update" }, (payload) => {
    setData(payload.data);
  })
  .subscribe();
```

## 🐛 Debug

### Logs no Console

```tsx
// Em useWhiteboard.ts, adicionar logs:
console.log("[Whiteboard] Fetching data for:", campaign);
console.log("[Whiteboard] Data received:", newData);
console.log("[Whiteboard] Error:", error);
```

### Verificar Chamadas de API

1. Abrir DevTools (F12)
2. Aba Network
3. Filtrar por "whiteboard"
4. Ver requests GET/POST
5. Ver status codes e responses

## 💡 Dicas

- **Mestre vê e edita** tudo no whiteboard
- **Jogadores** veem em tempo real (read-only)
- **Dados persistem** no Supabase Storage
- **Funciona offline** (salva ao reconectar)
- **Multi-campanha**: cada campanha tem seu whiteboard

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs no console do browser
2. Verificar logs no Vercel Dashboard
3. Testar localmente com `npm run dev`
4. Verificar permissões do Supabase Storage
