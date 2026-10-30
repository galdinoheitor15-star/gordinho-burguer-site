/* =========================================================
   Gordinho Burguer — interações e animações
   ========================================================= */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const brl = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  window.__lenis = lenis;

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#topo' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      document.body.classList.remove('menu-open');
      if (lenis && a.hasAttribute('data-tour')) {
        // passeio guiado: atravessa a apresentação 3D e os destaques até o cardápio
        const dist = target.getBoundingClientRect().top - 60;
        const duration = gsap.utils.clamp(4, 10, (dist / window.innerHeight) * 1.15);
        lenis.scrollTo(target, { offset: -60, duration, lock: true, easing: (t) => -(Math.cos(Math.PI * t) - 1) / 2 });
      } else if (lenis) lenis.scrollTo(target, { offset: -60, duration: 1.6 });
      else if (target === 0) window.scrollTo(0, 0);
      else target.scrollIntoView();
    });
  });

  /* ---------- Horário (America/Recife) ---------- */
  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  function recifeNow() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Recife', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day: wd, hour: Number(get('hour')) % 24, minute: Number(get('minute')) };
  }
  const toMin = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const fmtH = (hhmm) => { const [h, m] = String(hhmm).split(':'); return Number(m) ? `${Number(h)}h${m}` : `${Number(h)}h`; };
  window.GB = window.GB || {};
  const GBs = window.GB;
  GBs.store = { mode: 'auto', start: '16:00', end: '23:00' };
  GBs.setStore = (st) => { if (st) GBs.store = { ...GBs.store, ...st }; renderStatus(); };
  function renderStatus() {
    const { day, hour, minute } = recifeNow();
    const { mode, start, end } = GBs.store;
    const now = hour * 60 + minute, a = toMin(start), b = toMin(end);
    const inHours = a <= b ? now >= a && now < b : now >= a || now < b;
    const open = mode === 'open' || (mode === 'auto' && inHours);
    const pill = $('#status');
    window.__storeOpen = open;
    GBs.storeOpen = open;
    GBs.storeClosedMsg = mode === 'closed' ? 'A loja fechou mais cedo hoje. Volte amanhã!' : `Abrimos às ${fmtH(start)}.`;
    pill.classList.toggle('is-open', open);
    pill.querySelector('span').innerHTML = open
      ? `<b>Aberto agora</b> · até as ${fmtH(end)}`
      : mode === 'closed' ? 'Fechado no momento' : now < a ? `Fechado · abre hoje às ${fmtH(start)}` : `Fechado · abre amanhã às ${fmtH(start)}`;
    $('#hours').innerHTML = DAYS.map((d, i) => `<span class="${i === day ? 'is-today' : ''}">${d}</span>`).join('');
    window.dispatchEvent(new Event('gb:store'));
  }
  renderStatus();
  setInterval(renderStatus, 60000);
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Marquees ---------- */
  $$('.marquee').forEach((m) => {
    const track = $('.marquee__track', m);
    const words = track.dataset.items.split('|');
    const group = words.map((w) => `<span class="marquee__item">${w}<svg><use href="#i-burger"/></svg></span>`).join('');
    track.innerHTML = group + group + group + group;
    if (reduced) return;
    const dir = Number(m.dataset.marquee);
    const tween = gsap.fromTo(track, { xPercent: dir > 0 ? 0 : -50 }, { xPercent: dir > 0 ? -50 : 0, duration: 40, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      trigger: m,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const v = Math.min(Math.abs(self.getVelocity()) / 300, 6);
        gsap.to(tween, { timeScale: (1 + v) * self.direction, duration: 0.3, overwrite: true });
      }
    });
  });

  /* ---------- Catálogo (estático ou vindo do painel) ---------- */
  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const imgSrc = (img) => (!img ? '' : /^(data:|https?:)/.test(img) ? img : `assets/img/${img}.webp`);
  const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const GB = (window.GB = window.GB || {});
  GB.imgSrc = imgSrc;
  GB.catalog = new Map();
  let cats = [];
  let highlights = [];

  function setMenu(newCats, newHl) {
    cats = newCats.filter((c) => c.items.length);
    highlights = newHl;
    GB.catalog = new Map();
    cats.forEach((c) => c.items.forEach((i) => GB.catalog.set(i.id, i)));
    highlights.forEach((h) => { if (!GB.catalog.has(h.id)) GB.catalog.set(h.id, h); });
    renderHighlights();
    buildTabs();
    window.dispatchEvent(new Event('gb:menu'));
  }
  GB.setMenu = setMenu;

  // documentos do banco -> formato do site
  GB.setMenuFromDb = (categories, products) => {
    const item = (p) => ({ id: p.id, name: p.name, price: Number(p.price) || 0, img: p.img, desc: p.desc, tag: p.tag, available: p.available !== false, groups: p.groups || [], group: p.subgroup || '' });
    const c = categories.map((cat) => ({ id: cat.id, label: cat.name, items: products.filter((p) => p.categoryId === cat.id).map(item) }));
    const hl = products.filter((p) => p.featured && p.img).map(item);
    setMenu(c, hl.length ? hl : highlights);
  };

  function staticMenu() {
    const base = (o) => ({ available: true, groups: [], ...o, id: slug(o.name) });
    const c = window.MENU.map((cat) => ({
      id: cat.id,
      label: cat.label,
      items: [
        ...(cat.items || []).map(base),
        ...(cat.list || []).flatMap((g) => g.items.map(([n, p]) => base({ name: n, price: p, group: g.group })))
      ]
    }));
    return [c, window.HIGHLIGHTS.map(base)];
  }

  const addLabel = (it) => (!it.available ? 'Esgotado' : it.groups?.length ? 'Escolher' : 'Adicionar');

  /* ---------- Destaques (scroll horizontal com 3D) ---------- */
  const hTrack = $('#hscroll-track');
  let hCards = [], hImgs = [], hTween = null;
  function updateHCards() {
    const cx = window.innerWidth / 2;
    hCards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const d = (r.left + r.width / 2 - cx) / window.innerWidth; // -1..1
      gsap.set(card, { rotateY: gsap.utils.clamp(-28, 28, d * -32), z: -Math.abs(d) * 160, transformPerspective: 1400 });
      gsap.set(hImgs[i], { xPercent: d * -10 });
    });
  }
  function renderHighlights() {
    const n = String(highlights.length).padStart(2, '0');
    hTrack.innerHTML =
      `<div class="hcard hcard--intro"><div><div class="big">${n}</div><p>especiais pra quem chega com fome de verdade. Arrasta pro lado →</p></div></div>` +
      highlights.map((h, i) => `
        <article class="hcard${h.available ? '' : ' is-out'}" data-cursor="PEDIR">
          <div class="hcard__img"><img src="${imgSrc(h.img)}" alt="${esc(h.name)}" loading="lazy"></div>
          <span class="hcard__num">${String(i + 1).padStart(2, '0')}</span>
          <div class="hcard__body">
            <h3>${esc(h.name)}</h3>
            <p>${esc(h.desc)}</p>
            <div class="hcard__foot">
              <span class="price"><small>R$</small>${brl(h.price)}</span>
              <button class="hcard__add" type="button" data-add="${h.id}" ${h.available ? '' : 'disabled'} aria-label="${addLabel(h)}: ${esc(h.name)}"><svg><use href="#i-plus"/></svg></button>
            </div>
          </div>
        </article>`).join('');
    hCards = $$('.hcard:not(.hcard--intro)', hTrack);
    hImgs = hCards.map((c) => $('.hcard__img', c));
    if (reduced) { $('.hscroll').style.overflowX = 'auto'; return; }
    if (hTween) { hTween.scrollTrigger.kill(); hTween.kill(); gsap.set(hTrack, { x: 0 }); }
    hTween = gsap.to(hTrack, {
      x: () => -(hTrack.scrollWidth - window.innerWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: '.hscroll',
        start: 'top top',
        end: () => '+=' + (hTrack.scrollWidth - window.innerWidth),
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: updateHCards
      }
    });
    updateHCards();
    ScrollTrigger.refresh();
  }

  /* ---------- Cardápio ---------- */
  const tabsEl = $('#tabs');
  const pill = $('.tabs__pill', tabsEl);
  const grid = $('#menu-grid');
  let activeCat = null;
  function buildTabs() {
    $$('.tab', tabsEl).forEach((t) => t.remove());
    if (!cats.find((c) => c.id === activeCat)) activeCat = cats[0]?.id;
    cats.forEach((cat) => {
      const b = document.createElement('button');
      b.className = 'tab' + (cat.id === activeCat ? ' is-active' : '');
      b.textContent = cat.label;
      b.setAttribute('role', 'tab');
      b.dataset.id = cat.id;
      tabsEl.appendChild(b);
    });
    if (activeCat) renderCat(activeCat);
    requestAnimationFrame(() => { const a = $('.tab.is-active', tabsEl); a && movePill(a, true); });
  }
  function movePill(btn, instant) {
    pill.style.transition = instant ? 'none' : '';
    pill.style.width = btn.offsetWidth + 'px';
    pill.style.transform = `translateX(${btn.offsetLeft}px)`;
  }
  function cardHTML(it) {
    return `
      <article class="mcard${it.available ? '' : ' is-out'}">
        <div class="mcard__media">
          <img src="${imgSrc(it.img)}" alt="${esc(it.name)}" loading="lazy">
          ${it.tag ? `<span class="mcard__tag">${esc(it.tag)}</span>` : ''}
          ${it.available ? '<span class="qty-badge"></span>' : '<span class="out-badge">Esgotado</span>'}
        </div>
        <div class="mcard__body">
          <h3>${esc(it.name)}</h3>
          <p>${esc(it.desc)}</p>
          <div class="mcard__foot">
            <span class="price">${it.groups?.length ? '<small>a partir de </small>' : ''}<small>R$</small>${brl(it.price)}</span>
            <button class="mcard__btn" type="button" data-add="${it.id}" ${it.available ? '' : 'disabled'}>${addLabel(it)} <svg width="16" height="16"><use href="#i-plus"/></svg></button>
          </div>
        </div>
        <span class="mcard__glare"></span>
      </article>`;
  }
  function listHTML(items) {
    let lastGroup = null;
    return `<div class="mlist">${items.map((e) => {
      const head = e.group && e.group !== lastGroup ? `<div class="mlist__group">${esc(e.group)}</div>` : '';
      lastGroup = e.group || lastGroup;
      return head + `<div class="mlist__item${e.available ? '' : ' is-out'}"><span>${esc(e.name)}${e.available ? '' : ' <em>esgotado</em>'}</span><i></i><b>R$ ${brl(e.price)}</b><button class="mlist__add" type="button" data-add="${e.id}" ${e.available ? '' : 'disabled'} aria-label="${addLabel(e)}: ${esc(e.name)}"><svg><use href="#i-plus"/></svg></button></div>`;
    }).join('')}</div>`;
  }
  function renderCat(id) {
    activeCat = id;
    const cat = cats.find((c) => c.id === id);
    if (!cat) return;
    const withImg = cat.items.filter((i) => i.img);
    const extras = cat.items.filter((i) => !i.img);
    grid.innerHTML = withImg.map(cardHTML).join('') + (extras.length ? listHTML(extras) : '');
    bindTilt();
    bindCursorTargets(grid);
  }
  let switching = false;
  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn || btn.classList.contains('is-active') || switching) return;
    $$('.tab', tabsEl).forEach((t) => t.classList.toggle('is-active', t === btn));
    movePill(btn);
    btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    if (reduced) return renderCat(btn.dataset.id);
    switching = true;
    gsap.to(grid.children, {
      opacity: 0, y: -16, duration: 0.22, stagger: 0.02, ease: 'power2.in',
      onComplete: () => {
        renderCat(btn.dataset.id);
        gsap.from(grid.children, {
          opacity: 0, y: 50, rotateX: -18, transformPerspective: 900, transformOrigin: '50% 0%',
          duration: 0.8, stagger: 0.06, ease: 'expo.out', clearProps: 'transform,opacity',
          onComplete: () => { switching = false; ScrollTrigger.refresh(); }
        });
      }
    });
  });
  window.addEventListener('resize', () => { const a = $('.tab.is-active', tabsEl); a && movePill(a, true); });

  // Tilt 3D + brilho nos cards
  function bindTilt() {
    if (!finePointer || reduced) return;
    $$('.mcard', grid).forEach((card) => {
      const rx = gsap.quickTo(card, 'rotateX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotateY', { duration: 0.6, ease: 'power3' });
      gsap.set(card, { transformPerspective: 900 });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        rx((0.5 - py) * 12);
        ry((px - 0.5) * 14);
        card.style.setProperty('--gx', px * 100 + '%');
        card.style.setProperty('--gy', py * 100 + '%');
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  setMenu(...staticMenu());

  /* ---------- Cursor + magnético ---------- */
  const cursor = $('.cursor');
  function bindCursorTargets(root = document) {
    if (!finePointer) return;
    $$('a, button, [data-cursor]', root).forEach((el) => {
      if (el.__cursorBound) return;
      el.__cursorBound = true;
      el.addEventListener('pointerenter', () => {
        const label = el.dataset.cursor || el.closest('[data-cursor]')?.dataset.cursor;
        cursor.classList.add(label ? 'is-label' : 'is-hover');
        if (label) cursor.querySelector('span').textContent = label;
      });
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-label', 'is-hover'));
    });
  }
  if (finePointer && !reduced) {
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('pointermove', (e) => { cx(e.clientX); cy(e.clientY); });
    bindCursorTargets();

    $$('[data-magnetic]').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      const my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.3);
        my((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  } else {
    cursor.remove();
  }

  /* ---------- Nav ---------- */
  const nav = $('.nav');
  let lastY = 0;
  function onScrollNav(y) {
    nav.classList.toggle('is-scrolled', y > 40);
    if (!document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > lastY && y > 400);
    lastY = y;
  }
  if (lenis) lenis.on('scroll', ({ scroll }) => onScrollNav(scroll));
  else window.addEventListener('scroll', () => onScrollNav(window.scrollY), { passive: true });

  const toggle = $('.nav__toggle');
  toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', open);
    if (open) {
      lenis?.stop();
      gsap.fromTo('.mobile-menu a', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 0.8, delay: 0.25, ease: 'expo.out' });
    } else lenis?.start();
  });
  $$('.mobile-menu a').forEach((a) => a.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', false);
    lenis?.start();
  }));

  /* ---------- Revelações no scroll ---------- */
  function setupReveals() {
    if (reduced) return;
    $$('[data-split]').forEach((el) => {
      gsap.fromTo(el, { yPercent: 110, rotate: 4 }, {
        yPercent: 0, rotate: 0, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: el.closest('h2'), start: 'top 85%' },
        delay: (Array.from(el.closest('h2').querySelectorAll('[data-split]')).indexOf(el)) * 0.1
      });
    });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%',
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out' })
    });

    $$('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const dec = Number(el.dataset.decimals || 0);
      const obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 2, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
        onUpdate: () => { el.textContent = obj.v.toFixed(dec).replace('.', ','); }
      });
    });

    $$('[data-parallax]').forEach((el) => {
      gsap.fromTo(el, { y: 0 }, { y: Number(el.dataset.parallax), ease: 'none', scrollTrigger: { trigger: '.family', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.from('.family__sticker', { scale: 0, rotate: -180, duration: 1.4, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.family__media', start: 'top 75%' } });
    gsap.from('.family', { borderRadius: '0px', scrollTrigger: { trigger: '.family', start: 'top bottom', end: 'top 40%', scrub: true } });

    $$('.gallery__col').forEach((col) => {
      gsap.fromTo(col, { yPercent: 0 }, { yPercent: Number(col.dataset.speed), ease: 'none', scrollTrigger: { trigger: '.gallery__cols', start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    gsap.from('[data-footer-word]', {
      yPercent: 110, rotate: 6, duration: 1.4, stagger: 0.12, ease: 'expo.out',
      scrollTrigger: { trigger: '.footer', start: 'top 70%' }
    });
    gsap.to('.footer__logo', { rotate: 120, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  /* ---------- Preloader ---------- */
  function heroIntro() {
    if (reduced) return;
    gsap.fromTo('[data-hero-line]', { yPercent: 115, rotateX: -70, transformOrigin: '50% 100%' }, { yPercent: 0, rotateX: 0, duration: 1.4, stagger: 0.09, ease: 'expo.out' });
    gsap.fromTo('[data-hero-fade]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.12, delay: 0.45, ease: 'expo.out' });
    gsap.fromTo('#status', { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 1, delay: 0.2, ease: 'expo.out' });
    gsap.fromTo('.nav > *', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 1, stagger: 0.07, delay: 0.3, ease: 'expo.out' });
  }

  let readyFired = false, opened = false, failsafe = 0;
  function siteReady() {
    if (readyFired) return;
    readyFired = true;
    window.__siteReady = true;
    window.dispatchEvent(new Event('site:ready'));
  }
  function openSite() {
    if (opened) return;
    opened = true;
    clearTimeout(failsafe);
    $('.preloader')?.remove();
    document.body.classList.remove('is-loading');
    lenis?.start();
    setupReveals();
    ScrollTrigger.refresh();
  }
  // rede de segurança: em PC lento ou com falha de rede, a tela de carregamento nunca fica presa
  failsafe = setTimeout(() => {
    if (opened) return;
    gsap.set('[data-hero-line]', { yPercent: 0, rotateX: 0 });
    gsap.set('[data-hero-fade], #status, .nav > *', { opacity: 1, y: 0 });
    siteReady();
    openSite();
  }, 12000);

  const loadPromise = new Promise((res) => (document.readyState === 'complete' ? res() : window.addEventListener('load', res)));
  const fontsPromise = document.fonts ? document.fonts.ready : Promise.resolve();
  const ready = Promise.race([Promise.all([loadPromise, fontsPromise]), new Promise((r) => setTimeout(r, 6000))]);

  if (reduced) {
    ready.then(() => {
      siteReady();
      openSite();
    });
    return;
  }

  gsap.set('.preloader__panel', { yPercent: 100, y: 0 });
  gsap.set('[data-hero-line]', { yPercent: 115 });
  gsap.set('[data-hero-fade], #status, .nav > *', { opacity: 0 });

  const counter = { v: 0 };
  const plTl = gsap.timeline();
  plTl
    .from('.pl-ring', { scale: 0, duration: 0.9, ease: 'expo.out' })
    .from('.pl-drop', { y: -140, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'bounce.out' }, 0.2)
    .from('.pl-steam path', { strokeDasharray: 40, strokeDashoffset: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out' }, 0.9)
    .from('.pl-text', { y: 20, opacity: 0, duration: 0.7, ease: 'expo.out' }, 1.0)
    .to(counter, { v: 80, duration: 1.6, ease: 'power2.inOut', onUpdate: () => paintCount() }, 0);

  function paintCount() {
    const el = $('#pl-count');
    if (!el) return; // a tela de carregamento já foi fechada pela rede de segurança
    el.textContent = Math.round(counter.v);
    gsap.set('.preloader__bar span', { scaleX: counter.v / 100 });
  }

  Promise.all([ready, new Promise((r) => plTl.eventCallback('onComplete', r))]).then(() => {
    gsap.timeline()
      .to(counter, { v: 100, duration: 0.5, ease: 'power2.out', onUpdate: paintCount })
      .to('.preloader__logo', { scale: 1.12, duration: 0.25, ease: 'power2.out' })
      .to('.preloader__logo', { scale: 0, rotate: -20, duration: 0.5, ease: 'back.in(2)' })
      .to('.preloader__count, .preloader__bar', { opacity: 0, duration: 0.3 }, '<')
      .to('.preloader__panel--1', { yPercent: 0, duration: 0.7, ease: 'expo.inOut' }, '-=0.2')
      .to('.preloader__panel--2', { yPercent: 0, duration: 0.7, ease: 'expo.inOut' }, '-=0.55')
      .add(() => {
        if (opened) return;
        $('.preloader').style.background = 'transparent';
        $('.preloader__inner').style.display = 'none';
        document.body.classList.remove('is-loading');
        siteReady();
        heroIntro();
      })
      .to('.preloader__panel--2', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' })
      .to('.preloader__panel--1', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '-=0.75')
      .add(openSite);
  });
})();
