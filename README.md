<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/14IodcobjTx44yBZ9ZLTD3M3tUickYzKJ

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

# Vercel Blob: Upload e Gestão de Arquivos

Este app integra o Vercel Blob para upload de áudios (.mp3/.wav) e documentos (.md), associados a campanhas com permissões por usuário.

## ⚠️ CONFIGURAÇÃO OBRIGATÓRIA

### 1. Criar Blob Store na Vercel

1. Acesse seu projeto na [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em **Storage** > **Create Database** > **Blob**
3. Nomeie o store (ex: "mag-files")
4. Copie o token gerado automaticamente (`BLOB_READ_WRITE_TOKEN`)

### 2. Configurar Variável de Ambiente

**Na Vercel (Produção):**

- Vá em **Settings** > **Environment Variables**
- Adicione: `BLOB_READ_WRITE_TOKEN` = `vercel_blob_rw_...`
- Marque: Production, Preview, Development

**Local (.env.local):**

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Ou use o CLI da Vercel:

```bash
vercel env pull
```

## Endpoints da API

### POST /api/upload

Upload server-side direto para o Blob

- **Body:** `multipart/form-data`
  - `campaign`, `folder`, `filename`, `contentType`, `file`
- **Retorna:** `{ url, pathname }`

### POST /api/save-file

Persiste metadados em `index.json` por campanha

- **Body:** `{ record: { id, name, type, campaign, folder, url, allowedUserIds } }`
- **Retorna:** `{ ok: true }`

### GET /api/list-files?campaign={slug}

Lista arquivos via índices

- **Query:** `campaign` (opcional)
- **Retorna:** `{ files: GameFile[] }`

### POST /api/upload-client

Client upload via `@vercel/blob/client` (arquivos grandes)

## Troubleshooting

### ❌ Upload não funciona na Vercel

1. **Verificar token:** Abra Vercel Dashboard > Settings > Environment Variables

   - Confirme que `BLOB_READ_WRITE_TOKEN` existe
   - Redeploy após adicionar variável

2. **Verificar logs no navegador:**

   - Abra DevTools (F12) > Console
   - Tente fazer upload
   - Veja erros detalhados

3. **Verificar logs da função:**

   - Vercel Dashboard > Deployments > Logs
   - Procure por "Upload error" ou "Save metadata error"

4. **Testar endpoint manualmente:**

```bash
curl -X GET https://seu-app.vercel.app/api/list-files
```

### Erros Comuns

| Erro                   | Causa                  | Solução                                |
| ---------------------- | ---------------------- | -------------------------------------- |
| "Missing file blob"    | FormData incorreto     | Verificar AdminPanel.tsx               |
| "Upload failed"        | Token inválido/ausente | Adicionar `BLOB_READ_WRITE_TOKEN`      |
| "Failed to save index" | Sem permissão Write    | Verificar token Read/Write             |
| 405 Method Not Allowed | Export incorreto       | Verificar `export { handler as POST }` |

## Desenvolvimento Local

```bash
npm install
vercel env pull          # Baixa variáveis de ambiente
npm run dev             # Roda em http://localhost:5173
```

**Nota:** Client upload callback não funciona em localhost. Use [ngrok](https://ngrok.com) para testes completos.
