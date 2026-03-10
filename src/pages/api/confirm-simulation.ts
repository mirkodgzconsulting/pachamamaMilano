import type { APIRoute } from 'astro';
import { completeGiftCardPayment } from '../../lib/gift-card-service';

/**
 * endpoint para "Confirmar" la simulación (lo que haría el Webhook de Stripe en real)
 */
export const GET: APIRoute = async ({ request, url }) => {
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Falta el sessionId' }), { status: 400 });
  }

  try {
    // 1. Procesar el pago en DB (Servicio compartido con el webhook real)
    await completeGiftCardPayment(sessionId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error confirm-simulation:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
