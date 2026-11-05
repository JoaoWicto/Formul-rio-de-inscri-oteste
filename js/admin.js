/* Área do administrador — Senzala (v3)
   Melhorias: backup automático do banco a cada acesso (salvo no navegador e
   baixável em .json), restauração a partir de backup e lista branca de
   e-mails de administrador opcional em js/config.js. */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const cfg = window.SENZALA_CONFIG || {};
const live = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
const sb = live ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const DEMO_KEY = "senzala_demo_v1";
const BACKUP_KEY = "senzala_backups_v1";
const MAX_BACKUPS = 5;
const ADMIN_EMAILS = (cfg.ADMIN_EMAILS || []).map(e => String(e).toLowerCase().trim());

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const brDate = d => { if (!d) return ""; const t = String(d).slice(0,10).split("-"); return t.length === 3 ? t.reverse().join("/") : d; };
const hhmm = d => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// Logo em data-URL para usar no PDF (janela em branco não resolve caminhos relativos)
const FALLBACK_LOGO = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="20" fill="#13692f"/><text x="64" y="88" font-size="72" text-anchor="middle" fill="#fff" font-family="Georgia">S</text></svg>');
let LOGO = FALLBACK_LOGO;
try {
  fetch("assets/logo.jpeg").then(r => r.blob()).then(b => {
    const fr = new FileReader();
    fr.onload = () => LOGO = fr.result;
    fr.readAsDataURL(b);
  }).catch(() => {});
} catch(_){}

const CORDEL = ["CINZA","VERDE E CINZA","AMARELO E CINZA","AZUL E CINZA","VERDE","AMARELO","AZUL","VERDE E AMARELO","VERDE E AZUL","AMARELO E AZUL","VERDE, AMARELO E AZUL","VERDE E BRANCO","AMARELO E BRANCO","AZUL E BRANCO","BRANCO"];
const RH = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const SECTIONS = [
 {t:"Dados pessoais", f:[
  {k:"nome",l:"Nome completo",type:"text",top:1,req:1,col:"c12"},
  {k:"apelido",l:"Apelido",type:"text",top:1,col:"c6"},
  {k:"graduacao",l:"Graduação",type:"text",top:1,col:"c3"},
  {k:"cordel",l:"Cordel",type:"select",opts:CORDEL,col:"c3"},
  {k:"nascimento",l:"Nascimento",type:"date",col:"c4"},
  {k:"peso",l:"Peso (kg)",type:"text",col:"c4"},
  {k:"altura",l:"Altura (m)",type:"text",col:"c4"},
  {k:"naturalidade",l:"Naturalidade",type:"text",col:"c4"},
  {k:"nacionalidade",l:"Nacionalidade",type:"text",col:"c4"},
  {k:"rh",l:"Tipo sang./RH",type:"select",opts:RH,col:"c4"},
  {k:"estadoCivil",l:"Estado civil",type:"text",col:"c4"},
  {k:"profissao",l:"Profissão",type:"text",col:"c4"},
  {k:"localTrabalho",l:"Local de trabalho",type:"text",col:"c4"},
  {k:"escolaridade",l:"Escolaridade",type:"text",col:"c12"}]},
 {t:"Documentos", f:[
  {k:"rg",l:"RG",type:"text",col:"c4"},
  {k:"orgaoExp",l:"Órgão / exp. em",type:"text",col:"c4"},
  {k:"cpf",l:"CPF",type:"text",top:1,req:1,col:"c4"}]},
 {t:"Endereço", f:[
  {k:"cep",l:"CEP",type:"text",col:"c3"},
  {k:"endereco",l:"Endereço",type:"text",col:"c9"},
  {k:"bairro",l:"Bairro",type:"text",col:"c4"},
  {k:"cidade",l:"Cidade",type:"text",col:"c5"},
  {k:"estado",l:"Estado",type:"text",col:"c3"}]},
 {t:"Contato", f:[
  {k:"celular",l:"Celular / WhatsApp",type:"tel",top:1,req:1,col:"c6"},
  {k:"email",l:"E-mail",type:"email",col:"c6"},
  {k:"emergencia",l:"Emergência (nome e telefone)",type:"text",col:"c12"}]},
 {t:"Filiação", f:[
  {k:"mae",l:"Mãe",type:"text",col:"c6"},
  {k:"pai",l:"Pai",type:"text",col:"c6"}]},
 {t:"Saúde", f:[
  {k:"saude",l:"Observações de saúde",type:"textarea",col:"c12"}]},
 {t:"Termo de adesão", f:[
  {k:"termoNome",l:"Declaro (nome completo)",type:"text",req:1,col:"c12"}]}
];
const ALL = SECTIONS.flatMap(s => s.f);
const flat = x => Object.assign({}, x.dados || {}, { nome:x.nome, apelido:x.apelido, cpf:x.cpf, celular:x.celular, graduacao:x.graduacao });

