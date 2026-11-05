# Ficha de Inscrição · Associação de Capoeira Senzala (v3)

Site estático (HTML/CSS/JS) com **duas páginas**:
- `index.html` — ficha pública de inscrição (foto, assinatura digital, busca de CEP, validação de CPF).
- `admin.html` — área do administrador: login, lista com busca, visualizar, editar, excluir, exportar CSV, gerar PDF/imprimir em layout A4.

Os dados ficam no **Supabase** (gratuito). Sem configurar `js/config.js`, roda em modo demonstração (localStorage).

**Instalação passo a passo completa:** veja o arquivo **`GUIA-DE-INSTALACAO.md`**.

## O que há de novo na v3
- **Aplicativo instalável (PWA)**: instale no PC e no celular (Chrome/Android/iPhone) e abra como app, com ícone próprio. A ficha funciona mesmo sem internet.
- **Backup automático na ficha**: rascunho salvo a cada digito (restaurado se o navegador cair) + fila offline (envia sozinho quando a internet volta).
- **Backup automático no admin**: a cada acesso, cópia completa do banco guardada no navegador (últimos 5), botão *Baixar backup* (.json) e *Restaurar backup* (sem duplicar).
- **Segurança extra**: lista branca opcional de e-mails de administrador em `js/config.js` (`ADMIN_EMAILS`); admin.html com `noindex` para não aparecer no Google.
- **Código limpo**: removidas variáveis e classes CSS não utilizadas; logo do PDF com fallback (não quebra mais se a imagem falhar).

## Colocar no ar (resumo)
1. Crie um projeto em <https://supabase.com>, rode `supabase.sql` no SQL Editor.
2. Em Authentication, desligue *Allow new users to sign up* e crie o usuário admin.
3. Cole Project URL e anon key em `js/config.js`.
4. Arraste a pasta em <https://app.netlify.com/drop> (ou GitHub Pages).
5. Acesse pelo navegador do PC/celular e instale como aplicativo.

Detalhes, troubleshooting e modo local: **`GUIA-DE-INSTALACAO.md`**.

## Segurança e privacidade (LGPD)
- A chave *anon* é pública; a proteção vem das regras RLS: visitantes só **inserem**, apenas o admin logado **lê/edita/exclui**.
- A ficha coleta dados pessoais e de saúde (inclusive de menores). Use só para fins da associação e restrinja quem tem login de admin.
- Baixe o backup (.json) pelo admin periodicamente e guarde num local seguro.

## Estrutura
`index.html` · `admin.html` · `css/style.css` · `js/app.js` · `js/admin.js` · `js/config.js` · `supabase.sql` · `manifest.webmanifest` · `sw.js` · `assets/` · `GUIA-DE-INSTALACAO.md`
