import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const data = await request.json();
    
    // 1. Obtener el usuario actual si está logueado
    const token = cookies.get('sb-access-token')?.value;
    let userId = null;
    if (token) {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        userId = user?.id;
    }

    // 2. Registrar en Supabase (Como pendiente de bonifico)
    const cleanSenderEmail = data.sender_email.trim().toLowerCase();

    // 2. Registro Silencioso / Búsqueda de Usuario
    let finalUserId = userId;
    let isNewUser = false;

    if (!finalUserId) {
        // Buscar si el usuario ya existe consultando directamente la base de datos de perfiles
        // Esto elimina las limitaciones de paginación que tenía .listUsers() y es 100x más rápido
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', cleanSenderEmail)
            .maybeSingle();

        if (existingProfile && existingProfile.id) {
            finalUserId = existingProfile.id;
        } else {
            // Crear usuario nuevo (Silencioso) si no apareció en perfiles
            const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: cleanSenderEmail,
                email_confirm: true,
                user_metadata: { full_name: data.sender_name }
            });
            if (createError) {
                console.error("Error createUser:", createError);
                throw createError;
            }
            if (newUser) {
                finalUserId = newUser.id;
                isNewUser = true;
            }
        }
    }

    // 3. Asegurar Perfil en la tabla 'profiles'
    if (finalUserId) {
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: finalUserId,
                full_name: data.sender_name,
                email: cleanSenderEmail,
                phone: data.sender_phone
            }, { onConflict: 'id' });
        
        if (profileError) console.error('Error creating profile:', profileError);
    }

    // 4. Registrar la Gift Card en Supabase
    const { data: newCard, error: insertError } = await supabaseAdmin
      .from('gift_cards')
      .insert({
        sender_id: finalUserId,
        sender_name: data.sender_name,
        sender_email: cleanSenderEmail,
        sender_phone: data.sender_phone,
        receiver_name: data.receiver_name,
        receiver_email: data.receiver_email,
        receiver_phone: data.receiver_phone,
        message: data.message,
        amount: data.amount * 100,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 5. Devolvemos la URL (Setup si es nuevo, o Login si ya existía)
    const redirectUrl = isNewUser
       ? `/area-cliente/setup?email=${encodeURIComponent(cleanSenderEmail)}&order=${newCard.id}`
       : `/login?email=${encodeURIComponent(cleanSenderEmail)}`;

    return new Response(JSON.stringify({ 
      url: redirectUrl, 
      email: cleanSenderEmail,
      orderId: newCard.id 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Checkout Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Errore interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
