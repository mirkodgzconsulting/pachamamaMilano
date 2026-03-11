import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { r2Client, R2_BUCKET_NAME } from '../../lib/cloudflare';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export const GET: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) return new Response('ID mancante', { status: 400 });

    // 1. Obtener la orden de Supabase para saber el nombre del archivo
    const { data: card, error } = await supabaseAdmin
      .from('gift_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !card) return new Response('Gift Card non trovata', { status: 404 });

    const fileName = `generated/giftcard-${card.id}.jpg`;

    // 2. Descargar la imagen de R2 usando el SDK (esto salta el error 401 público)
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
    });

    const response = await r2Client.send(command);
    const body = await response.Body?.transformToByteArray();

    if (!body) return new Response('Errore nel recupero dell\'immagine', { status: 500 });

    // 3. Devolver la imagen con las cabeceras de descarga forzada
    return new Response(body as any, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="GiftCard-Pachamama-${card.id.split('-')[0]}.jpg"`,
        'Cache-Control': 'public, max-age=31536000'
      }
    });

  } catch (error: any) {
    console.error('Download API Error:', error);
    return new Response('Errore interno', { status: 500 });
  }
};
