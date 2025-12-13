# MAG Player

Aplicação web em React + Vite para carregar arquivos `.mag`/`.zip` contendo faixas de áudio e documentos Markdown, com visual de toca-fitas e leitor de documentos embutido.

## Recursos

- **Login local:** proteção por código de acesso definido em `types.ts`.
- **Player de áudio:** play/pause, avançar/retroceder, seleção de faixa, progresso.
- **Leitor Markdown:** renderização com `react-markdown` + `remark-gfm`.
- **Suporte a `.mag`/`.zip`:** leitura de áudio (`mp3`, `wav`, `ogg`, `m4a`, `aac`, `flac`, `oga`) e `.md` diretamente do pacote via `jszip`.

## Pré-requisitos

- Node.js 18+ (recomendado) e npm.

## Instalação e execução (local)

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite (geralmente http://localhost:5173).

## Código de acesso (login)

- O código é definido em `types.ts` na constante `ACCESS_CODE`.
- Padrão atual: `ORC/DDAE-11.25`.

## Build de produção

```bash
npm run build
npm run preview
```

O build gera a pasta `dist`. O `preview` serve a compilação para conferência local.

## Deploy na Vercel

- Configure o projeto com:
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Install Command: `npm install`
- Observações importantes:
  - O arquivo `index.html` não deve usar import maps para CDN de libs (React, Vite, etc.). O Vite bundle já inclui as dependências locais do `package.json`.
  - Caso tenha usado import maps anteriormente, eles foram removidos em `index.html` para evitar conflito de versões no deploy.

## Estrutura do projeto

- `App.tsx`: layout principal, login, player, browser de documentos.
- `components/`: `Cassette.tsx`, `MarkdownViewer.tsx`.
- `services/magService.ts`: leitura e processamento de `.mag`/`.zip` com `jszip`.
- `index.tsx` e `index.html`: ponto de entrada da aplicação.
- `types.ts`: tipos e `ACCESS_CODE`.
- `vite.config.ts`: configuração mínima do Vite.

## Dicas de troubleshooting

- Se a tela de login não renderizar no deploy:
  - Verifique se não existem import maps externos em `index.html`.
  - Confira o console do navegador por erros de runtime (F12 → Console).
  - Garanta que o Node da Vercel esteja em versão compatível (Node 18+).
- Se o áudio não tocar:
  - Verifique suporte do formato de arquivo no navegador.
  - Cheque se o `.mag`/`.zip` contém arquivos válidos.

## Licença

Projeto acadêmico/demonstrativo. Ajuste conforme sua necessidade.
