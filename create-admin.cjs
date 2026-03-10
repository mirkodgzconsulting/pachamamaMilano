var dotenv = require("dotenv");
dotenv.config({path: ".env"});
var { createClient } = require("@supabase/supabase-js");

var supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

var supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'admin@pachamama.com',
    password: 'PachamamaAdmin2026!',
    email_confirm: true
  });
  console.log('User creation result:', data);
  if (error) console.error('Error:', error);
}
createAdmin();
