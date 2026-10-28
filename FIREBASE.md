# Ligar o painel do Gordinho ao Firebase

Leva uns 10 minutos e é gratuito (plano Spark). Use a conta Google da loja.

## 1. Criar o projeto
1. Acesse https://console.firebase.google.com e clique em **Criar projeto**.
2. Nome: `gordinho-burguer`. O Google Analytics pode ficar desligado.

## 2. Ligar o banco de dados (Firestore)
1. Menu lateral → **Criação → Firestore Database → Criar banco de dados**.
2. Local: **southamerica-east1 (São Paulo)**.
3. Comece em **modo de produção**.
4. Abra a aba **Regras**, apague tudo, cole o conteúdo do arquivo `firestore.rules` deste projeto
   e troque `EMAIL_DA_LOJA@gmail.com` pelo e-mail da equipe. Clique em **Publicar**.
   - Mais de uma pessoa? `['loja@gmail.com', 'gerente@gmail.com']`

## 3. Ligar o login da equipe
1. Menu lateral → **Criação → Authentication → Vamos começar**.
2. Em **Método de login**, ative **E-mail/senha**.
3. Na aba **Usuários**, clique em **Adicionar usuário** e cadastre o mesmo e-mail que está nas regras, com uma senha forte.

## 4. Copiar a configuração para o site
1. Engrenagem ⚙ → **Configurações do projeto** → em **Seus apps**, clique no ícone **</>** (Web).
2. Apelido: `site`. Não precisa marcar Hosting. Clique em **Registrar app**.
3. Copie o objeto `firebaseConfig` que aparece e cole em `js/firebase-config.js`, assim:

```js
window.FIREBASE_CONFIG = {
  apiKey: "…",
  authDomain: "gordinho-burguer.firebaseapp.com",
  projectId: "gordinho-burguer",
  storageBucket: "…",
  messagingSenderId: "…",
  appId: "…"
};
```

Essa configuração é pública por natureza (fica no site); quem protege os dados são as regras do passo 2.

## 5. Autorizar o domínio do site
**Authentication → Configurações → Domínios autorizados → Adicionar domínio**: `galdinoheitor15-star.github.io`

## 6. Primeiro uso
1. Abra `https://galdinoheitor15-star.github.io/gordinho-burguer-site/admin/` e entre com o e-mail da equipe.
2. Na aba **Cardápio**, clique em **Importar cardápio do site**.
3. Pronto: os pedidos do site passam a cair no painel, com alarme.

## Dicas
- Deixe o painel aberto num celular ou computador no balcão, com o som ligado (🔔).
- Botão **Aberta / Auto / Fechada** no topo controla se o site aceita pedidos.
- Para testar sem mexer nos dados reais: `…/admin/?teste=1` e `…/?teste=1` (dados só no seu navegador). `?teste=0` desliga.
