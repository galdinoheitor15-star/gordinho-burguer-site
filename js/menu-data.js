// Cardápio — fonte: aidelivery.com.br/gordinhoburguer (conferir preços antes de publicar)
window.ORDER_URL = 'https://www.aidelivery.com.br/gordinhoburguer';

window.HIGHLIGHTS = [
  { name: 'Gordinho Burguer', img: 'p25', price: 42, desc: 'Pão american bread, 2× blend de fraldinha 150g, ovo, bacon, cheddar cremoso, alface, tomate, cebola caramelizada e maionese.' },
  { name: 'Gordin Nordestino', img: 'p23', price: 38, desc: 'Pão american bread, blend de fraldinha 140g, carne de sol desfiada, queijo coalho, alface, tomate, cebola caramelizada e maionese.' },
  { name: 'G Costela', img: 'p24', price: 38, desc: 'Pão american bread, blend de fraldinha 140g, cream cheese, costelinha BBQ e maionese.' },
  { name: 'Gordin Gorgonzola', img: 'p21', price: 31, desc: 'Pão american bread, blend de fraldinha 140g, geleia de abacaxi, gorgonzola, tomate, alface, cebola caramelizada e maionese.' },
  { name: 'Gordin Empanado', img: 'p22', price: 32, desc: 'Pão american bread, blend de fraldinha 140g, queijo empanado, alface, tomate, cebola caramelizada e maionese.' },
  { name: 'Gordin Coalho', img: 'p18', price: 27, desc: 'Pão brioche, blend de churrasco, queijo coalho duplo, geleia de pimenta, alface, tomate, cebola caramelizada e maionese.' }
];

