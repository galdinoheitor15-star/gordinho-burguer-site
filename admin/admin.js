/* =========================================================
   Painel da loja: pedidos em tempo real, cardápio e funcionamento
   ========================================================= */
import { connect, isTestMode, staticMenuToDocs } from '../js/data.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const brl = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const imgSrc = (img) => (!img ? '' : /^(data:|https?:)/.test(img) ? img : `../assets/img/${img}.webp`);
const show = (id) => ['screen-setup', 'screen-login', 'screen-app'].forEach((s) => ($('#' + s).hidden = s !== id));

const TIPO = { entrega: ['🛵 Entrega', 'entrega'], retirada: ['🏃 Retirada', 'retirada'], local: ['🍽️ No local', 'local'] };
const PAY = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' };

let be = null;
let orders = [];
let categories = [];
let products = [];
let store = { mode: 'auto', start: '16:00', end: '23:00' };
let selectedCat = null;
let soundOn = true;
let seen = null;
let unsub = [];

/* ---------- Toast ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('is-on'), 2600);
}
function banner(msg, info = false) {
  const b = $('#banner');
  b.hidden = !msg;
  b.textContent = msg || '';
  b.classList.toggle('is-info', info);
}

/* ---------- Som ---------- */
let audio = null;
function ensureAudio() {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch { /* sem áudio */ }
}
function ding() {
  if (!soundOn || !audio) return;
  const t = audio.currentTime;
  [[880, 0], [1320, 0.16], [880, 0.5], [1320, 0.66]].forEach(([f, d]) => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.4, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.3);
    o.connect(g).connect(audio.destination);
    o.start(t + d); o.stop(t + d + 0.32);
  });
}
setInterval(() => { if (orders.some((o) => o.status === 'novo')) ding(); }, 6000);
$('#sound-btn').addEventListener('click', (e) => {
  ensureAudio();
  soundOn = !soundOn;
  e.currentTarget.setAttribute('aria-pressed', soundOn);
  e.currentTarget.textContent = soundOn ? '🔔' : '🔕';
  if (soundOn) ding();
});
document.addEventListener('pointerdown', ensureAudio, { once: true });

/* ---------- Início ---------- */
async function boot() {
  try { be = await connect(); } catch (err) { console.error(err); }
  if (!be) return show('screen-setup');
  $('#login-test').hidden = be.mode !== 'teste';
  if (be.mode === 'teste') $('#login-email').value = 'teste@gordinho.com';
  be.onAuth((user) => {
    unsub.forEach((u) => u()); unsub = [];
    if (!user) return show('screen-login');
    show('screen-app');
    if (be.mode === 'teste') banner('Modo de teste: os dados ficam só neste navegador. Configure o Firebase para usar de verdade.', true);
    start();
  });
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  ensureAudio();
  const btn = $('#login-btn'), err = $('#login-error');
  btn.disabled = true; err.hidden = true;
  try {
    await be.signIn($('#login-email').value.trim(), $('#login-pw').value);
  } catch (ex) {
    err.hidden = false;
    err.textContent = /invalid|wrong|not-found/.test(ex.code || '') ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar. Verifique a internet.';
  } finally { btn.disabled = false; }
});
$('#logout-btn').addEventListener('click', () => be.signOut());

function start() {
  seen = null;
  unsub.push(be.onOrders((list) => {
    const fresh = seen ? list.filter((o) => o.status === 'novo' && !seen.has(o.id)) : [];
    seen = new Set(list.map((o) => o.id));
    orders = list;
    renderOrders();
    if (fresh.length) { ding(); toast(`Novo pedido #${fresh.map((o) => o.number).join(', #')}`); }
    if (!$('#banner').classList.contains('is-info')) banner('');
  }, (err) => {
    console.error(err);
    banner(err.code === 'permission-denied' ? 'Esta conta não tem acesso aos pedidos. Adicione o e-mail dela nas regras do Firestore (veja FIREBASE.md).' : 'Conexão com o banco falhou. Recarregue a página.');
  }));
  unsub.push(be.onMenu((m) => { categories = m.categories; products = m.products; renderMenu(); }));
  unsub.push(be.onStore((s) => { if (s) store = { ...store, ...s }; renderStore(); }));
}

/* ---------- Abas ---------- */
$$('.view-tab').forEach((t) => t.addEventListener('click', () => {
  $$('.view-tab').forEach((x) => x.classList.toggle('is-active', x === t));
  $$('.view').forEach((v) => (v.hidden = v.id !== 'view-' + t.dataset.view));
}));

