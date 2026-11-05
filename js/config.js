// Preencha com os dados do seu projeto Supabase (Project Settings > API).
// A chave "anon" é pública por natureza: quem protege os dados são as regras RLS do supabase.sql.
// Se deixar vazio, o sistema roda em modo demonstração (dados salvos apenas neste navegador).
window.SENZALA_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  // (Opcional) somente estes e-mails entram no admin.html.
  // Deixe vazio ([] ) para permitir qualquer usuário criado em Authentication > Users.
  ADMIN_EMAILS: []
};
