import { put } from '@vercel/blob';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const campaign = searchParams.get('campaign');
    const type = searchParams.get('type');

    if (!filename || !campaign || !request.body) {
      return new Response('Missing required parameters', { status: 400 });
    }

    // 1. Upload to Vercel Blob with organized path
    // Path format: arquivos/[campaign]/[type]/[filename]
    // Clean strings to be safe for URLs
    const safeCampaign = campaign.replace(/[^a-zA-Z0-9]/g, '_');
    const safeType = type?.replace(/[^a-zA-Z0-9]/g, '_') || 'General';
    
    const blob = await put(`arquivos/${safeCampaign}/${safeType}/${filename}`, request.body, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN, // Injected by Vercel
    });

    // 2. Simulate Database Insertion
    // In a real app with Prisma:
    // await prisma.file.create({
    //   data: {
    //     name: filename,
    //     url: blob.url,
    //     campaign: campaign,
    //     type: type,
    //     allowedUsers: [] 
    //   }
    // });
    
    // Return the blob data so the frontend can update its local state
    return new Response(JSON.stringify({
      ...blob,
      metadata: {
        campaign,
        type
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
  }
}