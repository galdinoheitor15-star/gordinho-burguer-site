/* =========================================================
   Sacola e checkout — o pedido é montado no site e enviado
   já escrito para o WhatsApp da loja.
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const brl = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORE_KEY = 'gordinho-sacola';
  const CUSTOMER_KEY = 'gordinho-cliente';

  // catálogo: nome -> { price, img }
  const catalog = new Map();
  (window.HIGHLIGHTS || []).forEach((h) => catalog.set(h.name, { price: h.price, img: h.img }));
  (window.MENU || []).forEach((c) => {
    (c.items || []).forEach((i) => catalog.set(i.name, { price: i.price, img: i.img }));
    (c.list || []).forEach((g) => g.items.forEach(([n, p]) => catalog.set(n, { price: p })));
  });

  const load = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

  let cart = load(STORE_KEY, []).filter((l) => catalog.has(l.name));
  let step = 'cart';

  const fab = $('#cart-fab');
  const countEl = $('#cart-count');
  const drawer = $('#drawer');
  const panel = $('.drawer__panel', drawer);
  const listEl = $('#cart-list');
  const totalEl = $('#cart-total');
  const nextBtn = $('#cart-next');
  const backBtn = $('#cart-back');
  const form = $('#checkout-form');
  const toast = $('#toast');

  const qtyTotal = () => cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = () => cart.reduce((s, l) => s + l.qty * catalog.get(l.name).price, 0);

  /* ---------- Render ---------- */
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
        const it = catalog.get(l.name);
        return `
          <div class="cart-line" data-idx="${idx}">
            ${it.img ? `<img src="assets/img/${it.img}.webp" alt="">` : `<span class="cart-line__ph"><svg viewBox="0 0 40 40"><use href="#i-burger"/></svg></span>`}
            <div class="cart-line__info">
              <b>${l.name}</b>
              <span>${brl(it.price * l.qty)}</span>
            </div>
            <div class="stepper">
              <button type="button" data-dec aria-label="Diminuir ${l.name}">−</button>
              <output>${l.qty}</output>
              <button type="button" data-inc aria-label="Aumentar ${l.name}">+</button>
            </div>
          </div>`;
      }).join('');
    }
    nextBtn.disabled = !cart.length;
    paintBadges();
  }

  function paintBadges() {
    $$('[data-add]').forEach((btn) => {
      const line = cart.find((l) => l.name === btn.dataset.add);
      const host = btn.closest('.mcard, .hcard, .mlist__item');
      if (host) host.dataset.qty = line ? line.qty : '';
      const badge = host?.querySelector('.qty-badge');
      if (badge) badge.textContent = line ? `${line.qty} na sacola` : '';
    });
  }

  function setStep(s) {
    step = s;
    drawer.dataset.step = s;
    $$('.steps li', drawer).forEach((li) => li.classList.toggle('is-on', ['cart', 'checkout', 'done'].indexOf(li.dataset.s) <= ['cart', 'checkout', 'done'].indexOf(s)));
    backBtn.hidden = s !== 'checkout';
    nextBtn.hidden = s === 'done';
    nextBtn.querySelector('span').textContent = s === 'cart' ? 'Continuar' : 'Enviar pedido';
    $('#closed-note').hidden = s !== 'checkout' || window.__storeOpen !== false;
    $('.drawer__body', drawer).scrollTop = 0;
  }

  /* ---------- Ações ---------- */
  function add(name, fromEl) {
    if (!catalog.has(name)) return;
    const line = cart.find((l) => l.name === name);
    if (line) line.qty += 1; else cart.push({ name, qty: 1 });
    paint();
    flyToCart(fromEl);
    showToast(`<b>${name}</b> foi pra sacola`);
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
        const x = sx + (ex - sx) * t;
        const y = sy + (ey - sy) * t - Math.sin(t * Math.PI) * 160;
        gsap.set(dot, { x, y, scale: 1 - t * 0.5 });
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
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2400);
  }

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
    if (step === 'done') setStep('cart');
    lastFocus?.focus?.();
  }

  /* ---------- Checkout ---------- */
  const customer = load(CUSTOMER_KEY, {});
  ['nome', 'fone', 'rua', 'bairro', 'referencia'].forEach((k) => { if (customer[k]) form.elements[k].value = customer[k]; });

  function syncFields() {
    const delivery = form.elements.tipo.value === 'entrega';
    $('#addr-fields').hidden = !delivery;
    $('#troco-field').hidden = form.elements.pagamento.value !== 'dinheiro';
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

  function buildMessage() {
    const f = form.elements;
    const lines = [];
    lines.push('*NOVO PEDIDO — site Gordinho Burguer* 🍔', '');
    lines.push(`👤 *Nome:* ${f.nome.value.trim()}`);
    lines.push(`📱 *Contato:* ${f.fone.value.trim()}`);
    if (f.tipo.value === 'entrega') {
      lines.push(`🛵 *Entrega:* ${f.rua.value.trim()} — ${f.bairro.value.trim()}`);
      if (f.referencia.value.trim()) lines.push(`📍 *Referência:* ${f.referencia.value.trim()}`);
    } else {
      lines.push('🏃 *Retirada no local*');
    }
    lines.push('', '*Itens*');
    cart.forEach((l) => lines.push(`${l.qty}x ${l.name} — ${brl(catalog.get(l.name).price * l.qty)}`));
    lines.push('', `*Subtotal:* ${brl(subtotal())}`);
    if (f.tipo.value === 'entrega') lines.push('*Taxa de entrega:* a confirmar');
    const pay = { pix: 'Pix', cartao: 'Cartão (maquininha)', dinheiro: 'Dinheiro' }[f.pagamento.value];
    lines.push(`💳 *Pagamento:* ${pay}${f.pagamento.value === 'dinheiro' && f.troco.value.trim() ? ` (troco para R$ ${f.troco.value.trim()})` : ''}`);
    if (f.obs.value.trim()) lines.push(`📝 *Observações:* ${f.obs.value.trim()}`);
    return lines.join('\n');
  }

  function send() {
    if (!validate()) return showToast('Preencha os campos destacados');
    const number = String(window.WHATSAPP_NUMBER || '').replace(/\D/g, '');
    if (!number) return showToast('O WhatsApp da loja ainda não foi configurado');
    const f = form.elements;
    save(CUSTOMER_KEY, { nome: f.nome.value, fone: f.fone.value, rua: f.rua.value, bairro: f.bairro.value, referencia: f.referencia.value });
    const url = `https://wa.me/${number}?text=${encodeURIComponent(buildMessage())}`;
    $('#wa-link').href = url;
    window.open(url, '_blank', 'noopener');
    cart = [];
    paint();
    setStep('done');
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) { e.preventDefault(); add(addBtn.dataset.add, addBtn); return; }
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
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) close(); });

  // badges acompanham as trocas de aba do cardápio
  new MutationObserver(paintBadges).observe($('#menu-grid'), { childList: true });

  paint();
  setStep('cart');
})();