const store = {
  async list(){
    if (live){
      const { data, error } = await sb.from("inscricoes").select("*").order("created_at", { ascending:false });
      if (error) throw error;
      return data;
    }
    return JSON.parse(localStorage.getItem(DEMO_KEY) || "[]");
  },
  async update(id, rec){
    if (live){ const { error } = await sb.from("inscricoes").update(rec).eq("id", id); if (error) throw error; return; }
    const a = JSON.parse(localStorage.getItem(DEMO_KEY) || "[]");
    const i = a.findIndex(x => x.id === id);
    if (i >= 0) a[i] = Object.assign({}, a[i], rec, { updated_at: new Date().toISOString() });
    localStorage.setItem(DEMO_KEY, JSON.stringify(a));
  },
  async remove(id){
    if (live){ const { error } = await sb.from("inscricoes").delete().eq("id", id); if (error) throw error; return; }
    localStorage.setItem(DEMO_KEY, JSON.stringify(JSON.parse(localStorage.getItem(DEMO_KEY) || "[]").filter(x => x.id !== id)));
  },
  async insert(rec){
    if (live){ const { error } = await sb.from("inscricoes").insert(rec); if (error) throw error; return; }
    const a = JSON.parse(localStorage.getItem(DEMO_KEY) || "[]");
    if (!a.some(x => x.id === rec.id)) a.unshift(rec);
    localStorage.setItem(DEMO_KEY, JSON.stringify(a));
  }
};

