# CLAUDE.md

## Contexto do projeto

Este projeto é um app React + Vite + TypeScript para controle de escalas de bombeiro. A aplicação é local/offline-first, usa `localStorage` para persistência e exporta relatórios com `jspdf`, `jspdf-autotable` e `xlsx`.

## Comandos úteis

```bash
npm run dev
npm run build
node .\node_modules\typescript\bin\tsc --noEmit
```

## Arquivos principais

- `src/App.tsx`: contém estado, regras de negócio, calendário, financeiro e exportações.
- `src/App.css`: estilos da interface.
- `src/main.tsx`: montagem do React.
- `public/manifest.json`: configuração PWA.
- `public/sw.js`: service worker.
- `index.html`: entrypoint real usado pelo Vite.

## Regras de negócio importantes

- Tipos de escala suportados: `delegada`, `dejem`, `dejemSazonal`, `outros`.
- `delegada`, `dejem` e `dejemSazonal` são escalas principais e só pode existir uma delas por dia.
- `delegada`, `dejem` e `dejemSazonal` exigem `funcao`: `motorista` ou `efetivo`.
- `outros` é exibido ao usuário como Anotação, exige texto e pode existir mais de uma vez no mesmo dia.
- `outros` não soma no financeiro.
- Os relatórios PDF e Excel devem contabilizar Delegada, DEJEM e DEJEM Sazonal.

## Cuidados ao alterar

- Não quebrar compatibilidade com dados antigos do `localStorage`.
- Sempre rodar TypeScript e build depois de mudanças no app.
- Evitar refatorações grandes sem necessidade, pois o app está concentrado em `src/App.tsx`.
- Se mexer em PWA, lembrar que o Vite usa o `index.html` da raiz, não `public/index.html`.
