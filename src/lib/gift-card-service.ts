import { supabaseAdmin } from './supabase';

/**
 * Lógica centralizada para completar la compra de una Gift Card
 * (Se llama desde el Webhook real o desde el simulador)
 */
export async function completeGiftCardPayment(stripeSessionId: string) {
  // 1. Buscamos la Gift Card en Supabase
  const { data: card, error: fetchError } = await supabaseAdmin
    .from('gift_cards')
    .select('*')
    .eq('stripe_session_id', stripeSessionId)
    .single();

  if (fetchError || !card) {
    throw new Error('Gift Card non trovata per questa sessione: ' + stripeSessionId);
  }

  // Si ya está pagada, no hacemos nada
  if (card.status === 'paid') return card;

  // 2. Actualizamos el estado a 'paid'
  const { error: updateError } = await supabaseAdmin
    .from('gift_cards')
    .update({ status: 'paid' })
    .eq('id', card.id);

  if (updateError) throw updateError;

  // 3. SIMULACIÓN DE ENVÍO DE EMAIL
  console.log('--- 📧 SIMULAZIONE INVIO EMAIL ---');
  console.log(`DE: Pachamama Milano <gift@pachamamamilano.it>`);
  console.log(`PER: ${card.receiver_email} (${card.receiver_name})`);
  console.log(`OGGETTO: Hai ricevuto una Gift Card da ${card.sender_name}! ✨`);
  console.log(`VALORE: €${card.amount / 100}`);
  console.log(`CODICE: ${card.id.split('-')[0].toUpperCase()}`);
  console.log(`MESSAGGIO: "${card.message || 'Goditi questa esperienza!'}"`);
  console.log('-----------------------------------');

  return { ...card, status: 'paid' };
}