// ---------- backup automático ----------
let lastBackup = null;
function readBackups(){ try { return JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]"); } catch(_){ return []; } }
function makeBackup(rows){
  const snap = { t: new Date().toISOString(), count: rows.length, data: rows };
  const all = [snap].concat(readBackups()).slice(0, MAX_BACKUPS);
  try { localStorage.setItem(BACKUP_KEY, JSON.stringify(all)); } catch(e){ /* quota cheia: mantém o mais recente apenas */ try { localStorage.setItem(BACKUP_KEY, JSON.stringify([snap])); } catch(_){} }
  lastBackup = snap;
  return snap;
}
function downloadBackup(){
  const snap = lastBackup || readBackups()[0];
  if (!snap){ alert("Nenhum backup disponível."); return; }
  const nome = "backup-senzala-" + snap.t.slice(0,10) + "-" + snap.t.slice(11,16).replace(":","") + ".json";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" }));
  a.download = nome; a.click(); URL.revokeObjectURL(a.href);
}
async function restoreBackup(file){
  let text;
  try { text = await file.text(); } catch(_){ alert("Não foi possível ler o arquivo."); return; }
  let arr;
  try {
    const j = JSON.parse(text);
    arr = Array.isArray(j) ? j : (j.data || []);
  } catch(_){ alert("Arquivo de backup inválido."); return; }
  if (!arr.length){ alert("O backup não contém registros."); return; }
  if (!confirm("Restaurar "+arr.length+" inscrição(ões) do backup? Registros já existentes (mesmo ID/CPF) serão mantidos e não duplicados.")) return;
  let ok = 0, skip = 0;
  for (const rec of arr){
    try { await store.insert(rec); ok++; }
    catch (e){ if (e && e.code === "23505") skip++; else { alert("Erro ao restaurar: " + (e.message || "")); break; } }
  }
  alert("Restauração concluída: "+ok+" inserida(s), "+skip+" já existiam.");
  rows = await store.list();
  makeBackup(rows);
  drawList();
}

let rows = [], cur = null, mode = "view", newPhoto = null;
const dlg = $("#dlg"), dbody = $("#dbody"), btnSave = $("#save");

// ---------- login / lista ----------
function adminAllowed(user){
  if (!ADMIN_EMAILS.length) return true;
  return ADMIN_EMAILS.includes(((user && user.email) || "").toLowerCase());
}
async function init(){
  const a = $("#adm");
  if (live){
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return loginView();
    if (!adminAllowed(session.user)){
      await sb.auth.signOut();
      a.innerHTML = '<div class="msg err">Este e-mail não tem permissão de administrador.</div>';
      return loginView();
    }
  }
  a.innerHTML = "<p>Carregando inscrições…</p>";
  try {
    rows = await store.list();
    makeBackup(rows); // backup automático a cada acesso ao admin
    drawList();
  } catch(e){ a.innerHTML = '<div class="msg err">Erro ao carregar: '+esc(e.message || "")+'</div>'; }
}
function loginView(){
  $("#adm").innerHTML = '<form class="login" id="lg"><h2 style="margin:0">Entrar</h2><label>E-mail<input type="email" name="e" required autocomplete="username"></label><label>Senha<input type="password" name="p" required autocomplete="current-password"></label><button class="btn">Entrar</button><div id="lgo"></div><p class="stat" style="text-align:center">Apenas administradores cadastrados no Supabase.</p></form>';
  $("#lg").addEventListener("submit", async ev => {
    ev.preventDefault();
    const f = ev.target;
    const { data, error } = await sb.auth.signInWithPassword({ email: f.e.value, password: f.p.value });
    if (error){ $("#lgo").innerHTML = '<div class="msg err">E-mail ou senha incorretos.</div>'; return; }
    if (!adminAllowed(data.user)){
      await sb.auth.signOut();
      $("#lgo").innerHTML = '<div class="msg err">Este e-mail não tem permissão de administrador.</div>';
      return;
    }
    init();
  });
}
function drawList(){
  const a = $("#adm"), q = (($("#q") && $("#q").value) || "").toLowerCase();
  const r = rows.filter(x => !q || [x.nome, x.apelido, x.cpf, x.celular, (x.dados && x.dados.email) || ""].join(" ").toLowerCase().includes(q));
  const bkpInfo = lastBackup ? ' · Backup automático: '+hhmm(lastBackup.t)+' ('+lastBackup.count+' reg.)' : '';
  a.innerHTML =
    '<div class="bar"><input id="q" type="search" placeholder="Buscar por nome, apelido, CPF, celular ou e-mail" value="'+esc(q)+'">' +
    '<button class="btn ghost" id="csv">Exportar CSV</button>' +
    '<button class="btn ghost" id="bkp">Baixar backup</button>' +
    '<button class="btn ghost" id="rst">Restaurar backup</button>' +
    (live ? '<button class="btn ghost" id="out2">Sair</button>' : "") +
    '<input type="file" id="rstFile" accept=".json,application/json" style="display:none"></div>' +
    '<p class="stat">'+rows.length+' inscrição(ões) · exibindo '+r.length+' · toque em uma linha para abrir'+bkpInfo+'</p>' +
    '<div class="tw"><table><thead><tr><th>Nome</th><th>Apelido</th><th>Graduação</th><th>Celular</th><th>Data</th></tr></thead><tbody>' +
    (r.length ? r.map(x => '<tr data-id="'+esc(x.id)+'"><td>'+esc(x.nome)+'</td><td>'+esc(x.apelido||"")+'</td><td>'+esc(x.graduacao||"")+'</td><td>'+esc(x.celular)+'</td><td>'+brDate(x.created_at)+'</td></tr>').join("") : '<tr><td colspan="5">Nenhuma inscrição encontrada.</td></tr>') +
    '</tbody></table></div>';
  const qi = $("#q");
  qi.addEventListener("input", () => { const p = qi.selectionStart; drawList(); const n = $("#q"); n.focus(); n.setSelectionRange(p,p); });
  $("#csv").addEventListener("click", exportCsv);
  $("#bkp").addEventListener("click", () => { makeBackup(rows); downloadBackup(); });
  $("#rst").addEventListener("click", () => $("#rstFile").click());
  $("#rstFile").addEventListener("change", e => { const f = e.target.files[0]; if (f) restoreBackup(f); e.target.value = ""; });
  if (live) $("#out2").addEventListener("click", async () => { await sb.auth.signOut(); rows = []; loginView(); });
  a.querySelectorAll("tbody tr[data-id]").forEach(t => t.addEventListener("click", () => openRow(t.dataset.id)));
}

// ---------- abrir ficha ----------
function openRow(id){ cur = rows.find(x => x.id === id); if (!cur) return; mode = "view"; renderDlg(); dlg.showModal(); }
function tabs(){
  return '<div class="tabs2"><button data-m="view" class="'+(mode==="view"?"on":"")+'">Ver ficha</button><button data-m="edit" class="'+(mode==="edit"?"on":"")+'">Editar</button></div><div id="dout" role="status" aria-live="polite"></div>';
}
function renderDlg(){
  dbody.innerHTML = tabs();
  dbody.querySelectorAll(".tabs2 button").forEach(b => b.addEventListener("click", () => { mode = b.dataset.m; renderDlg(); }));
  btnSave.style.display = mode === "edit" ? "inline-block" : "none";
  if (mode === "view") renderView(); else renderEdit();
}
function renderView(){
  const f = flat(cur);
  let html = '<div class="hd"><img class="l" src="'+esc(LOGO)+'" alt=""><div><h3>Associação de Capoeira Senzala</h3><p>Ficha de inscrição · Inscrito em '+brDate(cur.created_at)+(cur.updated_at ? ' · editado em '+brDate(cur.updated_at) : "")+'</p><p class="stat">Protocolo SEN-'+esc(String(cur.id).slice(0,8).toUpperCase())+'</p></div>'+(cur.foto ? '<img class="pf" alt="foto" src="'+esc(cur.foto)+'">' : "")+'</div>';
  SECTIONS.forEach(s => {
    const filled = s.f.filter(fd => f[fd.k]);
    if (!filled.length) return;
    html += '<p style="margin:14px 0 6px;font-weight:700;color:var(--pri);text-transform:uppercase;font-size:12px;letter-spacing:.6px">'+esc(s.t)+'</p><dl>';
    filled.forEach(fd => { html += '<dt>'+esc(fd.l)+'</dt><dd>'+esc(fd.k === "nascimento" ? brDate(f[fd.k]) : f[fd.k])+'</dd>'; });
    html += '</dl>';
  });
  if (cur.assinatura) html += '<p style="margin-top:16px"><strong>Assinatura digital</strong><br><img class="sg" alt="assinatura" src="'+esc(cur.assinatura)+'"></p>';
  $("#dout").insertAdjacentHTML("afterend", html);
}
function fieldInput(fd, val){
  const v = esc(val || "");
  if (fd.type === "select"){
    const opts = '<option value="">—</option>' + fd.opts.map(o => '<option'+(o === val ? " selected" : "")+'>'+esc(o)+'</option>').join("");
    return '<select name="'+fd.k+'">'+opts+'</select>';
  }
  if (fd.type === "textarea") return '<textarea name="'+fd.k+'" rows="3">'+v+'</textarea>';
  return '<input type="'+fd.type+'" name="'+fd.k+'" value="'+v+'"'+(fd.req ? " required" : "")+'>';
}
function renderEdit(){
  const f = flat(cur); newPhoto = null;
  let html = '<form id="edf" novalidate><fieldset><legend>Foto e assinatura</legend><div class="photo"><div class="ph" id="eph">'+(cur.foto ? '<img alt="foto" src="'+esc(cur.foto)+'">' : "sem foto")+'</div><label>Trocar foto (3x4)<input type="file" id="efoto" accept="image/*"></label></div>' +
  '<p class="lbl">Assinatura digital <small>(pode re-assinar por cima ou limpar)</small></p><canvas id="esig" width="640" height="160"></canvas><button type="button" class="btn ghost" id="eclr">Limpar assinatura</button></fieldset>';
  SECTIONS.forEach(s => {
    html += '<fieldset><legend>'+esc(s.t)+'</legend><div class="g">';
    s.f.forEach(fd => { html += '<label class="'+fd.col+'">'+esc(fd.l)+(fd.req ? " *" : "")+fieldInput(fd, f[fd.k])+'</label>'; });
    html += '</div></fieldset>';
  });
  html += '</form>';
  $("#dout").insertAdjacentHTML("afterend", html);
  const cv = $("#esig"), cx = cv.getContext("2d");
  cx.fillStyle = "#fff"; cx.fillRect(0,0,cv.width,cv.height);
  cx.lineWidth = 2.5; cx.lineCap = "round"; cx.strokeStyle = "#111";
  let dr = false;
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX-r.left)*cv.width/r.width, (e.clientY-r.top)*cv.height/r.height]; };
  if (cur.assinatura){ const im = new Image(); im.onload = () => cx.drawImage(im, 0, 0, cv.width, cv.height); im.src = cur.assinatura; }
  cv.addEventListener("pointerdown", e => { dr = true; try { cv.setPointerCapture(e.pointerId); } catch(_){} const [x,y] = pt(e); cx.beginPath(); cx.moveTo(x,y); cx.lineTo(x+.1,y+.1); cx.stroke(); });
  cv.addEventListener("pointermove", e => { if (!dr) return; const [x,y] = pt(e); cx.lineTo(x,y); cx.stroke(); });
  ["pointerup","pointercancel","pointerleave"].forEach(t => cv.addEventListener(t, () => dr = false));
  $("#eclr").addEventListener("click", () => { cx.fillStyle = "#fff"; cx.fillRect(0,0,cv.width,cv.height); });
  $("#efoto").addEventListener("change", e => {
    const file = e.target.files[0]; if (!file) return;
    const im = new Image();
    im.onload = () => {
      const w = 240, h = Math.round(im.height * w / im.width), c = document.createElement("canvas");
      c.width = w; c.height = h; c.getContext("2d").drawImage(im, 0, 0, w, h);
      newPhoto = c.toDataURL("image/jpeg", .72);
      $("#eph").innerHTML = '<img alt="foto" src="'+newPhoto+'">';
      URL.revokeObjectURL(im.src);
    };
    im.src = URL.createObjectURL(file);
  });
}
async function saveEdit(){
  const fm = $("#edf"); if (!fm) return;
  const dout = $("#dout");
  if (!fm.checkValidity()){ fm.reportValidity(); return; }
  const d = Object.fromEntries(new FormData(fm).entries());
  const rec = { dados: {}, updated_at: new Date().toISOString() };
  for (const fd of ALL){ const v = (d[fd.k] || "").trim(); if (fd.top) rec[fd.k] = v; else rec.dados[fd.k] = v; }
  rec.foto = newPhoto || cur.foto || null;
  rec.assinatura = $("#esig").toDataURL("image/png");
  const b = btnSave; b.disabled = true; b.textContent = "Salvando…";
  try {
    await store.update(cur.id, rec);
    cur = Object.assign({}, cur, rec);
    const i = rows.findIndex(x => x.id === cur.id); if (i >= 0) rows[i] = cur;
    makeBackup(rows);
    drawList();
    dout.innerHTML = '<div class="msg ok">Alterações salvas com sucesso.</div>';
    mode = "view"; setTimeout(renderDlg, 600);
  } catch(e){
    if (e && e.code === "23505") dout.innerHTML = '<div class="msg err">Este CPF já está em outra inscrição.</div>';
    else dout.innerHTML = '<div class="msg err">Erro ao salvar: '+esc(e.message || "")+'</div>';
  }
  b.disabled = false; b.textContent = "Salvar alterações";
}

