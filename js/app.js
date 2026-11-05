/* Ficha pública de inscrição — Senzala (v3)
   Melhorias: rascunho automático (se o navegador cair, nada se perde) e
   fila offline (se a internet cair no envio, a inscrição é guardada no
   aparelho e enviada sozinha quando a conexão voltar). */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const cfg = window.SENZALA_CONFIG || {};
const live = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
const sb = live ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const TOP = ["nome","apelido","cpf","celular","graduacao"];
const DEMO_KEY = "senzala_demo_v1";
const DRAFT_KEY = "senzala_rascunho_v1";
const QUEUE_KEY = "senzala_fila_v1";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const dig = v => String(v).replace(/\D/g, "");

let photo = "", signed = false, saveTimer = null;

const store = {
  async insert(rec){
    if (live){
      const { data, error } = await sb.from("inscricoes").insert(rec).select("id").single();
      if (error) throw error;
      return data && data.id;
    }
    const id = uid();
    const a = JSON.parse(localStorage.getItem(DEMO_KEY) || "[]");
    a.unshift({ id, created_at: new Date().toISOString(), ...rec });
    localStorage.setItem(DEMO_KEY, JSON.stringify(a));
    return id;
  }
};

const nasc = $('[name="nascimento"]');
if (nasc) nasc.max = new Date().toISOString().slice(0,10);

// ---------- máscaras e validações ----------
const mask = {
  cpf: v => dig(v).slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2"),
  celular: v => { v = dig(v).slice(0,11); return v.length>10 ? v.replace(/(\d{2})(\d{5})(\d{4})/,"($1) $2-$3") : v.replace(/(\d{2})(\d{4})(\d{0,4})/,"($1) $2-$3").replace(/-$/,""); },
  cep: v => dig(v).slice(0,8).replace(/(\d{5})(\d)/,"$1-$2")
};
Object.keys(mask).forEach(n => {
  const el = document.querySelector('[name="'+n+'"]');
  if (el) el.addEventListener("input", () => { el.value = mask[n](el.value); el.classList.remove("bad"); });
});
function cpfOk(c){
  c = dig(c);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t=9; t<11; t++){
    let s = 0;
    for (let i=0; i<t; i++) s += c[i] * (t+1-i);
    if ((s*10%11)%10 != c[t]) return false;
  }
  return true;
}
$('[name="cep"]').addEventListener("blur", async e => {
  const c = dig(e.target.value);
  if (c.length !== 8) return;
  try {
    const r = await fetch("https://viacep.com.br/ws/"+c+"/json/");
    const d = await r.json();
    if (d.erro) return;
    const f = document.forms.fm;
    if (d.logradouro) f.endereco.value = d.logradouro;
    if (d.bairro) f.bairro.value = d.bairro;
    f.cidade.value = d.localidade; f.estado.value = d.uf;
  } catch(_){}
});

// ---------- foto ----------
$("#foto").addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return;
  const im = new Image();
  im.onload = () => {
    const w = 240, h = Math.round(im.height * w / im.width), c = document.createElement("canvas");
    c.width = w; c.height = h; c.getContext("2d").drawImage(im, 0, 0, w, h);
    photo = c.toDataURL("image/jpeg", .72);
    $("#ph").innerHTML = '<img alt="foto" src="'+photo+'">';
    URL.revokeObjectURL(im.src);
    scheduleSave();
  };
  im.src = URL.createObjectURL(f);
});

// ---------- assinatura ----------
const cv = $("#sig"), cx = cv.getContext("2d");
let dr = false;
cx.lineWidth = 2.5; cx.lineCap = "round"; cx.strokeStyle = "#111";
function clearSig(){ cx.fillStyle = "#fff"; cx.fillRect(0,0,cv.width,cv.height); signed = false; }
clearSig();
const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX-r.left)*cv.width/r.width, (e.clientY-r.top)*cv.height/r.height]; };
cv.addEventListener("pointerdown", e => {
  dr = true; signed = true; cv.classList.remove("bad-box");
  try { cv.setPointerCapture(e.pointerId); } catch(_){}
  const [x,y] = pt(e); cx.beginPath(); cx.moveTo(x,y); cx.lineTo(x+.1, y+.1); cx.stroke();
});
cv.addEventListener("pointermove", e => { if (!dr) return; const [x,y] = pt(e); cx.lineTo(x,y); cx.stroke(); });
["pointerup","pointercancel","pointerleave"].forEach(t => cv.addEventListener(t, () => { if (dr){ dr = false; scheduleSave(); } }));
$("#clr").addEventListener("click", () => { clearSig(); scheduleSave(); });

