import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { completeGiftCardPayment } from '../../lib/gift-card-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('stripe-signature') || '';

  try {
    const rawBody = await request.text();
    let event;

    // 1. Verificación de la firma de Stripe (solo si tenemos el secreto)
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      // Si no hay firma (entorno local sin keys), "confiamos" en el body (SÓLO PARA DESARROLLO)
      event = JSON.parse(rawBody);
    }

    // 2. Escuchar el evento 'checkout.session.completed'
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Llamamos al servicio para marcar como pagado en Supabase y enviar email
      await completeGiftCardPayment(session.id);
      
      console.log('✅ Webhook: Gift Card pagada exitosamente!', session.id);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
};
