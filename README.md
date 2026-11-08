# GTG Energia — versão de demonstração

Cópia do sistema **sem banco de dados** e com **dados 100% fictícios**, feita para apresentações.
Tudo fica na memória do servidor: você pode criar, editar e excluir à vontade, e ao reiniciar
o servidor os dados voltam ao início.

## Rodar no seu computador

```bash
npm install
npm run dev        # abre em http://localhost:3000
```

Para uma apresentação mais estável (mais rápido, sem recarregar):

```bash
npm run build
npm start
```

## Acesso

- E-mail: `admin@demo.com` — Senha: `demo123` (administrador, vê tudo)
- E-mail: `operador@demo.com` — Senha: `demo123` (operador)

## Onde estão os dados fictícios

`lib/demo-seed.ts` — obras, equipes, funcionários, produtos, movimentações e notas fiscais.
Edite esse arquivo para mudar nomes, valores ou quantidades.

## Publicar na Vercel (opcional)

Funciona sem configurar nada (não precisa de variáveis de ambiente). Na Vercel os dados ficam
na memória de cada instância, então podem voltar ao início de tempos em tempos; para
apresentar, rodar no computador (`npm run build && npm start`) é o mais seguro.
