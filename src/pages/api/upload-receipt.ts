import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

const ACCOUNT_ID = import.meta.env.CLOUDFLARE_ACCOUNT_ID;
const IMAGES_TOKEN = import.meta.env.CLOUDFLARE_API_TOKEN || import.meta.env.CLOUDFLARE_IMAGES_TOKEN;
const IMAGES_HASH = import.meta.env.CLOUDFLARE_IMAGES_HASH;

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!ACCOUNT_ID || !IMAGES_TOKEN || !IMAGES_HASH) {
        throw new Error('Configurazione Cloudflare incompleta nel file .env');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const orderId = formData.get('orderId') as string;

    if (!file || !orderId) {
      return new Response(JSON.stringify({ error: 'File o ID ordine mancante' }), { status: 400 });
    }

    // 1. Subir a Cloudflare Images
    const cfFormData = new FormData();
    cfFormData.append('file', file);
    cfFormData.append('metadata', JSON.stringify({ orderId }));

    const headers: Record<string, string> = {};
    
    // Prioridad a Global Key si existe para evitar problemas de permisos de Tokens
    if (import.meta.env.CLOUDFLARE_GLOBAL_KEY && import.meta.env.CLOUDFLARE_EMAIL) {
        headers['X-Auth-Email'] = import.meta.env.CLOUDFLARE_EMAIL;
        headers['X-Auth-Key'] = import.meta.env.CLOUDFLARE_GLOBAL_KEY;
    } else {
        headers['Authorization'] = `Bearer ${IMAGES_TOKEN}`;
    }

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: headers,
        body: cfFormData
      }
    );

    const cfResult = await cfResponse.json();

    if (!cfResult.success) {
      throw new Error(cfResult.errors?.[0]?.message || 'Errore durante el caricamento su Cloudflare Images');
    }

    // 2. Construir la URL de entrega de Cloudflare Images
    // El formato estándar es: https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT>
    const imageId = cfResult.result.id;
    const publicUrl = `https://imagedelivery.net/${IMAGES_HASH}/${imageId}/public`;

    // 3. Actualizar la tabla gift_cards en Supabase
    const { error: updateError } = await supabaseAdmin
      .from('gift_cards')
      .update({
        receipt_url: publicUrl,
        status: 'processing'
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error('Upload Error Cloudflare Images:', error);
    return new Response(JSON.stringify({ error: error.message || 'Errore durante il caricamento' }), { status: 500 });
  }
};
