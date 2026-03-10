import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { generateGiftCardImage } from '../../lib/gift-card-generator';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { orderId, action } = await request.json();

    if (!orderId || !action) {
      return new Response(JSON.stringify({ error: 'Dati mancanti' }), { status: 400 });
    }

    let updates: any = { status: 'pending' };
    
    if (action === 'confirm') {
        // 1. Obtener datos de la tarjeta para generar la imagen
        const { data: card, error: fetchError } = await supabaseAdmin
            .from('gift_cards')
            .select('*')
            .eq('id', orderId)
            .single();
            
        if (fetchError || !card) throw new Error('Ordine non trovato');

        // 2. Generar la imagen automáticamente con Sharp + R2
        const giftCardUrl = await generateGiftCardImage(card);

        updates = { 
            status: 'confirmed',
            gift_card_url: giftCardUrl 
        };
        
        console.log(`--- ✅ GIFT CARD GENERATA: ${giftCardUrl} ---`);
    } else if (action === 'cancel') {
        updates = { status: 'cancelled' };
    }

    const { error } = await supabaseAdmin
      .from('gift_cards')
      .update(updates)
      .eq('id', orderId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error('Admin Action Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
