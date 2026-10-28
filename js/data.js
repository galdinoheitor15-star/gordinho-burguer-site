/* =========================================================
   Camada de dados — Firebase (produção) ou modo de teste local.
   Site e painel usam a mesma interface:
     onStore, onMenu, createOrder, onOrder,
     onAuth, signIn, signOut, onOrders, updateOrder,
     saveStore, saveCategory, deleteCategory, saveProduct, deleteProduct, importMenu
   ========================================================= */
const FB = 'https://www.gstatic.com/firebasejs/10.12.2';
const ACTIVE = ['novo', 'preparo', 'entrega'];

export function isTestMode() {
  try {
    const q = new URLSearchParams(location.search).get('teste');
    if (q === '1') localStorage.setItem('gb-teste', '1');
    if (q === '0') localStorage.removeItem('gb-teste');
    return localStorage.getItem('gb-teste') === '1';
  } catch { return false; }
}

export async function connect() {
  if (isTestMode()) return localBackend();
  if (!window.FIREBASE_CONFIG) return null;
  return firebaseBackend(window.FIREBASE_CONFIG);
}

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/* ---------------- Firebase ---------------- */
async function firebaseBackend(cfg) {
  const [{ initializeApp }, fs, au] = await Promise.all([
    import(`${FB}/firebase-app.js`),
    import(`${FB}/firebase-firestore.js`),
    import(`${FB}/firebase-auth.js`)
  ]);
  const app = initializeApp(cfg);
  const db = fs.getFirestore(app);
  const auth = au.getAuth(app);
  const { doc, collection, onSnapshot, query, where, runTransaction, serverTimestamp, setDoc, updateDoc, deleteDoc, writeBatch, Timestamp } = fs;

  const toOrder = (d) => {
    const o = d.data();
    return { id: d.id, ...o, createdAt: o.createdAt?.toMillis?.() ?? Date.now() };
  };

  return {
    mode: 'firebase',
    onStore(cb) {
      return onSnapshot(doc(db, 'config', 'store'), (s) => cb(s.exists() ? s.data() : null), () => cb(null));
    },
    onMenu(cb) {
      let cats = null, prods = null;
      const emit = () => cats && prods && cb({ categories: cats.sort(byOrder), products: prods.sort(byOrder) });
      const u1 = onSnapshot(collection(db, 'categories'), (s) => { cats = s.docs.map((d) => ({ id: d.id, ...d.data() })); emit(); });
      const u2 = onSnapshot(collection(db, 'products'), (s) => { prods = s.docs.map((d) => ({ id: d.id, ...d.data() })); emit(); });
      return () => { u1(); u2(); };
    },
    async createOrder(order) {
      const counterRef = doc(db, 'config', 'counter');
      const orderRef = doc(collection(db, 'orders'));
      const number = await runTransaction(db, async (tx) => {
        const c = await tx.get(counterRef);
        const n = (c.exists() ? c.data().n : 0) + 1;
        tx.set(counterRef, { n });
        tx.set(orderRef, { ...order, number: n, status: 'novo', createdAt: serverTimestamp(), statusAt: { novo: Date.now() } });
        return n;
      });
      return { id: orderRef.id, number };
    },
    onOrder(id, cb) {
      return onSnapshot(doc(db, 'orders', id), (s) => cb(s.exists() ? toOrder(s) : null), () => cb(null));
    },

    // ----- equipe -----
    onAuth(cb) { return au.onAuthStateChanged(auth, (u) => cb(u ? { email: u.email } : null)); },
    signIn(email, pw) { return au.signInWithEmailAndPassword(auth, email, pw); },
    signOut() { return au.signOut(auth); },
    onOrders(cb, onError) {
      const map = new Map();
      const col = collection(db, 'orders');
      const handle = (s) => { s.docChanges().forEach((c) => (c.type === 'removed' ? map.delete(c.doc.id) : map.set(c.doc.id, toOrder(c.doc)))); cb([...map.values()]); };
      const u1 = onSnapshot(query(col, where('createdAt', '>=', Timestamp.fromDate(startOfToday()))), handle, onError);
      const u2 = onSnapshot(query(col, where('status', 'in', ACTIVE)), handle, onError);
      return () => { u1(); u2(); };
    },
    updateOrder(id, patch) { return updateDoc(doc(db, 'orders', id), patch); },
    saveStore(data) { return setDoc(doc(db, 'config', 'store'), data, { merge: true }); },
    async saveCategory(cat) {
      const ref = cat.id ? doc(db, 'categories', cat.id) : doc(collection(db, 'categories'));
      const { id, ...data } = cat;
      await setDoc(ref, data, { merge: true });
      return ref.id;
    },
    deleteCategory(id) { return deleteDoc(doc(db, 'categories', id)); },
    async saveProduct(p) {
      const ref = p.id ? doc(db, 'products', p.id) : doc(collection(db, 'products'));
      const { id, ...data } = p;
      await setDoc(ref, data);
      return ref.id;
    },
    deleteProduct(id) { return deleteDoc(doc(db, 'products', id)); },
    async importMenu(categories, products) {
      const batch = writeBatch(db);
      categories.forEach(({ id, ...c }) => batch.set(doc(db, 'categories', id), c));
      products.forEach(({ id, ...p }) => batch.set(doc(db, 'products', id), p));
      batch.set(doc(db, 'config', 'counter'), { n: 0 }, { merge: true });
      await batch.commit();
    }
  };
}

