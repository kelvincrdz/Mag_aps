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

## Pré-requisitos

- Deploy na Vercel
- Variável `BLOB_READ_WRITE_TOKEN` configurada (token RW do Blob)
- Dependência `@vercel/blob` instalada

## Endpoints

- POST /api/upload-url

  - Body: `{ campaign, folder, filename, allowedContentTypes }`
  - Resposta: `{ uploadUrl, blobPath }`

- POST /api/save-file

  - Body: `{ record: { id, name, type, campaign, folder, url, allowedUserIds } }`
  - Resposta: `{ ok: true }`

- GET /api/list-files?campaign={opcional}
  - Sem parâmetro: lista todos
  - Com `campaign` (slug): lista apenas daquela campanha

## Fluxo (Painel do Mestre)

1. Solicitar `uploadUrl` ao backend
2. Fazer `PUT` do arquivo para o Blob
3. Persistir metadados via `save-file`
4. Recarregar listagem via `list-files`

Observação: Em desenvolvimento local, endpoints `api/` funcionam melhor após deploy na Vercel.
