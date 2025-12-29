import { put } from '@vercel/blob';
import { IncomingMessage, ServerResponse } from 'http';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    // Parse manual da URL e Query Params (necessário em Node.js raw request)
    // Usamos um host fictício pois request.url é relativo
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    const filename = url.searchParams.get('filename');
    const campaign = url.searchParams.get('campaign');
    const type = url.searchParams.get('type');

    if (!filename || !campaign) {
      response.statusCode = 400;
      response.end('Missing required parameters');
      return;
    }

    const safeCampaign = campaign.replace(/[^a-zA-Z0-9]/g, '_');
    const safeType = (type || 'General').replace(/[^a-zA-Z0-9]/g, '_');

    // Upload para o Vercel Blob
    // request é um IncomingMessage (Readable Stream), suportado nativamente pelo put()
    const blob = await put(`arquivos/${safeCampaign}/${safeType}/${filename}`, request, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Retorno da resposta
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({
      ...blob,
      metadata: {
        campaign,
        type
      }
    }));

  } catch (error) {
    console.error(error);
    response.statusCode = 500;
    response.end(JSON.stringify({ error: 'Upload failed' }));
  }
}