// ---------- rascunho automático (backup da ficha) ----------
function collectDraft(){
  const fm = document.forms.fm;
  const d = {};
  new FormData(fm).forEach((v,k) => { if (k !== "site" && k !== "foto") d[k] = v; });
  d.aceite = fm.aceite.checked;
  return { t: new Date().toISOString(), d, photo: photo || null, sig: signed ? cv.toDataURL("image/png") : null };
}
function saveDraft(){
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(collectDraft())); } catch(_){}
}
function scheduleSave(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 400); }
function restoreDraft(){
  let raw;
  try { raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch(_){ raw = null; }
  if (!raw || !raw.d) return;
  const fm = document.forms.fm;
  for (const k in raw.d){
    const el = fm.elements[k];
    if (!el) continue;
    if (k === "aceite") el.checked = !!raw.d[k];
    else el.value = raw.d[k];
  }
  if (raw.photo){ photo = raw.photo; $("#ph").innerHTML = '<img alt="foto" src="'+photo+'">'; }
  if (raw.sig){
    const im = new Image();
    im.onload = () => { cx.drawImage(im, 0, 0, cv.width, cv.height); signed = true; };
    im.src = raw.sig;
  }
  const data = new Date(raw.t).toLocaleString("pt-BR");
  const box = $("#draft");
  box.style.display = "block";
  box.innerHTML = 'Rascunho salvo em <strong>'+esc(data)+'</strong> foi restaurado. ' +
    '<button type="button" class="btn ghost" id="dropDraft" style="padding:4px 10px;font-size:12px;min-height:0">Descartar rascunho</button>';
  $("#dropDraft").addEventListener("click", () => { localStorage.removeItem(DRAFT_KEY); box.style.display = "none"; });
}
document.forms.fm.addEventListener("input", scheduleSave);
document.forms.fm.addEventListener("change", scheduleSave);
restoreDraft();

// ---------- fila offline (envio automático quando a internet voltar) ----------
function isNetErr(e){
  return !navigator.onLine || (e && (e.name === "TypeError" || /fetch|network|offline|load failed/i.test(e.message || "")));
}
function enqueue(rec){
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  q.push(rec);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}
async function processQueue(){
  if (!live) return;
  let q;
  try { q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch(_){ q = []; }
  while (q.length){
    const rec = q[0];
    try { await store.insert(rec); q.shift(); localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
    catch (e){
      if (isNetErr(e)) return; // espera a conexão voltar
      q.shift(); localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); // erro permanente (ex.: CPF duplicado) — descarta
    }
  }
}
window.addEventListener("online", processQueue);
processQueue();

// ---------- envio ----------
function msg(el, t, c){ el.innerHTML = '<div class="msg '+c+'">'+t+'</div>'; }
$("#fm").addEventListener("submit", async ev => {
  ev.preventDefault();
  const fm = ev.target, out = $("#out"); $("#proto").textContent = "";
  if (fm.site.value) return; // honeypot (bot)
  fm.querySelectorAll(".bad").forEach(x => x.classList.remove("bad"));
  if (!fm.checkValidity()){ fm.reportValidity(); return; }
  if (!cpfOk(fm.cpf.value)){ fm.cpf.classList.add("bad"); fm.cpf.focus(); return msg(out, "CPF inválido. Confira os números.", "err"); }
  if (dig(fm.celular.value).length < 10){ fm.celular.classList.add("bad"); fm.celular.focus(); return msg(out, "Informe um celular com DDD.", "err"); }
  if (!signed){ cv.classList.add("bad-box"); cv.scrollIntoView({ block: "center" }); return msg(out, "Assine no quadro de assinatura.", "err"); }

  const d = Object.fromEntries(new FormData(fm).entries());
  ["site","aceite","foto"].forEach(k => delete d[k]);
  const rec = { dados: {}, foto: photo || null, assinatura: cv.toDataURL("image/png") };
  for (const k in d) TOP.includes(k) ? rec[k] = d[k].trim() : rec.dados[k] = d[k].trim();

  const b = $("#send"); b.disabled = true; b.textContent = "Enviando…";
  try {
    const id = await store.insert(rec);
    localStorage.removeItem(DRAFT_KEY);
    fm.reset(); photo = ""; $("#ph").textContent = "foto 3x4"; clearSig();
    const proto = id ? String(id).slice(0,8).toUpperCase() : "";
    msg(out, "Inscrição enviada com sucesso! Obrigado e seja bem-vindo(a) à Senzala. Axé!", "ok");
    if (proto) $("#proto").textContent = "Protocolo de inscrição: SEN-"+proto+" · Guarde este número.";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e){
    if (e && e.code === "23505"){
      msg(out, "Este CPF já possui uma inscrição cadastrada. Procure a administração se precisar atualizar dados.", "err");
    } else if (live && isNetErr(e)){
      enqueue(rec);
      localStorage.removeItem(DRAFT_KEY);
      fm.reset(); photo = ""; $("#ph").textContent = "foto 3x4"; clearSig();
      msg(out, "Sem conexão no momento. Sua inscrição foi <strong>salva neste aparelho</strong> e será enviada automaticamente quando a internet voltar. Mantenha este aplicativo instalado.", "ok");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      msg(out, "Não foi possível enviar agora. Tente novamente em instantes. ("+esc(e.message || "erro")+")", "err");
    }
  }
  b.disabled = false; b.textContent = "Enviar inscrição";
});
})();