// ---------- PDF / impressão (layout A4) ----------
function printPdf(){
  const f = flat(cur);
  const w = window.open("", "_blank");
  if (!w){ alert("Permita pop-ups para gerar o PDF."); return; }
  let sections = "";
  SECTIONS.forEach(s => {
    const filled = s.f.filter(fd => f[fd.k]);
    if (!filled.length) return;
    sections += '<h3>'+esc(s.t)+'</h3><table class="ff">';
    filled.forEach(fd => { sections += '<tr><th>'+esc(fd.l)+'</th><td>'+esc(fd.k === "nascimento" ? brDate(f[fd.k]) : f[fd.k])+'</td></tr>'; });
    sections += '</table>';
  });
  const termo = '<p class="term">Eu, <strong>'+esc(f.termoNome || cur.nome)+'</strong>, estou ciente e concordo com todos os termos, condições e regulamentos da Associação de Capoeira Senzala conforme apresentados no Estatuto. Declaro compreender as obrigações associadas a esta inscrição, autorizando a divulgação e utilização de imagem, voz e dados pessoais coletados durante a participação em atividades da ASSOCASE, para fins institucionais, em conformidade com a legislação vigente.</p>';
  const sig = cur.assinatura ? '<div class="sig"><img src="'+esc(cur.assinatura)+'" alt="assinatura"><div class="linha"></div><p>'+esc(f.termoNome || cur.nome)+'</p></div>' : "";
  const foto = cur.foto ? '<img class="foto34" src="'+esc(cur.foto)+'" alt="foto">' : "";
  const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ficha · '+esc(cur.nome)+'</title><style>' +
  '@page{size:A4;margin:14mm}body{font:13px/1.45 Georgia,"Times New Roman",serif;color:#111;margin:0}' +
  '.top{display:flex;gap:12px;align-items:center;border-bottom:3px solid #13692f;padding-bottom:8px;margin-bottom:10px}' +
  '.top img{width:64px;height:64px;object-fit:contain}.top h1{font-size:15px;margin:0;text-transform:uppercase}.top p{margin:2px 0;font-size:11px;color:#444}' +
  'h2{text-align:center;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:6px 0 10px}' +
  '.foto34{float:right;width:90px;height:120px;object-fit:cover;border:1px solid #999;margin:0 0 8px 10px}' +
  'h3{font-size:12px;text-transform:uppercase;color:#13692f;border-bottom:1px solid #ccc;margin:12px 0 4px;padding-bottom:2px;break-after:avoid}' +
  'table.ff{width:100%;border-collapse:collapse;margin-bottom:4px}table.ff th,table.ff td{text-align:left;padding:3px 6px;border-bottom:1px dotted #bbb;font-size:12.5px;vertical-align:top}table.ff th{width:38%;font-weight:700;color:#333;background:#f6f8f5}' +
  '.term{font-size:12px;text-align:justify;margin:14px 0 24px}' +
  '.sig{width:240px;margin:30px auto 0;text-align:center}.sig img{max-width:220px;max-height:90px;display:block;margin:0 auto}.sig .linha{border-top:1px solid #111;margin:4px 0}.sig p{margin:0;font-size:12px}' +
  '.foot{margin-top:18px;font-size:10.5px;color:#555;text-align:center;border-top:1px solid #ccc;padding-top:6px}' +
  '.proto{font-size:11px;color:#555;text-align:right;margin-bottom:6px}' +
  'h3,table.ff,.term{break-inside:avoid}' +
  '</style></head><body>' +
  '<div class="top"><img src="'+esc(LOGO)+'" alt=""><div><h1>Associação de Capoeira Senzala</h1><p>Fundada em 29/11/1978 · CNPJ 02.912.638/0001-24 · Belém/PA</p><p>Lei de Utilidade Pública Municipal 8.285, 10/12/2003</p></div></div>' +
  '<h2>Ficha de Inscrição de Associado</h2>' +
  '<p class="proto">Protocolo SEN-'+esc(String(cur.id).slice(0,8).toUpperCase())+' · Inscrito em '+brDate(cur.created_at)+(cur.updated_at ? ' · Editado em '+brDate(cur.updated_at) : "")+'</p>' +
  foto + sections + termo + sig +
  '<p class="foot">Associação de Capoeira Senzala · Belém, Pará, Brasil · Documento gerado em '+new Date().toLocaleDateString("pt-BR")+'</p>' +
  '</body></html>';
  w.document.open(); w.document.write(html); w.document.close();
  w.onload = function(){ w.focus(); setTimeout(() => w.print(), 300); };
}

