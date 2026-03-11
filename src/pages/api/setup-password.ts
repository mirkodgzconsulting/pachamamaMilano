import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, orderId, password } = await request.json();

    if (!email || !orderId || !password) {
      return new Response(JSON.stringify({ error: 'Campi mancanti' }), { status: 400 });
    }

    // Verify order belongs to this email to prevent unauthorized password resets
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('gift_cards')
      .select('id')
      .eq('id', orderId)
      .eq('sender_email', email.toLowerCase())
      .single();

    if (orderError || !orderData) {
      return new Response(JSON.stringify({ error: 'Ordine non valido o non autorizzato' }), { status: 403 });
    }

    // Get user by email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) throw userError;

    const user = users.find((u: any) => u.email === email.toLowerCase());
    
    if (!user) {
        return new Response(JSON.stringify({ error: 'Utente non trovato.' }), { status: 404 });
    }

    // Update password
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: password
    });

    if (updateError) {
        throw updateError;
    }

    // --- ENVIAR CORREO DE BIENVENIDA (RESEND) ---
    try {
        const { Resend } = await import('resend');
        const resend = new Resend(import.meta.env.RESEND_API_KEY);
        
        // Obtenemos todos los detalles necesarios para el correo
        const { data: fullOrder } = await supabaseAdmin
          .from('gift_cards')
          .select('*')
          .eq('id', orderId)
          .single();

        if (fullOrder) {
          const formattedAmount = (fullOrder.amount / 100).toFixed(2);
          const shortId = fullOrder.id.split('-')[0].toUpperCase();
          const whatsappMsg = encodeURIComponent(`Ciao, ti mando il comprobante della mia Gift Card da €${formattedAmount}`);
          const whatsappUrl = `https://wa.me/393284281204?text=${whatsappMsg}`;

          await resend.emails.send({
            from: 'Pachamama Milano <marketing@pachamamamilano.it>',
            to: [email.toLowerCase()],
            subject: 'Benvenuto nella famiglia Pachamama! (Ordine #' + shortId + ')',
            html: `
              <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a1a; color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <div style="text-align: center; padding: 40px 20px; background-color: #1a1a1a; border-bottom: 2px solid #ffd54e;">
                  <h1 style="color: #ffd54e; margin: 0; font-size: 28px; letter-spacing: 2px; text-transform: uppercase;">Benvenuto!</h1>
                  <p style="color: #a0a0a0; font-size: 14px; margin-top: 10px; letter-spacing: 1px;">PACHAMAMA MILANO</p>
                </div>
                
                <div style="padding: 40px 30px; background-color: #FBF6E6; color: #1a1a1a;">
                  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Ciao <strong>${fullOrder.sender_name}</strong>,
                  </p>
                  
                  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Siamo felici di darti il benvenuto! Hai appena richiesto con successo una Gift Card del valore di <strong>€${formattedAmount}</strong> destinata a <strong>${fullOrder.receiver_name}</strong>.
                  </p>

                  <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; border-left: 4px solid #ffd54e; margin-bottom: 30px; font-size: 14px;">
                    <p style="margin: 0 0 10px 0;"><strong>Acquirente:</strong> ${fullOrder.sender_name} (${fullOrder.sender_phone})</p>
                    <p style="margin: 0;"><strong>Destinatario:</strong> ${fullOrder.receiver_name}</p>
                  </div>

                  <h3 style="color: #1a1a1a; font-size: 18px; margin-bottom: 15px;">Come finalizzare il tuo ordine?</h3>
                  <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                    Per completare l'attivazione della tua Gift Card, inviaci la contabile o lo screenshot del bonifico bancario direttamente su WhatsApp. 
                  </p>
                  
                  <div style="text-align: center; margin-bottom: 40px;">
                    <a href="${whatsappUrl}" style="background-color: #25D366; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">
                      Invia Ricevuta via WhatsApp
                    </a>
                  </div>

                  <hr style="border: none; border-top: 1px solid rgba(0,0,0,0.1); margin: 30px 0;">

                  <p style="font-size: 14px; line-height: 1.6; color: #555555; text-align: center; font-style: italic;">
                    "Al Pachamama siamo orgogliosi di far conoscere la cultura peruviana e fieri dei nostri clienti. Grazie per aver scelto di regalare un'esperienza unica."
                  </p>
                </div>
                
                <div style="text-align: center; padding: 20px; background-color: #1a1a1a; font-size: 12px; color: #777777;">
                  Pachamama Milano &copy; ${new Date().getFullYear()}<br>
                  Via Venezian, Milano, Italia
                </div>
              </div>
            `
          });
        }
    } catch (emailError) {
        console.error("Non è stato possibile inviare l'email di benvenuto:", emailError);
        // Non lanciamo eccezione per non bloccare il core flow dell'utente, è "silenzioso" in caso di errore
    }
    // --- FINE EMAIL ---

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Setup Password Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Errore interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