/* ---------- Pedidos ---------- */
const minutesAgo = (ms) => Math.max(0, Math.round((Date.now() - ms) / 60000));
const hhmm = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const phoneLink = (f) => { let d = String(f || '').replace(/\D/g, ''); if (d.length <= 11) d = '55' + d; return d; };

function nextAction(o) {
  if (o.status === 'novo') return ['preparo', 'Aceitar e preparar', 'btn--primary'];
  if (o.status === 'preparo') return ['entrega', o.tipo === 'entrega' ? 'Saiu para entrega' : 'Pronto', 'btn--primary'];
  if (o.status === 'entrega') return ['concluido', 'Concluir', 'btn--ok'];
  return null;
}
function customerMsg(o) {
  const n = o.customer?.nome?.split(' ')[0] || '';
  const m = {
    novo: `Oi ${n}! Recebemos seu pedido #${o.number} no Gordinho Burguer 🍔`,
    preparo: `Oi ${n}! Seu pedido #${o.number} já está na chapa 🔥`,
    entrega: o.tipo === 'entrega' ? `Oi ${n}! Seu pedido #${o.number} saiu para entrega 🛵` : `Oi ${n}! Seu pedido #${o.number} está pronto, pode vir buscar 😉`,
    concluido: `Obrigado pelo pedido, ${n}! Bom apetite 🍔`,
    cancelado: `Oi ${n}, tivemos um problema com o pedido #${o.number}.`
  };
  return m[o.status] || '';
}

function orderCard(o) {
  const [tipoLabel, tipoCls] = TIPO[o.tipo] || TIPO.entrega;
  const mins = minutesAgo(o.createdAt);
  const late = ['novo', 'preparo'].includes(o.status) && mins >= 40;
  const next = nextAction(o);
  const active = !['concluido', 'cancelado'].includes(o.status);
  return `
    <article class="ocard st-${o.status}" data-id="${o.id}">
      <div class="ocard__head">
        <span class="ocard__num">#${o.number}</span>
        <span class="chip chip--${tipoCls}">${tipoLabel}</span>
        ${o.status === 'cancelado' ? '<span class="chip chip--cancel">Cancelado</span>' : ''}
        <span class="ocard__time${late ? ' is-late' : ''}" data-time="${o.createdAt}">${hhmm(o.createdAt)} · há ${mins} min</span>
      </div>
      <div class="ocard__cust">
        <b>${esc(o.customer?.nome)}</b>
        <a href="https://wa.me/${phoneLink(o.customer?.fone)}?text=${encodeURIComponent(customerMsg(o))}" target="_blank" rel="noopener">${esc(o.customer?.fone)}</a>
      </div>
      ${o.address ? `<div class="ocard__addr">📍 ${esc(o.address.rua)} — ${esc(o.address.bairro)}${o.address.referencia ? ` · ${esc(o.address.referencia)}` : ''}</div>` : ''}
      <ul class="ocard__items">
        ${(o.items || []).map((i) => `<li><b>${i.qty}x</b><span>${esc(i.name)}${i.opts?.length ? `<small>${i.opts.map((x) => esc(x.n)).join(' · ')}</small>` : ''}</span><span class="price">${brl(i.unit * i.qty)}</span></li>`).join('')}
      </ul>
      ${o.obs ? `<p class="ocard__obs">📝 ${esc(o.obs)}</p>` : ''}
      <div class="ocard__pay"><span>${PAY[o.payment?.method] || ''}${o.payment?.troco ? ` · troco p/ R$ ${esc(o.payment.troco)}` : ''}${o.tipo === 'entrega' ? ' · + entrega' : ''}</span><b>${brl(o.subtotal)}</b></div>
      <div class="ocard__actions">
        ${next ? `<button class="btn ${next[2]}" data-act="status" data-to="${next[0]}">${next[1]}</button>` : ''}
        <button class="btn btn--small" data-act="print">Imprimir</button>
        ${active ? '<button class="btn btn--small btn--danger" data-act="cancel">Cancelar</button>' : ''}
      </div>
    </article>`;
}

