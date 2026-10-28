/* =========================================================
   Sacola, complementos, checkout e acompanhamento do pedido.
   Com o painel configurado (Firebase), o pedido vai direto para
   a loja; sem ele, segue pronto para o WhatsApp.
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const brl = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GB = window.GB;
  const STORE_KEY = 'gordinho-sacola-v2';
  const CUSTOMER_KEY = 'gordinho-cliente';
  const ORDER_KEY = 'gordinho-pedido-ativo';
  const STATUS = {
    novo: { label: 'Recebido', title: 'Recebemos seu pedido!', msg: 'A loja já está vendo seu pedido e vai começar a preparar.' },
    preparo: { label: 'Em preparo', title: 'Tá na chapa! 🔥', msg: 'Seu pedido está sendo preparado agora.' },
    entrega: { label: 'Saiu para entrega', title: 'Saiu para entrega 🛵', msg: 'O motoboy já está a caminho.' },
    concluido: { label: 'Entregue', title: 'Pedido concluído', msg: 'Bom apetite! Obrigado por pedir no Gordinho.' },
    cancelado: { label: 'Cancelado', title: 'Pedido cancelado', msg: 'A loja cancelou este pedido. Fale com a gente no WhatsApp se tiver dúvida.' }
  };
  const pickupLabel = { entrega: 'Pronto para retirada', title: 'Pode vir buscar! 🏃', msg: 'Seu pedido está pronto no balcão.' };

  const load = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
  const save = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

  let cart = load(STORE_KEY, []);
  let step = 'cart';
  let active = load(ORDER_KEY, null);
  let stopWatch = null;

  const fab = $('#cart-fab');
  const countEl = $('#cart-count');
  const drawer = $('#drawer');
  const panel = $('.drawer__panel', drawer);
  const body = $('.drawer__body', drawer);
  const listEl = $('#cart-list');
  const totalEl = $('#cart-total');
  const nextBtn = $('#cart-next');
  const backBtn = $('#cart-back');
  const form = $('#checkout-form');
  const toast = $('#toast');

  /* ---------- Elementos extras ---------- */
  // opção "comer no local"
  form.querySelector('input[name="tipo"][value="retirada"]').closest('label')
    .insertAdjacentHTML('afterend', '<label><input type="radio" name="tipo" value="local"><span>🍽️ Comer aqui</span></label>');

  // acompanhamento
  body.insertAdjacentHTML('beforeend', `
    <section class="pane pane--track" aria-live="polite">
      <span class="track__num" id="track-num"></span>
      <h3 class="display" id="track-title"></h3>
      <p id="track-msg"></p>
      <ol class="timeline" id="timeline"></ol>
      <div class="track__summary" id="track-summary"></div>
      <button class="btn btn--ghost" type="button" id="track-new"><span>Fazer outro pedido</span></button>
    </section>`);

  // chip "acompanhar pedido"
  document.body.insertAdjacentHTML('beforeend', '<button class="track-chip" id="track-chip" type="button" hidden><i></i><span></span></button>');
  const chip = $('#track-chip');

  // folha de complementos
  document.body.insertAdjacentHTML('beforeend', `
    <div class="sheet" id="sheet" aria-hidden="true">
      <div class="sheet__scrim" data-sheet-close></div>
      <div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1">
        <button class="drawer__close sheet__x" type="button" data-sheet-close aria-label="Fechar">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
        <div class="sheet__body" data-lenis-prevent>
          <div class="sheet__media"><img id="sheet-img" alt=""></div>
          <div class="sheet__info">
            <h3 class="display" id="sheet-title"></h3>
            <p id="sheet-desc"></p>
            <form id="sheet-form" class="opt-groups"></form>
          </div>
        </div>
        <footer class="sheet__foot">
          <div class="stepper"><button type="button" data-sheet-dec aria-label="Diminuir">−</button><output id="sheet-qty">1</output><button type="button" data-sheet-inc aria-label="Aumentar">+</button></div>
          <button class="btn btn--primary" type="button" id="sheet-add"><span>Adicionar</span><b id="sheet-total"></b></button>
        </footer>
      </div>
    </div>`);
  const sheet = $('#sheet');
  const sheetForm = $('#sheet-form');

  /* ---------- Sacola ---------- */
  const lineKey = (id, opts) => id + '|' + opts.map((o) => o.g + ':' + o.n).join(',');
  const qtyTotal = () => cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = () => cart.reduce((s, l) => s + l.qty * l.unit, 0);

  function paint() {
    save(STORE_KEY, cart);
    const n = qtyTotal();
    countEl.textContent = n;
    fab.classList.toggle('has-items', n > 0);
    totalEl.textContent = brl(subtotal());
    if (!cart.length) {
      listEl.innerHTML = `
        <div class="cart-empty">
          <svg viewBox="0 0 40 40" width="64" height="64"><use href="#i-burger"/></svg>
          <b>Sua sacola está vazia</b>
          <p>Escolha seus lanches no cardápio e eles aparecem aqui.</p>
          <a class="btn btn--ghost" href="#cardapio" data-close>Ver cardápio</a>
        </div>`;
    } else {
      listEl.innerHTML = cart.map((l, idx) => {
        const src = GB.imgSrc(l.img);
        return `
          <div class="cart-line" data-idx="${idx}">
            ${src ? `<img src="${src}" alt="">` : '<span class="cart-line__ph"><svg viewBox="0 0 40 40"><use href="#i-burger"/></svg></span>'}
            <div class="cart-line__info">
              <b>${esc(l.name)}</b>
              ${l.opts.length ? `<small>${l.opts.map((o) => esc(o.n)).join(' · ')}</small>` : ''}
              <span>${brl(l.unit * l.qty)}</span>
            </div>
            <div class="stepper">
              <button type="button" data-dec aria-label="Diminuir ${esc(l.name)}">−</button>
              <output>${l.qty}</output>
              <button type="button" data-inc aria-label="Aumentar ${esc(l.name)}">+</button>
            </div>
          </div>`;
      }).join('');
    }
    nextBtn.disabled = !cart.length;
    paintBadges();
  }

  function paintBadges() {
    const per = new Map();
    cart.forEach((l) => per.set(l.id, (per.get(l.id) || 0) + l.qty));
    $$('[data-add]').forEach((btn) => {
      const q = per.get(btn.dataset.add) || 0;
      const host = btn.closest('.mcard, .hcard, .mlist__item');
      if (!host) return;
      host.dataset.qty = q || '';
      const badge = host.querySelector('.qty-badge');
      if (badge) badge.textContent = q ? `${q} na sacola` : '';
    });
  }

  // preços e disponibilidade acompanham o cardápio do painel
  function syncWithCatalog() {
    let changed = false;
    cart = cart.filter((l) => {
      const it = GB.catalog.get(l.id);
      if (!it || !it.available) { changed = true; return false; }
      const unit = it.price + l.opts.reduce((s, o) => s + o.p, 0);
      if (unit !== l.unit) { l.unit = unit; changed = true; }
      l.img = it.img;
      return true;
    });
    if (changed) showToast('Sua sacola foi atualizada com o cardápio de agora');
    paint();
  }
  window.addEventListener('gb:menu', syncWithCatalog);

  function addLine(item, opts, qty, fromEl) {
    const key = lineKey(item.id, opts);
    const unit = item.price + opts.reduce((s, o) => s + o.p, 0);
    const line = cart.find((l) => l.key === key);
    if (line) line.qty += qty;
    else cart.push({ key, id: item.id, name: item.name, img: item.img, unit, qty, opts });
    paint();
    flyToCart(fromEl);
    showToast(`<b>${esc(item.name)}</b> foi pra sacola`);
  }

  function flyToCart(fromEl) {
    if (reduced || !fromEl || !window.gsap) return bump();
    const a = fromEl.getBoundingClientRect();
    const b = fab.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'fly-dot';
    document.body.appendChild(dot);
    const sx = a.left + a.width / 2, sy = a.top + a.height / 2;
    const ex = b.left + b.width / 2, ey = b.top + b.height / 2;
    const p = { t: 0 };
    gsap.to(p, {
      t: 1, duration: 0.75, ease: 'power2.in',
      onUpdate: () => {
        const t = p.t;
        gsap.set(dot, { x: sx + (ex - sx) * t, y: sy + (ey - sy) * t - Math.sin(t * Math.PI) * 160, scale: 1 - t * 0.5 });
      },
      onComplete: () => { dot.remove(); bump(); }
    });
  }
  function bump() {
    if (reduced || !window.gsap) return;
    gsap.fromTo(fab, { scale: 1 }, { scale: 1.18, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' });
    gsap.fromTo(countEl, { scale: 0.4 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  }

  let toastTimer;
  function showToast(html) {
    toast.innerHTML = html;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2600);
  }

  /* ---------- Complementos ---------- */
  let sheetItem = null, sheetQty = 1, sheetFrom = null;
  const groupRule = (g) => {
    const min = Number(g.min) || 0, max = Number(g.max) || 1;
    if (min && min === max) return `Escolha ${min}`;
    if (min) return `Escolha de ${min} a ${max}`;
    return max === 1 ? 'Opcional, até 1' : `Opcional, até ${max}`;
  };
  function openSheet(item, fromEl) {
    sheetItem = item; sheetQty = 1; sheetFrom = fromEl;
    const src = GB.imgSrc(item.img);
    $('#sheet-img').src = src || '';
    $('.sheet__media', sheet).hidden = !src;
    $('#sheet-title').textContent = item.name;
    $('#sheet-desc').textContent = item.desc || '';
    sheetForm.innerHTML = item.groups.map((g, gi) => {
      const multi = (Number(g.max) || 1) > 1;
      return `
        <fieldset class="opt-group" data-gi="${gi}">
          <legend><b>${esc(g.name)}</b><small>${groupRule(g)}</small>${Number(g.min) ? '<span class="req">Obrigatório</span>' : ''}</legend>
          ${(g.options || []).map((o, oi) => `
            <label class="opt">
              <input type="${multi ? 'checkbox' : 'radio'}" name="g${gi}" value="${oi}">
              <span class="opt__name">${esc(o.name)}</span>
              <span class="opt__price">${Number(o.price) ? '+ ' + brl(o.price) : ''}</span>
              <i class="opt__mark"></i>
            </label>`).join('')}
        </fieldset>`;
    }).join('');
    paintSheet();
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    window.__lenis?.stop();
    setTimeout(() => $('.sheet__panel', sheet).focus(), 50);
  }
  function closeSheet() {
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    if (!drawer.classList.contains('is-open')) window.__lenis?.start();
  }
  function chosenOpts() {
    return sheetItem.groups.flatMap((g, gi) =>
      $$(`input[name="g${gi}"]:checked`, sheetForm).map((inp) => {
        const o = g.options[Number(inp.value)];
        return { g: g.name, n: o.name, p: Number(o.price) || 0 };
      }));
  }
  function paintSheet() {
    const unit = sheetItem.price + chosenOpts().reduce((s, o) => s + o.p, 0);
    $('#sheet-qty').textContent = sheetQty;
    $('#sheet-total').textContent = brl(unit * sheetQty);
  }
  sheetForm.addEventListener('change', (e) => {
    const fs = e.target.closest('.opt-group');
    const g = sheetItem.groups[Number(fs.dataset.gi)];
    const max = Number(g.max) || 1;
    const checked = $$('input:checked', fs);
    if (e.target.type === 'checkbox' && checked.length > max) {
      e.target.checked = false;
      showToast(`Você pode escolher até ${max} em ${esc(g.name)}`);
    }
    fs.classList.remove('is-invalid');
    paintSheet();
  });
  $('#sheet-add').addEventListener('click', () => {
    let ok = true;
    sheetItem.groups.forEach((g, gi) => {
      const fs = $(`.opt-group[data-gi="${gi}"]`, sheetForm);
      if ($$('input:checked', fs).length < (Number(g.min) || 0)) {
        fs.classList.add('is-invalid');
        if (ok) fs.scrollIntoView({ block: 'center', behavior: 'smooth' });
        ok = false;
      }
    });
    if (!ok) return showToast('Escolha as opções obrigatórias');
    addLine(sheetItem, chosenOpts(), sheetQty, sheetFrom);
    closeSheet();
  });
  sheet.addEventListener('click', (e) => {
    if (e.target.closest('[data-sheet-close]')) closeSheet();
    if (e.target.closest('[data-sheet-inc]')) { sheetQty += 1; paintSheet(); }
    if (e.target.closest('[data-sheet-dec]')) { sheetQty = Math.max(1, sheetQty - 1); paintSheet(); }
  });

  /* ---------- Gaveta / etapas ---------- */
  const ORDERED = ['cart', 'checkout', 'done'];
  function setStep(s) {
    step = s;
    drawer.dataset.step = s;
    const pos = s === 'track' ? 2 : ORDERED.indexOf(s);
    $$('.steps li', drawer).forEach((li, i) => li.classList.toggle('is-on', i <= pos));
    $('#drawer-title').textContent = s === 'track' ? 'Seu pedido' : 'Sacola';
    backBtn.hidden = s !== 'checkout';
    nextBtn.hidden = s === 'done' || s === 'track';
    nextBtn.querySelector('span').textContent = s === 'cart' ? 'Continuar' : 'Enviar pedido';
    paintClosed();
    body.scrollTop = 0;
  }
  function paintClosed() {
    const note = $('#closed-note');
    const closed = GB.storeOpen === false;
    note.hidden = step !== 'checkout' || !closed;
    note.textContent = `A loja está fechada agora. ${GB.storeClosedMsg || ''}`;
    if (step === 'checkout') nextBtn.disabled = closed || !cart.length;
  }
  window.addEventListener('gb:store', () => step === 'checkout' && paintClosed());

  let lastFocus = null;
  function open(s = 'cart') {
    lastFocus = document.activeElement;
    setStep(s);
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    window.__lenis?.stop();
    setTimeout(() => panel.focus(), 50);
  }
  function close() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (!document.body.classList.contains('menu-open')) window.__lenis?.start();
    if (step === 'done' || step === 'track') setStep('cart');
    lastFocus?.focus?.();
    paintChip();
  }

  /* ---------- Checkout ---------- */
  const customer = load(CUSTOMER_KEY, {});
  ['nome', 'fone', 'rua', 'bairro', 'referencia'].forEach((k) => { if (customer[k]) form.elements[k].value = customer[k]; });

  function syncFields() {
    $('#addr-fields').hidden = form.elements.tipo.value !== 'entrega';
    $('#troco-field').hidden = form.elements.pagamento.value !== 'dinheiro';
    $$('.choice legend', form)[1].textContent = form.elements.tipo.value === 'entrega' ? 'Pagamento na entrega' : 'Pagamento';
  }
  form.addEventListener('change', syncFields);
  syncFields();

  function validate() {
    let ok = true;
    const need = ['nome', 'fone'];
    if (form.elements.tipo.value === 'entrega') need.push('rua', 'bairro');
    $$('.field', form).forEach((f) => f.classList.remove('is-invalid'));
    need.forEach((k) => {
      const el = form.elements[k];
      const bad = k === 'fone' ? el.value.replace(/\D/g, '').length < 10 : !el.value.trim();
      if (bad) { el.closest('.field').classList.add('is-invalid'); if (ok) el.focus(); ok = false; }
    });
    return ok;
  }

  function buildOrder() {
    const f = form.elements;
    return {
      customer: { nome: f.nome.value.trim(), fone: f.fone.value.trim() },
      tipo: f.tipo.value,
      address: f.tipo.value === 'entrega' ? { rua: f.rua.value.trim(), bairro: f.bairro.value.trim(), referencia: f.referencia.value.trim() } : null,
      payment: { method: f.pagamento.value, troco: f.pagamento.value === 'dinheiro' ? f.troco.value.trim() : '' },
      obs: f.obs.value.trim(),
      items: cart.map((l) => ({ id: l.id, name: l.name, qty: l.qty, unit: l.unit, opts: l.opts })),
      subtotal: subtotal(),
      source: 'site'
    };
  }

  const PAY = { pix: 'Pix', cartao: 'Cartão (maquininha)', dinheiro: 'Dinheiro' };
  const TIPO = { entrega: '🛵 Entrega', retirada: '🏃 Retirada no local', local: '🍽️ Comer no local' };
  function whatsappMessage(o) {
    const L = ['*NOVO PEDIDO — site Gordinho Burguer* 🍔', ''];
    L.push(`👤 *Nome:* ${o.customer.nome}`, `📱 *Contato:* ${o.customer.fone}`, `*${TIPO[o.tipo]}*`);
    if (o.address) {
      L.push(`📍 ${o.address.rua} — ${o.address.bairro}`);
      if (o.address.referencia) L.push(`*Referência:* ${o.address.referencia}`);
    }
    L.push('', '*Itens*');
    o.items.forEach((i) => {
      L.push(`${i.qty}x ${i.name} — ${brl(i.unit * i.qty)}`);
      i.opts.forEach((op) => L.push(`   • ${op.n}${op.p ? ` (+${brl(op.p)})` : ''}`));
    });
    L.push('', `*Subtotal:* ${brl(o.subtotal)}`);
    if (o.tipo === 'entrega') L.push('*Taxa de entrega:* a confirmar');
    L.push(`💳 *Pagamento:* ${PAY[o.payment.method]}${o.payment.troco ? ` (troco para R$ ${o.payment.troco})` : ''}`);
    if (o.obs) L.push(`📝 *Observações:* ${o.obs}`);
    return L.join('\n');
  }

  async function send() {
    if (GB.storeOpen === false) return showToast('A loja está fechada agora');
    if (!validate()) return showToast('Preencha os campos destacados');
    const f = form.elements;
    save(CUSTOMER_KEY, { nome: f.nome.value, fone: f.fone.value, rua: f.rua.value, bairro: f.bairro.value, referencia: f.referencia.value });
    const order = buildOrder();

    if (GB.submitOrder) {
      nextBtn.disabled = true;
      nextBtn.querySelector('span').textContent = 'Enviando…';
      try {
        const { id, number } = await GB.submitOrder(order);
        active = { id, number, tipo: order.tipo };
        save(ORDER_KEY, active);
        cart = [];
        paint();
        form.elements.obs.value = '';
        startTracking();
        setStep('track');
      } catch (err) {
        console.error(err);
        showToast('Não conseguimos enviar. Confira sua internet e tente de novo.');
        setStep('checkout');
      } finally {
        nextBtn.disabled = false;
      }
      return;
    }

    const number = String(window.WHATSAPP_NUMBER || '').replace(/\D/g, '');
    if (!number) return showToast('O WhatsApp da loja ainda não foi configurado');
    const url = `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage(order))}`;
    $('#wa-link').href = url;
    window.open(url, '_blank', 'noopener');
    cart = [];
    paint();
    setStep('done');
  }

  /* ---------- Acompanhamento ---------- */
  function statusInfo(o) {
    const base = STATUS[o.status] || STATUS.novo;
    if (o.status === 'entrega' && o.tipo !== 'entrega') return { ...base, label: pickupLabel.entrega, title: pickupLabel.title, msg: pickupLabel.msg };
    return base;
  }
  function paintTrack(o) {
    if (!o) return;
    const info = statusInfo(o);
    $('#track-num').textContent = `Pedido #${o.number}`;
    $('#track-title').textContent = info.title;
    $('#track-msg').textContent = info.msg;
    const steps = ['novo', 'preparo', 'entrega', 'concluido'];
    const cur = steps.indexOf(o.status);
    $('#timeline').innerHTML = o.status === 'cancelado'
      ? `<li class="is-cancel">Cancelado</li>`
      : steps.map((s, i) => {
        const lbl = s === 'entrega' && o.tipo !== 'entrega' ? pickupLabel.entrega : s === 'concluido' && o.tipo !== 'entrega' ? 'Concluído' : STATUS[s].label;
        return `<li class="${i < cur ? 'is-done' : i === cur ? 'is-now' : ''}"><i></i><span>${lbl}</span></li>`;
      }).join('');
    $('#track-summary').innerHTML = `${o.items.map((i) => `<div><span>${i.qty}x ${esc(i.name)}</span><b>${brl(i.unit * i.qty)}</b></div>`).join('')}<div class="tot"><span>Subtotal</span><b>${brl(o.subtotal)}</b></div>`;
    active = { ...active, status: o.status, tipo: o.tipo };
    if (['concluido', 'cancelado'].includes(o.status)) { save(ORDER_KEY, null); } else save(ORDER_KEY, active);
    paintChip();
  }
  function startTracking() {
    stopWatch?.();
    if (!active || !GB.watchOrder) return;
    stopWatch = GB.watchOrder(active.id, (o) => {
      if (!o) { active = null; save(ORDER_KEY, null); paintChip(); return; }
      const prev = active?.status;
      paintTrack(o);
      if (prev && prev !== o.status && !drawer.classList.contains('is-open')) showToast(`Pedido #${o.number}: ${statusInfo(o).label}`);
    });
  }
  function paintChip() {
    const show = active && !['concluido', 'cancelado'].includes(active.status) && !drawer.classList.contains('is-open');
    chip.hidden = !show;
    if (show) $('span', chip).textContent = `Pedido #${active.number} · ${statusInfo(active).label}`;
  }
  chip.addEventListener('click', () => open('track'));
  $('#track-new').addEventListener('click', () => { close(); if (!active || ['concluido', 'cancelado'].includes(active.status)) active = null; paintChip(); });
  window.addEventListener('gb:online', startTracking);

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      e.preventDefault();
      const item = GB.catalog.get(addBtn.dataset.add);
      if (!item || !item.available) return;
      if (item.groups?.length) openSheet(item, addBtn);
      else addLine(item, [], 1, addBtn);
      return;
    }
    if (e.target.closest('[data-open-cart]')) { e.preventDefault(); open(); return; }
    if (e.target.closest('[data-close]') && drawer.contains(e.target)) { close(); return; }
    const row = e.target.closest('.cart-line');
    if (row) {
      const l = cart[Number(row.dataset.idx)];
      if (e.target.closest('[data-inc]')) l.qty += 1;
      else if (e.target.closest('[data-dec]')) { l.qty -= 1; if (l.qty <= 0) cart.splice(cart.indexOf(l), 1); }
      paint();
    }
  });
  fab.addEventListener('click', () => open());
  nextBtn.addEventListener('click', () => (step === 'cart' ? setStep('checkout') : send()));
  backBtn.addEventListener('click', () => setStep('cart'));
  form.addEventListener('submit', (e) => { e.preventDefault(); send(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (sheet.classList.contains('is-open')) closeSheet();
    else if (drawer.classList.contains('is-open')) close();
  });
  new MutationObserver(paintBadges).observe($('#menu-grid'), { childList: true });
  new MutationObserver(paintBadges).observe($('#hscroll-track'), { childList: true });

  syncWithCatalog();
  setStep('cart');
  paintChip();
})();