// ---------- ações da dialog ----------
$("#cls").addEventListener("click", () => dlg.close());
$("#pdf").addEventListener("click", printPdf);
btnSave.addEventListener("click", saveEdit);
$("#del").addEventListener("click", async () => {
  if (!cur || !confirm("Excluir definitivamente a inscrição de "+cur.nome+"?")) return;
  try {
    await store.remove(cur.id);
    dlg.close();
    rows = rows.filter(x => x.id !== cur.id);
    makeBackup(rows);
    drawList();
  } catch(e){ alert("Não foi possível excluir: "+(e.message || "")); }
});

// ---------- CSV ----------
function exportCsv(){
  const q = s => '"'+String(s ?? "").replace(/"/g, '""')+'"';
  const head = ["Data inscrição","Protocolo"].concat(ALL.map(x => x.l));
  const body = rows.map(x => { const f = flat(x); return [brDate(x.created_at), "SEN-"+String(x.id).slice(0,8).toUpperCase()].concat(ALL.map(fd => fd.k === "nascimento" ? brDate(f[fd.k]) : f[fd.k])); });
  const csv = "\ufeff" + [head].concat(body).map(r => r.map(q).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = "inscricoes-senzala-"+new Date().toISOString().slice(0,10)+".csv";
  a.click(); URL.revokeObjectURL(a.href);
}

init();
})();