let showAllFim = false;
function renderOrders() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cols = { novo: [], preparo: [], entrega: [], fim: [] };
  orders.forEach((o) => {
    if (cols[o.status]) cols[o.status].push(o);
    else if (o.createdAt >= today.getTime()) cols.fim.push(o);
  });
  ['novo', 'preparo', 'entrega'].forEach((k) => cols[k].sort((a, b) => a.createdAt - b.createdAt));
  cols.fim.sort((a, b) => b.createdAt - a.createdAt);
  Object.entries(cols).forEach(([k, list]) => {
    const col = $(`.col[data-col="${k}"]`);
    $('h2 span', col).textContent = list.length;
    const shown = k === 'fim' && !showAllFim ? list.slice(0, 8) : list;
    $('.col__list', col).innerHTML = list.length
      ? shown.map(orderCard).join('') + (shown.length < list.length ? `<button class="btn btn--small more-fim" data-act="more">Ver todos (${list.length})</button>` : '')
      : `<div class="col__empty">${k === 'novo' ? 'Nenhum pedido novo. Assim que chegar, toca o alarme 🔔' : 'Nada aqui'}</div>`;
  });
  const novos = cols.novo.length;
  const badge = $('#badge-novos');
  badge.hidden = !novos;
  badge.textContent = novos;
  document.title = novos ? `(${novos}) Novo pedido! · Painel` : 'Painel · Gordinho Burguer';

  const valid = orders.filter((o) => o.createdAt >= today.getTime() && o.status !== 'cancelado');
  const total = valid.reduce((s, o) => s + (o.subtotal || 0), 0);
  $('#summary').innerHTML = `
    <div class="sum"><small>Pedidos hoje</small><b>${valid.length}</b></div>
    <div class="sum"><small>Vendido hoje</small><b>${brl(total)}</b></div>
    <div class="sum"><small>Ticket médio</small><b>${brl(valid.length ? total / valid.length : 0)}</b></div>
    <div class="sum"><small>Em andamento</small><b>${novos + cols.preparo.length + cols.entrega.length}</b></div>`;
}
setInterval(() => $$('[data-time]').forEach((el) => {
  const ms = Number(el.dataset.time);
  el.textContent = `${hhmm(ms)} · há ${minutesAgo(ms)} min`;
}), 30000);

$('#board').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  if (btn.dataset.act === 'more') { showAllFim = true; return renderOrders(); }
  const o = orders.find((x) => x.id === btn.closest('.ocard').dataset.id);
  if (!o) return;
  if (btn.dataset.act === 'print') return printOrder(o);
  if (btn.dataset.act === 'cancel' && !btn.classList.contains('is-armed')) {
    btn.classList.add('is-armed');
    btn.textContent = 'Confirmar cancelamento';
    setTimeout(() => { btn.classList.remove('is-armed'); btn.textContent = 'Cancelar'; }, 3500);
    return;
  }
  const to = btn.dataset.act === 'cancel' ? 'cancelado' : btn.dataset.to;
  btn.disabled = true;
  try {
    await be.updateOrder(o.id, { status: to, [`statusAt.${to}`]: Date.now() });
    if (to === 'preparo' && localStorage.getItem('gb-autoprint') === '1') printOrder(o);
  } catch (err) {
    console.error(err);
    toast('Não foi possível atualizar o pedido');
    btn.disabled = false;
  }
});