/* ---------------- Modo de teste (navegador local) ---------------- */
function localBackend() {
  const K = { store: 'gbt:store', cats: 'gbt:cats', prods: 'gbt:prods', orders: 'gbt:orders', counter: 'gbt:counter', user: 'gbt:user' };
  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
  const listeners = new Set();
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('gb-teste') : null;
  const fire = () => listeners.forEach((fn) => fn());
  const write = (k, v) => { localStorage.setItem(k, JSON.stringify(v)); fire(); bc?.postMessage(k); };
  bc && (bc.onmessage = fire);
  window.addEventListener('storage', (e) => e.key?.startsWith('gbt:') && fire());
  const watch = (fn) => { listeners.add(fn); fn(); return () => listeners.delete(fn); };
  const uid = () => Math.random().toString(36).slice(2, 12);

  return {
    mode: 'teste',
    onStore: (cb) => watch(() => cb(read(K.store, null))),
    onMenu: (cb) => watch(() => cb({ categories: read(K.cats, []).sort(byOrder), products: read(K.prods, []).sort(byOrder) })),
    async createOrder(order) {
      const n = read(K.counter, 0) + 1;
      localStorage.setItem(K.counter, JSON.stringify(n));
      const id = uid();
      const o = { ...order, id, number: n, status: 'novo', createdAt: Date.now(), statusAt: { novo: Date.now() } };
      write(K.orders, [...read(K.orders, []), o]);
      return { id, number: n };
    },
    onOrder: (id, cb) => watch(() => cb(read(K.orders, []).find((o) => o.id === id) || null)),

    onAuth: (cb) => watch(() => cb(read(K.user, null))),
    async signIn(email) { write(K.user, { email }); },
    async signOut() { write(K.user, null); },
    onOrders: (cb) => watch(() => {
      const t = startOfToday().getTime();
      cb(read(K.orders, []).filter((o) => o.createdAt >= t || ACTIVE.includes(o.status)));
    }),
    async updateOrder(id, patch) {
      write(K.orders, read(K.orders, []).map((o) => (o.id === id ? { ...o, ...patch, statusAt: { ...o.statusAt, ...(patch.statusAt || {}) } } : o)));
    },
    async saveStore(data) { write(K.store, { ...read(K.store, {}), ...data }); },
    async saveCategory(cat) {
      const list = read(K.cats, []);
      const id = cat.id || uid();
      const i = list.findIndex((c) => c.id === id);
      i >= 0 ? (list[i] = { ...list[i], ...cat, id }) : list.push({ ...cat, id });
      write(K.cats, list);
      return id;
    },
    async deleteCategory(id) { write(K.cats, read(K.cats, []).filter((c) => c.id !== id)); },
    async saveProduct(p) {
      const list = read(K.prods, []);
      const id = p.id || uid();
      const i = list.findIndex((x) => x.id === id);
      i >= 0 ? (list[i] = { ...p, id }) : list.push({ ...p, id });
      write(K.prods, list);
      return id;
    },
    async deleteProduct(id) { write(K.prods, read(K.prods, []).filter((p) => p.id !== id)); },
    async importMenu(categories, products) { localStorage.setItem(K.cats, JSON.stringify(categories)); write(K.prods, products); }
  };
}

/* ---------------- Conversões compartilhadas ---------------- */
export const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// cardápio estático (menu-data.js) -> documentos do banco
export function staticMenuToDocs(MENU, HIGHLIGHTS) {
  const featured = new Set(HIGHLIGHTS.map((h) => slug(h.name)));
  const categories = [], products = [], seen = new Set();
  MENU.forEach((c, ci) => {
    categories.push({ id: c.id, name: c.label, order: ci });
    let order = 0;
    const push = (p) => {
      let id = slug(p.name);
      if (seen.has(id)) id += '-' + c.id;
      seen.add(id);
      products.push({ id, categoryId: c.id, order: order++, available: true, featured: featured.has(slug(p.name)), groups: [], tag: '', desc: '', img: '', subgroup: '', ...p });
    };
    (c.items || []).forEach((i) => push({ name: i.name, price: i.price, img: i.img || '', desc: i.desc || '', tag: i.tag || '' }));
    (c.list || []).forEach((g) => g.items.forEach(([n, p]) => push({ name: n, price: p, subgroup: g.group })));
  });
  return { categories, products };
}
