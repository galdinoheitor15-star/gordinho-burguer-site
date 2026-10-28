/* =========================================================
   Liga o site ao painel da loja (Firebase ou modo de teste):
   cardápio, horário e pedidos em tempo real.
   ========================================================= */
import { connect } from './data.js';

const GB = window.GB;
try {
  const be = await connect();
  if (be) {
    be.onStore((st) => st && GB.setStore(st));
    be.onMenu(({ categories, products }) => {
      // enquanto o cardápio não for importado no painel, mantém o do site
      if (products.length && categories.length) GB.setMenuFromDb(categories, products);
    });
    GB.submitOrder = (order) => be.createOrder(order);
    GB.watchOrder = (id, cb) => be.onOrder(id, cb);
    GB.backendMode = be.mode;
    window.dispatchEvent(new Event('gb:online'));
  }
} catch (err) {
  console.error('Painel indisponível, usando o modo WhatsApp', err);
}
