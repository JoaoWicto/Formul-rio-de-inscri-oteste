# Guia passo a passo — como colocar o sistema Senzala no ar (v3)

Este sistema é um **site estático** (HTML/CSS/JS) com banco de dados na nuvem
gratuito (Supabase). Depois de no ar, ele funciona no navegador do PC e do
celular e pode ser **instalado como aplicativo** (PWA).

**Tempo estimado: 15 a 20 minutos.** Não precisa saber programar.

---

## 1. O que você vai precisar

- Um e-mail válido (para criar a conta no Supabase).
- A pasta `senzala-inscricao` (este pacote).
- Um computador para fazer a configuração inicial (só uma vez).

---

## 2. Criar o banco de dados no Supabase (grátis)

1. Acesse <https://supabase.com> e clique em **Start your project** (crie conta com e-mail e senha, ou entre com GitHub).
2. Clique em **New project**. Escolha uma organização (pode usar o próprio nome).
3. Preencha:
   - **Name**: `senzala` (ou o nome que quiser)
   - **Database Password**: crie uma senha forte e **guarde** (não usamos ela no sistema, mas precisa para manutenção)
   - **Region**: escolha a mais próxima do Brasil (ex.: `Southeast Brazil (São Paulo)` / `South America (São Paulo)`)
4. Clique em **Create new project** e aguarde ~2 minutos até ficar pronto.

### 2.1 Criar a tabela de inscrições

5. No menu lateral, clique em **SQL Editor** → **New query**.
6. Abra o arquivo `supabase.sql` que está nesta pasta, copie **todo o conteúdo** e cole no editor.
7. Clique em **Run** (ou aperte `Ctrl+Enter`). Deve aparecer *Success. No rows returned*.
   - Este script é idempotente: pode rodar de novo sem problema se precisar.

### 2.2 Criar o usuário administrador e bloquear cadastro novo

8. No menu lateral, clique em **Authentication** → **Providers** → **Email**.
   - Desligue a opção **Allow new users to sign up** (ninguém mais consegue criar conta; só você, manualmente). Clique em **Save**.
9. Ainda em **Authentication**, clique em **Users** → **Add user** → **Create new user**.
   - Preencha o e-mail e a senha do administrador. Marque **Auto Confirm User**. Clique em **Create**.
   - (Opcional) Para mais segurança, em `js/config.js` coloque esse e-mail dentro de `ADMIN_EMAILS: ["seuemail@exemplo.com"]` — somente ele entrará no admin.

### 2.3 Pegar as chaves de conexão

10. No menu lateral, clique em **Project Settings** (engrenagem) → **API**.
    - Copie o **Project URL** (ex.: `https://abcxyz.supabase.co`).
    - Copie a chave **anon public** (começa com `eyJhbGci...`).
11. Abra o arquivo `js/config.js` num editor de texto (Bloco de Notas serve) e cole:
    ```js
    SUPABASE_URL: "https://abcxyz.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGci...sua-chave-aqui",
    ```
    Salve o arquivo.

> A chave *anon* é pública por natureza. Quem protege os dados são as regras
> de segurança (RLS) que você rodou no passo 2.1: visitantes só enviam fichas,
> só o administrador logado lê/edita/exclui.

---

## 3. Colocar o site no ar (escolha UMA opção)

O site é só uma pasta de arquivos. Qualquer hospedagem de site estático
funciona. Duas opções gratuitas e fáceis:

### Opção A — Netlify Drop (a mais fácil, ~2 minutos)

1. Acesse <https://app.netlify.com/drop>.
2. **Arraste a pasta `senzala-inscricao` inteira** para dentro da página.
3. Pronto. O Netlify dá um endereço tipo `https://abc123.netlify.app`.
4. (Opcional) Crie uma conta grátis no Netlify para fixar o endereço e mudar o nome em **Site settings → Change site name**.

### Opção B — GitHub Pages

1. Crie conta em <https://github.com> e crie um repositório novo (ex.: `senzala`), público.
2. Envie todos os arquivos desta pasta para o repositório (arrastar/soltar na página do repo funciona).
3. Em **Settings → Pages**, em *Source* escolha `Deploy from a branch`, branch `main`, pasta `/ (root)`, clique em **Save**.
4. Aguarde ~1 minuto. O endereço fica `https://SEU-USUARIO.github.io/senzala/`.

### Opção C — Rodar só no seu PC (teste / sem internet)

Para testar rapidamente no próprio computador:

- **Windows**: abra a pasta, segure `Shift` e clique com o botão direito →
  *Abrir janela do PowerShell aqui* → digite:
  ```
  python -m http.server 8000
  ```
  (se não tiver Python, use `npx serve` com o Node.js instalado, ou instale o
  Python em <https://python.org>.)
- Abra no navegador: `http://localhost:8000`.

**Para abrir no celular também** (mesma Wi-Fi do PC): descubra o IP do seu PC
(no Windows: `ipconfig` → *Endereço IPv4*; no Linux/Mac: `ifconfig` ou
`ip a`). No celular acesse `http://IP-DO-PC:8000`.

> ⚠️ No modo local (sem HTTPS), o aplicativo **não pode ser instalado** e o
> salvamento offline não funciona — o navegador só permite esses recursos em
> HTTPS. Use a Opção A ou B para o sistema funcionar de verdade no celular.

---

## 4. Instalar no PC e no celular (como aplicativo)

Depois que o site estiver num endereço `https://` (Netlify ou GitHub Pages):

- **Chrome / Edge (PC ou Android)**: abra o endereço → no canto da barra de
  endereço aparece um ícone de instalar (📥) → clique em **Instalar**. O site
  vira um aplicativo na área de trabalho / tela inicial e abre em janela própria.
- **iPhone (Safari)**: abra o endereço → toque no botão compartilhar (⏏) →
  **Adicionar à Tela de Início** → **Adicionar`.
- **Android (outros navegadores)**: menu → **Adicionar à tela inicial**.

A ficha de inscrição abre direto. A área do administrador fica em
`endereço/admin.html` (ex.: `https://abc123.netlify.app/admin.html`).

---

## 5. Como funciona o backup automático

O sistema faz backup em **dois níveis**:

### 5.1 Na ficha de inscrição (para quem está se inscrevendo)

- A cada letra digitada, o sistema salva um **rascunho automático** no próprio
  aparelho. Se o navegador travar, a tela desligar ou a pessoa fechar sem querer,
  ao abrir a ficha de novo o que foi preenchido (inclusive foto e assinatura)
  **é restaurado automaticamente**, com um aviso e botão *Descartar rascunho*.
- Se a internet cair na hora de enviar, a inscrição é guardada numa **fila
  offline** no aparelho e enviada sozinha quando a conexão voltar (basta manter
  o aplicativo instalado).

### 5.2 Na área do administrador (backup do banco inteiro)

- **Toda vez que o administrador entra** (e também depois de cada edição ou
  exclusão), o sistema tira uma cópia completa de todas as inscrições e guarda
  os **últimos 5 backups** no navegador do administrador. O horário aparece na
  linha de estatística: *Backup automático: 14:32 (128 reg.)*.
- Botão **Baixar backup**: salva um arquivo `.json` no computador/celular —
  **guarde este arquivo** (no Google Drive, e-mail, etc.). É a sua cópia de
  segurança caso o Supabase caia ou seja apagado.
- Botão **Restaurar backup**: escolha um arquivo `.json` salvo anteriormente;
  o sistema reimporta as inscrições **sem duplicar** as que já existem.

> 💡 **Recomendação**: entre no admin uma vez por semana e clique em
> *Baixar backup*. Visitantes da ficha não conseguem ler o banco (regra de
> segurança RLS), então só o administrador pode gerar a cópia completa.

---

## 6. Teste rápido (1 minuto)

1. Abra a ficha (`index.html`), preencha nome, CPF válido, celular, assine e envie.
   - CPF de teste: use um número real válido (ou gere um em sites de CPF de teste).
2. Abra `admin.html`, entre com o e-mail/senha do passo 2.2.
3. Confira se a inscrição aparece na lista. Abra, teste *Editar*, *Imprimir/PDF*,
   *Exportar CSV*, *Baixar backup*.
4. No celular, abra o mesmo endereço e repita o envio — deve funcionar igual.

---

## 7. Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| "Não foi possível enviar" com erro de rede | Verifique se preencheu `js/config.js` corretamente (URL e anon key) e se a tabela foi criada (passo 2.1). |
| "CPF já possui inscrição" | Funcionando: o sistema bloqueia CPF duplicado. |
| Admin não aceita e-mail/senha | Confirme que o usuário foi criado em Authentication → Users e que *Auto Confirm User* está marcado. |
| Entra no admin mas não carrega a lista | Rode novamente o `supabase.sql` no SQL Editor (ele adiciona permissões que podem faltar). |
| Atualizei os arquivos mas o site continua o antigo | O sistema guarda cópia offline. Sempre que publicar uma versão nova, **altere o número da `VERSION` no início do arquivo `sw.js`** (ex.: `senzala-v4`) e publique de novo. |
| Não aparece botão de instalar no celular | Precisa ser endereço `https://` (não `http`). Use Netlify/GitHub Pages, não o servidor local do PC. |
| Backup muito grande para salvar | Se houver muitas fotos/assinaturas, o navegador pode não guardar os 5 backups; use sempre *Baixar backup* para ter o arquivo. |

---

## 8. Atualizando o sistema no futuro

1. Edite os arquivos no computador.
2. Se mudou qualquer arquivo de programa (`.html`, `.css`, `.js`), abra `sw.js`
   e mude `const VERSION = "senzala-v3";` para `senzala-v4` (e assim por diante).
3. Arraste a pasta de novo no Netlify Drop (ou atualize o GitHub).

---

## Estrutura da pasta

```
index.html              Ficha pública de inscrição
admin.html              Área do administrador (com senha)
css/style.css           Estilo
js/config.js            Suas chaves do Supabase (edite aqui)
js/app.js               Lógica da ficha (com rascunho + fila offline)
js/admin.js             Lógica do admin (com backup automático)
supabase.sql            Script do banco de dados (rodar no Supabase)
manifest.webmanifest    Configuração do aplicativo instalável
sw.js                   Salvamento offline (service worker)
assets/                 Logo e ícones do aplicativo
GUIA-DE-INSTALACAO.md   Este guia
README.md               Resumo do projeto
```
