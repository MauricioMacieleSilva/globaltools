## Salvar resumos no Corte Perfil para consulta posterior

### Objetivo

Permitir que o usuário **salve o estado atual** do Corte Perfil (todos os perfis lançados em U/Z, L, U Enrij., Cartola etc. e o resumo geral) com um nome, e depois **reabra** esse mesmo cálculo exatamente como estava — visualizando inclusive as mesmas linhas e o mesmo Resumo Geral / Otimizado.

### Como vai funcionar para o usuário

Na aba **Resumo**, ao lado dos botões já existentes (Limpar, PDF, Excel), serão adicionados dois novos botões:

1. **Salvar** — abre um diálogo pedindo um nome (ex.: "Obra Cliente X - Galpão") e uma observação opcional. Salva o snapshot completo no banco vinculado ao usuário logado.
2. **Meus Resumos** — abre um diálogo listando todos os resumos salvos pelo usuário (e pelos colegas, se quiser ver), com:
   - Nome / observação
   - Data de criação
   - Peso total e quantidade de peças (preview rápido)
   - Botões **Abrir** (carrega no Corte Perfil) e **Excluir**

Ao clicar em **Abrir**, o sistema substitui o estado atual do Corte Perfil pelo resumo salvo — todas as 7 abas de perfis voltam a mostrar exatamente as linhas que estavam preenchidas, e o Resumo Geral fica idêntico ao momento do salvamento.

Antes de abrir um resumo salvo, se houver dados não salvos no momento, aparece um aviso "Você tem cálculos não salvos. Deseja descartá-los?" para evitar perda acidental.

### O que será salvo

O snapshot guarda **tudo** que define o estado da página:

- `calculos` (registro com todos os perfis calculados e seus pesos)
- `linhasU`, `linhasL`, `linhasUEnrijecido`, `linhasCartola`, `linhasCartolaEnrijecido`, `linhasUSemiEnrijecido`, `linhasCartolaSemiEnrijecido` (estado das tabelas de entrada de cada aba)

Isso garante que ao reabrir o usuário veja **exatamente o mesmo cenário** — não só o resumo final, mas também os campos preenchidos em cada perfil.

### Detalhes técnicos

**Banco de dados (nova migração)**

Tabela `perfil_resumos_salvos`:

```text
id            uuid PK
user_id       uuid (auth.uid())
user_name     text
nome          text NOT NULL          -- nome dado pelo usuário
observacao    text
snapshot      jsonb NOT NULL         -- { calculos, linhasU, linhasL, ... }
peso_total    numeric                -- preview p/ listagem
quantidade_pecas integer             -- preview p/ listagem
created_at    timestamptz default now()
updated_at    timestamptz default now()
```

RLS:
- SELECT: qualquer usuário autenticado vê (mesma lógica das outras ferramentas operacionais — usuários podem consultar resumos da equipe).
- INSERT: `auth.uid() = user_id`.
- UPDATE/DELETE: dono do registro OU admin.

**Frontend**

Novos arquivos:
- `src/services/perfilResumosService.ts` — funções `salvarResumo`, `listarResumos`, `excluirResumo`, `carregarResumo`.
- `src/components/perfis/SalvarResumoDialog.tsx` — diálogo para salvar (nome + observação).
- `src/components/perfis/ResumosSalvosDialog.tsx` — diálogo para listar/abrir/excluir.

Alterações:
- `src/context/PerfilContext.tsx` — expor uma função nova `restaurarSnapshot(snapshot)` que substitui de uma vez `calculos` + todos os arrays `linhasX`. Também expor `obterSnapshot()` que retorna o objeto serializável.
- `src/pages/CortePerfil.tsx` — adicionar os dois botões na aba Resumo, ao lado de Limpar/PDF/Excel.

Toast de confirmação via Sonner (padrão do projeto) ao salvar/abrir/excluir.

### Fora de escopo

- Compartilhar resumo por link público.
- Versionamento (se o usuário abrir e modificar, ele pode "Salvar" de novo, gerando novo registro, ou clicar em "Sobrescrever" — incluiremos esse botão extra dentro do diálogo de salvar quando um resumo já estiver carregado).

### Arquivos afetados

- **Novos**: `src/services/perfilResumosService.ts`, `src/components/perfis/SalvarResumoDialog.tsx`, `src/components/perfis/ResumosSalvosDialog.tsx`
- **Editados**: `src/context/PerfilContext.tsx`, `src/pages/CortePerfil.tsx`
- **Migração**: criar tabela `perfil_resumos_salvos` + RLS
