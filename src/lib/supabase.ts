import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || 'dummy_key';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE;

// Cliente público para operaciones
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente con privilegios de administrador (Solo Servidor)
// Condicionamos su creación porque en el navegador supabaseServiceKey es undefined y tira error fatal.
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null as any;
