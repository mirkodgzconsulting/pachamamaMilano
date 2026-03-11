import type { APIRoute } from 'astro';
import { supabaseAdmin, supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, orderId, status, gift_card_url } = body;
    
    if (!token || !orderId) {
        return new Response(JSON.stringify({ error: 'Dati mancanti' }), { status: 400 });
    }
    
    // Verificar que el token pertenezca al admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user || user.email !== 'admin@pachamama.com') {
      return new Response(JSON.stringify({ error: 'Accesso non autorizzato' }), { status: 401 });
    }

    // Si el estado cambia a 'confirmed', disparamos el envío de la Gift Card por correo
    if (status === 'confirmed') {
      try {
        // 1. Obtener datos completos de la orden
        const { data: cardData } = await supabaseAdmin
          .from('gift_cards')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (cardData) {
          // 2. Generar la imagen física (usando Sharp en el servidor)
          const { generateGiftCardImage } = await import('../../../lib/gift-card-generator');
          const { giftCardUrl, imageBuffer } = await generateGiftCardImage(cardData);
          
          // 3. Actualizar la URL en la BD
          await supabaseAdmin.from('gift_cards').update({ gift_card_url: giftCardUrl }).eq('id', orderId);

          // 4. Enviar Correo con Resend
          const { Resend } = await import('resend');
          const resend = new Resend(import.meta.env.RESEND_API_KEY);

          const formattedAmount = (cardData.amount / 100).toFixed(2);
          const shortId = cardData.id.split('-')[0].toUpperCase();

          console.log("Generando email para Gift Card:", giftCardUrl);

          await resend.emails.send({
            from: 'Pachamama Milano <marketing@pachamamamilano.it>',
            to: [cardData.sender_email.toLowerCase()],
            subject: `La tua Gift Card Pachamama è pronta! (Ordine #${shortId})`,
            attachments: [
              {
                filename: `GiftCard-Pachamama-${shortId}.jpg`,
                content: imageBuffer,
              }
            ],
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a1a; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
                
                <!-- HEADER CON LOGO -->
                <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; text-align: center;">
                  <tr>
                    <td style="padding: 40px 20px;">
                      <img src="https://res.cloudinary.com/dskliu1ig/image/upload/v1773244959/logo_cbmjqn.png" width="200" height="auto" alt="Pachamama Milano" border="0" style="display: inline-block; margin-bottom: 20px;">
                      <h1 style="color: #ffd54e; text-transform: uppercase; letter-spacing: 4px; margin: 0; font-size: 26px; font-weight: bold; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">PAGAMENTO CONFERMATO</h1>
                    </td>
                  </tr>
                </table>

                <!-- CONTENT -->
                <div style="padding: 50px 40px; background-color: #FBF6E6; color: #1a1a1a; text-align: center; line-height: 1.6;">
                  <p style="font-size: 20px; margin-bottom: 25px;">Ciao <strong>${cardData.sender_name}</strong>,</p>
                  <p style="font-size: 17px; margin-bottom: 35px;">
                    Siamo felici de confermarti che il tuo pagamento per la Gift Card da <strong>€${formattedAmount}</strong> è stato verificato.<br>
                    <strong>Abbiamo allegato la tua Gift Card direttamente a questa email.</strong>
                  </p>

                  <div style="margin-bottom: 40px; padding: 30px; background-color: #ffffff; border-radius: 12px; border: 1px solid #eee;">
                    <p style="font-size: 16px; color: #1a1a1a; margin: 0;">
                      Puoi scaricare e stampare il file allegato (JPG) per regalarlo a <strong>${cardData.receiver_name}</strong>.
                    </p>
                  </div>

                  <p style="font-size: 13px; color: #777; margin-top: 20px;">
                    Ricorda che la Gift Card ha una validità di 12 mesi dalla data odierna.<br>
                    Grazie per aver scelto <strong>Pachamama Milano</strong>.
                  </p>
                </div>
              </div>
            `
          });
        }
      } catch (err) {
        console.error("Errore invio Gift Card automatica:", err);
        // Continuiamo comunque per aggiornare lo stato nel DB
      }
    }

    const { error } = await supabaseAdmin
      .from('gift_cards')
      .update({
          status: status,
          gift_card_url: gift_card_url || "" 
      })
      .eq('id', orderId);

    if (error) throw error;
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("API Update Order Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
