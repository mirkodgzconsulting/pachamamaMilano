import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@pachamama.com',
      password: 'PachamamaAdmin2026!',
      email_confirm: true
    });

    if (error) {
       // if user already exists
       if (error.message.includes('User already registered')) {
            return new Response(JSON.stringify({ success: true, message: 'Admin yaready exists' }), { status: 200 });
       }
       return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};
