/* =========================================================
   Gordinho Burguer — interações e animações
   ========================================================= */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const brl = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ORDER = window.ORDER_URL;

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
  function renderStatus() {
    const { day, hour } = recifeNow();
    const open = hour >= 16 && hour < 23;
    const pill = $('#status');
    pill.classList.toggle('is-open', open);
    pill.querySelector('span').innerHTML = open
      ? '<b>Aberto agora</b> · até as 23h'
      : hour < 16 ? 'Fechado · abre hoje às 16h' : 'Fechado · abre amanhã às 16h';
    $('#hours').innerHTML = DAYS.map((d, i) => `<span class="${i === day ? 'is-today' : ''}">${d}</span>`).join('');
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

  /* ---------- Destaques (scroll horizontal com 3D) ---------- */
  const hTrack = $('#hscroll-track');
  hTrack.innerHTML =
    `<div class="hcard hcard--intro"><div><div class="big">0${window.HIGHLIGHTS.length}</div><p>especiais pra quem chega com fome de verdade. Arrasta pro lado →</p></div></div>` +
    window.HIGHLIGHTS.map((h, i) => `
      <article class="hcard" data-cursor="PEDIR">
        <div class="hcard__img"><img src="assets/img/${h.img}.webp" alt="${h.name}" loading="lazy"></div>
        <span class="hcard__num">0${i + 1}</span>
        <div class="hcard__body">
          <h3>${h.name}</h3>
          <p>${h.desc}</p>
          <div class="hcard__foot">
            <span class="price"><small>R$</small>${brl(h.price)}</span>
            <a class="hcard__add" href="${ORDER}" target="_blank" rel="noopener" aria-label="Pedir ${h.name}"><svg><use href="#i-plus"/></svg></a>
          </div>
        </div>
      </article>`).join('');

  const hCards = $$('.hcard:not(.hcard--intro)', hTrack);
  const hImgs = hCards.map((c) => $('.hcard__img', c));
  function updateHCards() {
    const cx = window.innerWidth / 2;
    hCards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const d = (r.left + r.width / 2 - cx) / window.innerWidth; // -1..1
      gsap.set(card, { rotateY: gsap.utils.clamp(-28, 28, d * -32), z: -Math.abs(d) * 160, transformPerspective: 1400 });
      gsap.set(hImgs[i], { xPercent: d * -10 });
    });
  }
  if (!reduced) {
    gsap.to(hTrack, {
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
  } else {
    $('.hscroll').style.overflowX = 'auto';
  }

  /* ---------- Cardápio ---------- */
  const tabsEl = $('#tabs');
  const pill = $('.tabs__pill', tabsEl);
  const grid = $('#menu-grid');
  window.MENU.forEach((cat, i) => {
    const b = document.createElement('button');
    b.className = 'tab' + (i === 0 ? ' is-active' : '');
    b.textContent = cat.label;
    b.setAttribute('role', 'tab');
    b.dataset.id = cat.id;
    tabsEl.appendChild(b);
  });
  function movePill(btn, instant) {
    pill.style.transition = instant ? 'none' : '';
    pill.style.width = btn.offsetWidth + 'px';
    pill.style.transform = `translateX(${btn.offsetLeft}px)`;
  }
  function cardHTML(it) {
    return `
      <article class="mcard">
        <div class="mcard__media">
          <img src="assets/img/${it.img}.webp" alt="${it.name}" loading="lazy">
          ${it.tag ? `<span class="mcard__tag">${it.tag}</span>` : ''}
        </div>
        <div class="mcard__body">
          <h3>${it.name}</h3>
          <p>${it.desc || ''}</p>
          <div class="mcard__foot">
            <span class="price"><small>R$</small>${brl(it.price)}</span>
            <a class="mcard__btn" href="${ORDER}" target="_blank" rel="noopener">Pedir <svg width="16" height="16"><use href="#i-arrow"/></svg></a>
          </div>
        </div>
        <span class="mcard__glare"></span>
      </article>`;
  }
  function renderCat(id) {
    const cat = window.MENU.find((c) => c.id === id);
    let html = '';
    if (cat.items) {
      html += cat.items.filter((i) => i.img).map(cardHTML).join('');
      const extras = cat.items.filter((i) => !i.img);
      if (extras.length) html += `<div class="mlist">${extras.map((e) => `<div class="mlist__item"><span>${e.name}</span><i></i><b>R$ ${brl(e.price)}</b></div>`).join('')}</div>`;
    }
    if (cat.list) {
      html += `<div class="mlist">${cat.list.map((g) => `<div class="mlist__group">${g.group}</div>` + g.items.map(([n, p]) => `<div class="mlist__item"><span>${n}</span><i></i><b>R$ ${brl(p)}</b></div>`).join('')).join('')}</div>`;
    }
    grid.innerHTML = html;
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
  renderCat(window.MENU[0].id);
  requestAnimationFrame(() => movePill($('.tab.is-active', tabsEl), true));
  window.addEventListener('resize', () => movePill($('.tab.is-active', tabsEl), true));

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

  function siteReady() {
    window.__siteReady = true;
    window.dispatchEvent(new Event('site:ready'));
  }

  const loadPromise = new Promise((res) => (document.readyState === 'complete' ? res() : window.addEventListener('load', res)));
  const fontsPromise = document.fonts ? document.fonts.ready : Promise.resolve();
  const ready = Promise.race([Promise.all([loadPromise, fontsPromise]), new Promise((r) => setTimeout(r, 6000))]);

  if (reduced) {
    ready.then(() => {
      $('.preloader').remove();
      document.body.classList.remove('is-loading');
      setupReveals();
      siteReady();
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
    $('#pl-count').textContent = Math.round(counter.v);
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
        $('.preloader').style.background = 'transparent';
        $('.preloader__inner').style.display = 'none';
        document.body.classList.remove('is-loading');
        siteReady();
        heroIntro();
      })
      .to('.preloader__panel--2', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' })
      .to('.preloader__panel--1', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '-=0.75')
      .add(() => {
        $('.preloader').remove();
        lenis?.start();
        setupReveals();
        ScrollTrigger.refresh();
      });
  });
})();