function printOrder(o) {
  const w = window.open('', '_blank', 'width=380,height=640');
  if (!w) return toast('Permita pop-ups para imprimir');
  const [tipoLabel] = TIPO[o.tipo] || TIPO.entrega;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${o.number}</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      body { font: 13px/1.35 "Courier New", monospace; width: 72mm; margin: 0 auto; color: #000; }
      h1 { font-size: 22px; text-align: center; margin: 4px 0; }
      .c { text-align: center; } hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; } td { vertical-align: top; padding: 2px 0; } td:last-child { text-align: right; white-space: nowrap; }
      .opt { padding-left: 14px; font-size: 12px; } .big { font-size: 16px; font-weight: bold; }
    </style></head><body>
    <div class="c"><b>GORDINHO BURGUER</b><br>${new Date(o.createdAt).toLocaleString('pt-BR')}</div>
    <h1>PEDIDO #${o.number}</h1>
    <div class="c big">${tipoLabel.replace(/^\S+\s/, '').toUpperCase()}</div><hr>
    <b>${esc(o.customer?.nome)}</b><br>${esc(o.customer?.fone)}<br>
    ${o.address ? `${esc(o.address.rua)}<br>${esc(o.address.bairro)}${o.address.referencia ? `<br>Ref: ${esc(o.address.referencia)}` : ''}` : ''}<hr>
    <table>${(o.items || []).map((i) => `<tr><td><b>${i.qty}x ${esc(i.name)}</b>${(i.opts || []).map((x) => `<div class="opt">+ ${esc(x.n)}</div>`).join('')}</td><td>${brl(i.unit * i.qty)}</td></tr>`).join('')}</table><hr>
    ${o.obs ? `<b>OBS:</b> ${esc(o.obs)}<hr>` : ''}
    <table><tr><td>Subtotal</td><td>${brl(o.subtotal)}</td></tr>${o.tipo === 'entrega' ? '<tr><td>Taxa de entrega</td><td>______</td></tr>' : ''}</table>
    <div>Pagamento: ${PAY[o.payment?.method] || ''}${o.payment?.troco ? ` (troco p/ R$ ${esc(o.payment.troco)})` : ''}</div>
    <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };<\/script>
    </body></html>`);
  w.document.close();
}

/* ---------- Cardápio ---------- */
function renderMenu() {
  $('#import-box').hidden = products.length > 0;
  if (!categories.find((c) => c.id === selectedCat)) selectedCat = categories[0]?.id || null;
  $('#cat-list').innerHTML = categories.map((c, i) => `
    <li class="cat${c.id === selectedCat ? ' is-active' : ''}" data-id="${c.id}">
      <button type="button" data-cat-act="select">${esc(c.name)} <small>${products.filter((p) => p.categoryId === c.id).length}</small></button>
      <button class="mini" type="button" data-cat-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
      <button class="mini" type="button" data-cat-act="down" ${i === categories.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button>
      <button class="mini" type="button" data-cat-act="rename" aria-label="Renomear">✎</button>
      <button class="mini" type="button" data-cat-act="delete" aria-label="Excluir">🗑</button>
    </li>`).join('');
  renderProducts();
}
function renderProducts() {
  const q = $('#prod-search').value.trim().toLowerCase();
  const cat = categories.find((c) => c.id === selectedCat);
  $('#prods-title').textContent = q ? 'Resultados da busca' : cat ? cat.name : 'Produtos';
  const list = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products.filter((p) => p.categoryId === selectedCat);
  $('#prod-list').innerHTML = list.length ? list.map((p) => {
    const src = imgSrc(p.img);
    return `
      <div class="prod${p.available === false ? ' is-out' : ''}" data-id="${p.id}">
        ${src ? `<img class="prod__img" src="${src}" alt="" loading="lazy">` : '<span class="prod__img">🍔</span>'}
        <div class="prod__info"><b>${esc(p.name)}</b><small>${p.available === false ? 'Esgotado' : 'Disponível'}${p.groups?.length ? ` · ${p.groups.length} grupo(s) de complementos` : ''}</small></div>
        <span class="prod__price">${brl(p.price)}</span>
        <div class="prod__actions">
          <button class="switch" type="button" role="switch" aria-checked="${p.available !== false}" data-p-act="avail" title="Disponível"></button>
          <button class="mini${p.featured ? ' is-on' : ''}" type="button" data-p-act="feat" title="Destaque">★</button>
          <button class="mini" type="button" data-p-act="edit" title="Editar">✎</button>
          <button class="mini" type="button" data-p-act="delete" title="Excluir">🗑</button>
        </div>
      </div>`;
  }).join('') : '<p class="muted">Nenhum produto aqui ainda.</p>';
}
$('#prod-search').addEventListener('input', renderProducts);

$('#cat-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-cat-act]');
  if (!btn) return;
  const id = btn.closest('.cat').dataset.id;
  const i = categories.findIndex((c) => c.id === id);
  const c = categories[i];
  const act = btn.dataset.catAct;
  if (act === 'select') { selectedCat = id; $('#prod-search').value = ''; return renderMenu(); }
  if (act === 'up' || act === 'down') {
    const j = act === 'up' ? i - 1 : i + 1;
    const other = categories[j];
    await Promise.all([be.saveCategory({ id: c.id, name: c.name, order: j }), be.saveCategory({ id: other.id, name: other.name, order: i })]);
    return;
  }
  if (act === 'rename') {
    const li = btn.closest('.cat');
    li.innerHTML = `<form class="inline-form" style="flex:1"><input value="${esc(c.name)}" aria-label="Novo nome"><button class="btn btn--small" type="submit">OK</button></form>`;
    const f = $('form', li);
    $('input', f).focus();
    f.addEventListener('submit', async (ev) => { ev.preventDefault(); const name = $('input', f).value.trim(); if (name) await be.saveCategory({ id: c.id, name, order: c.order ?? i }); renderMenu(); });
    return;
  }
  if (act === 'delete') {
    if (products.some((p) => p.categoryId === id)) return toast('Mova ou exclua os produtos desta categoria antes');
    if (!btn.classList.contains('is-armed')) { btn.classList.add('is-armed'); btn.textContent = '?'; return setTimeout(() => { btn.classList.remove('is-armed'); btn.textContent = '🗑'; }, 3000); }
    await be.deleteCategory(id);
    toast('Categoria excluída');
  }
});
$('#cat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#cat-name').value.trim();
  if (!name) return;
  selectedCat = await be.saveCategory({ name, order: categories.length });
  $('#cat-name').value = '';
  toast('Categoria criada');
});

$('#prod-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-p-act]');
  if (!btn) return;
  const p = products.find((x) => x.id === btn.closest('.prod').dataset.id);
  const act = btn.dataset.pAct;
  try {
    if (act === 'avail') { await be.saveProduct({ ...p, available: p.available === false }); toast(p.available === false ? `${p.name} disponível` : `${p.name} marcado como esgotado`); }
    if (act === 'feat') await be.saveProduct({ ...p, featured: !p.featured });
    if (act === 'edit') openEditor(p);
    if (act === 'delete') {
      if (!btn.classList.contains('is-armed')) { btn.classList.add('is-armed'); btn.textContent = '?'; return setTimeout(() => { btn.classList.remove('is-armed'); btn.textContent = '🗑'; }, 3000); }
      await be.deleteProduct(p.id);
      toast('Produto excluído');
    }
  } catch (err) { console.error(err); toast('Não foi possível salvar'); }
});

$('#import-btn').addEventListener('click', async (e) => {
  e.currentTarget.disabled = true;
  try {
    const { categories: c, products: p } = staticMenuToDocs(window.MENU, window.HIGHLIGHTS);
    await be.importMenu(c, p);
    toast(`${p.length} produtos importados`);
  } catch (err) { console.error(err); toast('Falha ao importar'); e.currentTarget.disabled = false; }
});

/* ---------- Editor de produto ---------- */
const modal = $('#prod-modal');
const pf = $('#prod-form');
let editing = null;
let editImg = '';

function paintImg() {
  $('#img-preview').innerHTML = editImg ? `<img src="${imgSrc(editImg)}" alt="">` : '<span>Sem foto</span>';
}
function groupHTML(g = { name: '', min: 0, max: 1, options: [] }) {
  return `
    <div class="grp">
      <div class="grp__top">
        <label><span>Nome do grupo</span><input data-k="name" value="${esc(g.name)}" placeholder="Ex.: Adicionais"></label>
        <label><span>Mínimo</span><input data-k="min" type="number" min="0" value="${Number(g.min) || 0}"></label>
        <label><span>Máximo</span><input data-k="max" type="number" min="1" value="${Number(g.max) || 1}"></label>
        <button class="btn btn--small btn--danger" type="button" data-g-act="del">Remover</button>
      </div>
      <div class="grp__opts">${(g.options || []).map(optHTML).join('')}</div>
      <button class="btn btn--small btn--ghost" type="button" data-g-act="add-opt">+ Opção</button>
    </div>`;
}
function optHTML(o = { name: '', price: 0 }) {
  return `<div class="opt-row"><input data-k="oname" value="${esc(o.name)}" placeholder="Ex.: Bacon extra"><input data-k="oprice" type="number" step="0.01" min="0" value="${Number(o.price) || 0}" aria-label="Preço adicional"><button class="btn btn--small btn--ghost" type="button" data-g-act="del-opt" aria-label="Remover opção">✕</button></div>`;
}
function openEditor(p) {
  editing = p || null;
  $('#prod-modal-title').textContent = p ? 'Editar produto' : 'Novo produto';
  $('#prod-cat').innerHTML = categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  pf.elements.name.value = p?.name || '';
  pf.elements.desc.value = p?.desc || '';
  pf.elements.price.value = p?.price ?? '';
  pf.elements.categoryId.value = p?.categoryId || selectedCat || categories[0]?.id || '';
  pf.elements.tag.value = p?.tag || '';
  pf.elements.subgroup.value = p?.subgroup || '';
  pf.elements.available.checked = p ? p.available !== false : true;
  pf.elements.featured.checked = !!p?.featured;
  editImg = p?.img || '';
  paintImg();
  $('#groups').innerHTML = (p?.groups || []).map(groupHTML).join('');
  modal.showModal();
}
$('#new-prod').addEventListener('click', () => {
  if (!categories.length) return toast('Crie uma categoria primeiro');
  openEditor(null);
});
$('#add-group').addEventListener('click', () => $('#groups').insertAdjacentHTML('beforeend', groupHTML()));
$('#groups').addEventListener('click', (e) => {
  const b = e.target.closest('[data-g-act]');
  if (!b) return;
  if (b.dataset.gAct === 'del') b.closest('.grp').remove();
  if (b.dataset.gAct === 'add-opt') $('.grp__opts', b.closest('.grp')).insertAdjacentHTML('beforeend', optHTML());
  if (b.dataset.gAct === 'del-opt') b.closest('.opt-row').remove();
});
$('#img-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 900 / bmp.width);
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    let q = 0.75;
    let data = c.toDataURL('image/webp', q);
    while (data.length > 300000 && q > 0.3) { q -= 0.1; data = c.toDataURL('image/webp', q); }
    editImg = data;
    paintImg();
  } catch { toast('Não consegui ler essa imagem'); }
  e.target.value = '';
});
$('#img-remove').addEventListener('click', () => { editImg = ''; paintImg(); });

pf.addEventListener('submit', (e) => {
  e.preventDefault();
  const save = e.submitter?.value === 'save';
  modal.close();
  if (save) saveProductForm();
});
async function saveProductForm() {
  const f = pf.elements;
  const groups = $$('.grp', $('#groups')).map((g) => ({
    name: $('[data-k="name"]', g).value.trim(),
    min: Number($('[data-k="min"]', g).value) || 0,
    max: Math.max(1, Number($('[data-k="max"]', g).value) || 1),
    options: $$('.opt-row', g).map((r) => ({ name: $('[data-k="oname"]', r).value.trim(), price: Number($('[data-k="oprice"]', r).value) || 0 })).filter((o) => o.name)
  })).filter((g) => g.name && g.options.length);
  const sameCat = products.filter((p) => p.categoryId === f.categoryId.value);
  const data = {
    ...(editing || {}),
    name: f.name.value.trim(),
    desc: f.desc.value.trim(),
    price: Number(f.price.value) || 0,
    categoryId: f.categoryId.value,
    tag: f.tag.value.trim(),
    subgroup: f.subgroup.value.trim(),
    available: f.available.checked,
    featured: f.featured.checked,
    img: editImg,
    groups,
    order: editing && editing.categoryId === f.categoryId.value ? editing.order ?? 0 : sameCat.length
  };
  if (!data.name) return toast('O produto precisa de um nome');
  try {
    await be.saveProduct(data);
    toast('Produto salvo');
  } catch (err) { console.error(err); toast('Não foi possível salvar o produto'); }
}

/* ---------- Loja ---------- */
function storeOpenNow() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Recife', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value) % 24, m = Number(parts.find((p) => p.type === 'minute').value);
  const toMin = (s) => { const [a, b] = String(s).split(':').map(Number); return a * 60 + (b || 0); };
  const now = h * 60 + m, a = toMin(store.start), b = toMin(store.end);
  const inHours = a <= b ? now >= a && now < b : now >= a || now < b;
  return store.mode === 'open' || (store.mode === 'auto' && inHours);
}
function renderStore() {
  $$('#store-switch button').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === store.mode));
  const f = $('#store-form');
  if (!f.contains(document.activeElement)) {
    f.elements.mode.value = store.mode;
    f.elements.start.value = store.start;
    f.elements.end.value = store.end;
  }
  $('#store-now').textContent = storeOpenNow() ? '🟢 O site está aceitando pedidos agora.' : '🔴 O site está mostrando a loja como fechada.';
}
setInterval(() => be && renderStore(), 60000);
$('#store-switch').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  await be.saveStore({ mode: b.dataset.mode });
  toast({ open: 'Loja aberta', closed: 'Loja fechada', auto: 'Seguindo o horário' }[b.dataset.mode]);
});
$('#store-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget.elements;
  await be.saveStore({ mode: f.mode.value, start: f.start.value || '16:00', end: f.end.value || '23:00' });
  toast('Funcionamento salvo');
});

if (isTestMode()) document.title = 'Painel (teste) · Gordinho Burguer';
boot();
