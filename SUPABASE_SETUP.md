# Configuração do Supabase Storage

## ⚙️ Configuração do Bucket

Para que o upload funcione, você precisa ter um bucket público no Supabase:

### 1. Acesse o Dashboard do Supabase

https://gmpavmyhfjfbqnggyrds.supabase.co

### 2. Vá em Storage → Create a new bucket

### 3. Configure o bucket:

- **Nome**: `mag-files`
- **Public bucket**: ✅ Marque como público
- **File size limit**: Deixe o padrão ou aumente se necessário

### 4. Configurar Políticas de Acesso (RLS)

Após criar o bucket, você precisa adicionar políticas para permitir uploads e leituras públicas:

```sql
-- Permitir leitura pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'mag-files' );

-- Permitir upload público (todos podem enviar)
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'mag-files' );

-- Permitir atualização pública (para upsert do index.json)
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'mag-files' );
```

### 5. Estrutura de Arquivos

Os arquivos serão organizados assim:

```
mag-files/
├── campaigns/
│   ├── campanha-1/
│   │   ├── index.json          # Metadados dos arquivos da campanha
│   │   ├── depoimentos/
│   │   │   ├── 1735516800000-audio-001.mp3
│   │   │   └── 1735516900000-depoimento-2.mp3
│   │   └── relatorios/
│   │       └── 1735517000000-relatorio.md
│   └── campanha-2/
│       ├── index.json
│       └── arquivos/
│           └── ...
```

## 🔧 Verificação

Para verificar se está funcionando:

1. Faça upload de um arquivo pelo app
2. Vá em Storage → mag-files no Supabase
3. Verifique se a pasta `campaigns` foi criada
4. Confira os logs do navegador (F12 → Console) para ver mensagens de debug

## ⚠️ Troubleshooting

### Erro 500 no upload

- Verifique se o bucket `mag-files` existe
- Verifique se o bucket está marcado como público
- Verifique se as políticas de RLS foram criadas

### Arquivos não aparecem na listagem

- Verifique se o arquivo `index.json` foi criado na pasta da campanha
- Verifique os logs do console para ver se houve erros

### CORS Error

- O bucket precisa estar configurado como público
- As credenciais do Supabase estão hardcoded em `lib/supabase.ts`
