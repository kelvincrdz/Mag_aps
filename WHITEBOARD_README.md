# Whiteboard em Tempo Real - Solução Vercel

## Problema Original

O erro que você estava enfrentando:

```
Failed to load resource: the server responded with a status of 500 ()
[SSE] Erro na conexão
[SSE] Tentando reconectar...
```

## Causa do Problema

O **Server-Sent Events (SSE)** tem limitações significativas no Vercel:

1. **Timeout de 30 segundos**: Edge Functions no Vercel (plano gratuito) têm limite de 30 segundos
2. **Não persistente**: Conexões SSE são encerradas após o timeout
3. **Problemas com reconexão**: Reconexões frequentes causam instabilidade
4. **Cold starts**: Funções serverless podem ter latência inicial

## Solução Implementada

### 1. API de Whiteboard com Polling (`api/whiteboard-data.ts`)

- **GET**: Busca dados do whiteboard
- **POST**: Salva/atualiza dados do whiteboard
- Usa **Supabase Storage** para persistência
- Mais confiável que SSE no Vercel

### 2. Hook React (`hooks/useWhiteboard.ts`)

```tsx
const { data, loading, error, saveData, refreshData } = useWhiteboard(
  campaign,
  true
);
```

Recursos:

- Polling automático a cada 5 segundos
- Detecção de mudanças (só atualiza se houver alteração)
- Gerenciamento de estado (loading, error)
- Função de save e refresh manual

### 3. Componente Whiteboard (`components/Whiteboard.tsx`)

Interface pronta para uso com:

- Adição de notas de texto
- Limpeza do whiteboard
- Atualização automática
- Tratamento de erros
- UI integrada com o tema MAG

## Como Usar

### 1. Instalar no seu App.tsx

```tsx
import { Whiteboard } from "./components/Whiteboard";

// Dentro do seu componente, adicione onde quiser:
<Whiteboard
  campaign={selectedCampaign || "default"}
  readOnly={currentUser?.role !== "admin"}
/>;
```

### 2. Exemplo de Uso no AdminPanel

```tsx
// Em AdminPanel.tsx, adicione uma nova aba:
const [showWhiteboard, setShowWhiteboard] = useState(false);

// No JSX:
{
  showWhiteboard && selectedCampaign && (
    <div className="mt-4">
      <Whiteboard campaign={selectedCampaign} readOnly={false} />
    </div>
  );
}
```

### 3. Para Jogadores (Read-only)

```tsx
<Whiteboard campaign={selectedCampaign} readOnly={true} />
```

## Arquivos Criados

1. ✅ `/api/whiteboard-stream.ts` - Endpoint SSE (limitado, backup)
2. ✅ `/api/whiteboard-data.ts` - Endpoint polling (recomendado)
3. ✅ `/hooks/useWhiteboard.ts` - Hook React com polling
4. ✅ `/components/Whiteboard.tsx` - Componente UI
5. ✅ `vercel.json` - Configuração atualizada

## Alternativas Avançadas

Se precisar de **tempo real verdadeiro** (< 1 segundo de latência):

### Opção 1: Supabase Realtime (Recomendado)

```bash
npm install @supabase/realtime-js
```

Vantagens:

- WebSocket persistente
- Latência < 100ms
- Suporte nativo no Supabase
- Sem limite de tempo

### Opção 2: Pusher / Ably

- Serviços dedicados para tempo real
- Mais confiável que SSE
- Planos gratuitos disponíveis

### Opção 3: Firebase Realtime Database

- WebSocket nativo
- Sincronização automática
- Offline-first

## Performance

### Polling Atual (5 segundos)

- ✅ Confiável no Vercel
- ✅ Não consome recursos excessivos
- ✅ Funciona em todos os browsers
- ⚠️ Latência de até 5 segundos

### Para Reduzir Latência

```typescript
// Em useWhiteboard.ts, linha do setInterval:
setInterval(() => {
  fetchData();
}, 2000); // Mudar de 5000 para 2000 (2 segundos)
```

⚠️ **Atenção**: Polling muito rápido pode causar rate limiting no Vercel

## Próximos Passos

1. **Deploy no Vercel**:

   ```bash
   git add .
   git commit -m "Fix: Adicionar whiteboard com polling"
   git push
   ```

2. **Testar em Produção**:

   - Abrir o app no Vercel
   - Verificar que não há mais erro 500
   - Testar adição de elementos

3. **Opcional - Migrar para Supabase Realtime**:
   - Se precisar de latência menor
   - Implementar WebSocket ao invés de polling

## Troubleshooting

### Erro persiste após deploy

- Verificar logs no Vercel Dashboard
- Confirmar que todos os arquivos foram commitados
- Limpar cache do browser (Ctrl+Shift+R)

### Dados não sincronizam

- Verificar permissões do Supabase Storage
- Confirmar que o bucket 'mag-files' está público
- Verificar console do browser para erros

### Polling muito lento

- Reduzir intervalo no useWhiteboard.ts (linha 61)
- Considerar usar Supabase Realtime

## Contato

Para dúvidas sobre implementação, consulte:

- Documentação Vercel: https://vercel.com/docs/functions/edge-functions
- Documentação Supabase: https://supabase.com/docs/guides/storage
