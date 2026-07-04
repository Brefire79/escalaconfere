# AGENTS.md

## Instruções para agentes

Este repositório contém um app Vite/React/TypeScript chamado Escala Bomba.

## Como trabalhar

- Leia `PRD.md` antes de mudanças funcionais.
- Preserve as regras de negócio de escalas principais por dia.
- Use `apply_patch` para edições manuais.
- Não remova dados, arquivos ou configurações sem pedido explícito.
- Prefira mudanças pequenas, testáveis e compatíveis com o app atual.

## Validação obrigatória

Após alterar código TypeScript/React/CSS, execute:

```bash
node .\node_modules\typescript\bin\tsc --noEmit
node .\node_modules\vite\bin\vite.js build
```

## Pontos de atenção

- `localStorage` é a fonte de dados atual.
- Dados antigos podem não ter campos novos; faça migração defensiva.
- `public/index.html` não é o entrypoint do Vite.
- Bibliotecas de exportação aumentam o bundle; evite carregá-las em novos fluxos sem avaliar impacto.