window.MENU = [
  { id: 'especiais', label: 'Especiais', items: [
    { name: 'Gordinho Burguer', img: 'p25', price: 42, tag: 'Carro-chefe', desc: 'American bread, 2× blend de fraldinha 150g, ovo, bacon, cheddar cremoso, alface, tomate, cebola caramelizada e maionese.' },
    { name: 'Gordin Nordestino', img: 'p23', price: 38, desc: 'American bread, fraldinha 140g, carne de sol desfiada, queijo coalho, alface, tomate, cebola caramelizada e maionese.' },
    { name: 'G Costela', img: 'p24', price: 38, desc: 'American bread, fraldinha 140g, cream cheese, costelinha BBQ e maionese.' },
    { name: 'Gordin Empanado', img: 'p22', price: 32, desc: 'American bread, fraldinha 140g, queijo empanado, alface, tomate, cebola caramelizada e maionese.' },
    { name: 'Gordin Gorgonzola', img: 'p21', price: 31, desc: 'American bread, fraldinha 140g, geleia de abacaxi, gorgonzola, tomate, alface, cebola caramelizada e maionese.' }
  ]},
  { id: 'favoritos', label: 'Favoritos', items: [
    { name: 'Gordin Cheese Egg', img: 'p20', price: 28.9, desc: 'Brioche, blend de churrasco, catupiry cremoso, ovo, alface, tomate, cebola caramelizada e maionese.' },
    { name: 'Gordin Onion', img: 'p19', price: 27, desc: 'American bread, fraldinha 150g, cheddar cremoso, alface, tomate, cebola empanada e maionese.' },
    { name: 'Gordin Coalho', img: 'p18', price: 27, desc: 'Brioche, blend de churrasco, coalho duplo, geleia de pimenta, alface, tomate, cebola caramelizada e maionese.' },
    { name: 'Gordin Cheddar', img: 'p16', price: 26, tag: 'Mais pedido', desc: 'Brioche, blend de churrasco, cheddar duplo, bacon, alface, tomate e cebola caramelizada.' },
    { name: 'Gordin Chicken', img: 'p17', price: 26, desc: 'Brioche, peito de frango empanado, mussarela, bacon, alface, tomate, cebola caramelizada e maionese.' },
    { name: 'Gordin Salad', img: 'p15', price: 22, desc: 'Brioche, blend bovino 140g, cheddar, alface, tomate, cebola caramelizada e maionese.' }
  ]},
  { id: 'tradicional', label: 'Tradicionais', items: [
    { name: 'G-Egg', img: 'p28', price: 21, desc: 'Pão bola, hambúrguer, cheddar, ovo, alface, tomate, cebola caramelizada e maionese.' },
    { name: 'G-Bacon', img: 'p27', price: 18, desc: 'Pão bola, hambúrguer, cheddar, bacon, alface, tomate, cebola caramelizada e baconese.' },
    { name: 'G-Classic', img: 'p26', price: 16, desc: 'Pão bola, hambúrguer, cheddar, alface, tomate, cebola caramelizada e maionese.' }
  ]},
  { id: 'entradas', label: 'Entradas', items: [
    { name: 'Batata Creme de Queijo · Costela BBQ', img: 'p5', price: 33, desc: 'Batata frita coberta com creme de queijo e costela BBQ.' },
    { name: 'Batata Creme de Queijo · Carne de Sol', img: 'p6', price: 33, desc: 'Batata frita coberta com creme de queijo e carne de sol.' },
    { name: 'Batata Cheddar e Bacon', img: 'p4', price: 27, desc: 'Batata frita com cheddar cremoso e bacon crocante.' },
    { name: 'Bolinho de Bacalhau', img: 'p14', price: 21.9, desc: 'Porção com 6 unidades.' },
    { name: 'Batata Grande pra Compartilhar', img: 'p60', price: 21, desc: 'Aquela porção pra dividir com a família.' },
    { name: 'Coxinha de Costela c/ Catupiry', img: 'p11', price: 13, desc: 'Recheio de costela com catupiry.' },
    { name: 'Coxinha de Camarão c/ Queijo do Reino', img: 'p12', price: 13, desc: 'Recheio de camarão com queijo do reino.' },
    { name: 'Batata Frita P', img: 'p1', price: 9, desc: 'Porção individual, sequinha e crocante.' },
    { name: 'Coxinha de Frango', img: 'p8', price: 8, desc: 'A clássica, bem recheada.' }
  ]},
  { id: 'baguetes', label: 'Baguetes & Hot Dog', items: [
    { name: 'Baguete de Carne de Sol', img: 'p35', price: 32, desc: 'Cream cheese, carne de sol desfiada, coalho duplo, melaço de cana, alface, tomate e cebola caramelizada.' },
    { name: 'Baguete de Costela', img: 'p166', price: 32, desc: 'Pão baguete com cream cheese e costela.' },
    { name: 'Baguete de Frango', img: 'p34', price: 32, desc: 'Cream cheese, frango em cubos, mussarela, alface, tomate, cebola caramelizada e maionese.' },
    { name: 'Baguete de Carne', img: 'p33', price: 26, desc: 'Cream cheese, coxão mole, mussarela, alface, tomate, cebola caramelizada e maionese.' },
    { name: 'Crepioca', img: 'p165', price: 19.9, desc: 'Carne de sol desfiada, queijo coalho, alface, tomate e molho à escolha.' },
    { name: 'Hot Dog Cheese', img: 'p37', price: 15, desc: 'Carne moída, cream cheese, salsicha, milho, ervilha, batata palha e mussarela maçaricada.' },
    { name: 'Hot Dog Tradicional', img: 'p36', price: 11, desc: 'Carne moída, salsicha, tomate, cebola, milho, ervilha e batata palha.' }
  ]},
  { id: 'kids', label: 'Kids', items: [
    { name: 'Gordinho Feliz', img: 'p144', price: 33, desc: 'Brioche, fraldinha 100g, mussarela + batata frita + suco Kapo ou refri.' },
    { name: 'Gordinho Kids', img: 'p32', price: 33, desc: '3 mini hambúrgueres, batata frita e suco Kapo.' }
  ]},
  { id: 'shakes', label: 'Milk-shakes & Doces', items: [
    { name: 'Milk-shake Ninho c/ Nutella', img: 'p45', price: 20, desc: 'Cremoso, gelado e generoso.' },
    { name: 'Milk-shake Ninho c/ Morango', img: 'p142', price: 20, desc: 'Leite Ninho com morango.' },
    { name: 'Milk-shake Ovomaltine', img: 'p42', price: 20, desc: 'Com pedacinhos crocantes.' },
    { name: 'Milk-shake Doce de Leite', img: 'p164', price: 20, desc: 'Doce de leite de verdade.' },
    { name: 'Milk-shake Chocolate', img: 'p43', price: 17, desc: 'O clássico que nunca falha.' },
    { name: 'Milk-shake Morango', img: 'p41', price: 17, desc: 'Docinho e refrescante.' },
    { name: 'Milk-shake Paçoca', img: 'p44', price: 17, desc: 'Sabor de festa junina o ano todo.' },
    { name: 'Paleta Mexicana', img: 'p100', price: 12, desc: 'Recheada e cremosa.' },
    { name: 'Pudim', img: 'p92', price: 8.9, desc: 'Lisinho, do jeito de vó.' },
    { name: 'Brownie', price: 8 },
    { name: 'Brigadeiro', price: 3 }
  ]},
  { id: 'bebidas', label: 'Bebidas & Açaí', list: [
    { group: 'Açaí', items: [
      ['Açaí na tigela 500ml', 28.99], ['Açaí na tigela 300ml', 15.9], ['Batida de açaí 400ml', 13.9]
    ]},
    { group: 'Sucos', items: [
      ['Jarra suco natural de laranja', 22], ['Jarra de suco (cajá, graviola ou maracujá)', 18],
      ['Copo suco natural de laranja 400ml', 10], ['Suco de polpa 400ml (cajá, graviola ou maracujá)', 7], ['Kapo 200ml (morango ou uva)', 5]
    ]},
    { group: 'Refrigerantes & Água', items: [
      ['Coca-Cola / Coca Zero 1L', 13], ['Fanta 1L', 13], ['H2OH! Limoneto', 7.99], ['Sprite Lemon Fresh 500ml', 7.99],
      ['Lata 350ml (Coca, Coca Zero, Sprite, Kuat)', 7], ['Kuat KS 290ml', 7], ['Água com gás 500ml', 5], ['Água mineral 350ml', 4]
    ]}
  ]}
];
