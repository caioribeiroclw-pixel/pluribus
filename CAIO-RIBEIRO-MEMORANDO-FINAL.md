# Memorando de continuidade — Caio Ribeiro / Pluribus

<!-- markdownlint-disable MD013 -->

> **Rascunho público verificável — estado em 2026-07-16 13:00 UTC.** Este arquivo será fechado em 2026-07-18 com os últimos resultados e links. Ele registra fatos públicos e limites; não contém credenciais, dados privados ou alegações de adoção sem evidência.

## Resumo executivo

Pluribus começou como um sincronizador de contexto para ferramentas de IA: uma fonte versionada (`pluribus.md`) gera arquivos nativos como `CLAUDE.md`, `.cursorrules`, `AGENTS.md`, instruções do Copilot e regras do Bob. O trabalho de mercado mostrou que sincronizar bytes não é suficiente. Um arquivo pode existir no destino correto e ainda não ser carregado; pode ser carregado e não mudar o resultado; pode melhorar uma execução e ficar obsoleto na seguinte.

A tese mais defensável hoje é:

> **Pluribus fornece evidência privacy-safe sobre fronteiras de contexto: o que foi configurado, o que o loader nativo observou, qual artefato governou a execução e se o resultado foi aceito ou revertido.**

Pluribus não deve competir como banco de memória, sistema de RAG, orquestrador, agente autônomo ou “agent OS”. Esses mercados já têm produtos fortes. O espaço útil é o join entre artefato configurado, superfície nativa, observação de runtime e outcome.

## Estado público verificável

| Superfície | Estado em 2026-07-16 13:00 UTC | Limite da evidência |
| --- | --- | --- |
| GitHub | [9 stars, 3 forks, 1 watcher](https://github.com/caioribeiroclw-pixel/pluribus) | Interesse/discovery; não prova instalação ou uso |
| Release | [`v0.3.52`](https://github.com/caioribeiroclw-pixel/pluribus/releases/tag/v0.3.52), publicada em 2026-07-14 | Artefato imutável e executável; sem asset download ou run externo atribuível |
| npm | [`pluribus-context@0.3.46`](https://www.npmjs.com/package/pluribus-context) | O registry está atrás do release GitHub; não afirmar que `latest` contém `v0.3.52` |
| Demo | [Context sync + effective-load A/B](https://caioribeiroclw-pixel.github.io/pluribus/context-sync-demo.html) | Prova comportamento do fixture browser; o A/B está marcado como sintético |
| Evidência externa | [Field evidence ledger](https://caioribeiroclw-pixel.github.io/pluribus/field-evidence.html) | Separa mudança upstream, curadoria/distribuição e adoção; não colapsar os níveis |
| Tráfego GitHub, janela de 14 dias | 135 views / 77 uniques; 876 clones / 131 uniques | Métrica agregada e ruidosa; automação e causalidade são desconhecidas |

O caminho executável do release atual, enquanto npm estiver atrasado, é:

```bash
npm exec --yes --package github:caioribeiroclw-pixel/pluribus#v0.3.52 -- pluribus --version
npm exec --yes --package github:caioribeiroclw-pixel/pluribus#v0.3.52 -- pluribus audit --json
```

## O produto que existe

### Base funcional

- CLI Node.js publicada como `pluribus-context` e executada como `pluribus`.
- Fonte canônica em Markdown com imports locais/remotos versionados.
- Geração para superfícies nativas de Claude Code, Cursor, Copilot, OpenClaw, Windsurf, Continue, Zed, Bob, Cline, Roo, Amazon Q, Junie, Warp e Gemini CLI.
- `audit`, `validate`, `sync --dry-run` e relatórios de fidelity.
- Lock/cache determinístico para imports remotos opt-in.
- Demos e checkers privacy-safe para receipts de contexto, skills, memória/RAG, MCP, handoff, compaction, políticas e outcomes.
- Demo browser-only que distingue `configured_but_ignored`, `loaded_but_outcome_failed` e `loaded_and_task_outcome_accepted`.

### O que é central

1. **Identidade:** hash/versão do artefato fonte e do destino.
2. **Descoberta nativa:** destino que o runtime realmente procura, não apenas um fallback genérico.
3. **Observação:** método que sustenta `visible`, `loaded` ou `invoked`; desconhecidos continuam desconhecidos.
4. **Outcome:** verificador após a última mutação e decisão `accepted` ou `reverted`.
5. **Privacidade:** receipts registram metadados mínimos, não prompts, código, transcripts, paths privados ou secrets.

### O que não é central

- ranquear ou armazenar toda memória do usuário;
- decidir automaticamente qual fato é verdade;
- coordenar agentes ou substituir Temporal/MCP/orquestradores;
- prometer paridade semântica apenas porque arquivos têm o mesmo hash;
- registrar payload bruto para ganhar observabilidade.

## Evidência que realmente mudou do outro lado

### 1. Skill aceita e atribuição corrigida na Gaia Skill Tree

A skill `evidence-attestation` foi aceita no registry da Gaia. Quando a primeira PR de atribuição carregou um diff efetivo muito maior que o escopo declarado, a revisão apontou a divergência; o maintainer fechou a PR contaminada e mergeou uma substituição limpa.

- [Skill no registry](https://github.com/gaia-research/gaia-skill-tree/blob/main/registry/named/caioribeiroclw-pixel/evidence-attestation.md)
- [PR limpa de atribuição #1181](https://github.com/gaia-research/gaia-skill-tree/pull/1181)

**Prova:** curadoria externa, mudança de processo/diff e provenance pública.  
**Não prova:** instalação ou uso do CLI Pluribus.

### 2. Observer corrigiu snapshot/dedupe e mergeou a implementação

Uma falha real de identidade de trace virou issue e patch upstream mergeado.

- [Observer issue #10](https://github.com/valtors/observer/issues/10)
- [Observer PR #12](https://github.com/valtors/observer/pull/12)

**Prova:** uma fronteira de evidência identificada por Caio mudou código upstream.  
**Não prova:** que o upstream adotou o formato de receipt do Pluribus.

### 3. Piebald/Gemini CLI aceitou a listagem

A entrada do Pluribus foi mergeada no diretório de Gemini CLI da Piebald.

- [Piebald-AI/awesome-gemini-cli#72](https://github.com/Piebald-AI/awesome-gemini-cli/pull/72)

Duas stars posteriores vieram de contas associadas ao ecossistema Piebald. Isso é discovery qualificado, mas a causalidade da listagem e qualquer instalação continuam desconhecidas.

### 4. O draft do RamenDR testa um destino nativo do Bob

Discussão anterior distinguiu fallback genérico de descoberta nativa. Em julho, o branch de demonstração do maintainer passou a escrever regras do Bob em `.bob/rules/ramenctl.md` e adicionou testes. Eu testei o branch e enviei um review formal `APPROVED` em 2026-07-16, mas o maintainer corrigiu que o PR ainda era um draft não pronto para review. Reconheci publicamente que o approval foi prematuro e parei a revisão até um pedido explícito ou `ready for review`.

- [RamenDR/ramenctl#455](https://github.com/RamenDR/ramenctl/pull/455)
- [Correção pública do boundary de review](https://github.com/RamenDR/ramenctl/pull/455#issuecomment-4993993274)

**Prova:** o branch de demonstração contém e testa a distinção native-vs-fallback.
**Não prova:** aceite do maintainer, prontidão para review, merge final, carga no provider ou melhora de outcome.

### 5. Speck aceitou o lifecycle de resolução

O maintainer concordou com histórico append-only de resoluções, persistência apenas depois de `apply` bem-sucedido, retenção explícita e teste de sobrevivência; declarou plano de implementação no `v1.1`.

- [Speck issue #5](https://github.com/gi-dellav/speck/issues/5)

**Prova:** aceitação de design e compromisso público de implementação.  
**Não prova:** release ou comportamento até o patch ser testado.

## Contribuições em aberto

| Item | Estado atual | Próximo gate |
| --- | --- | --- |
| [Skillsmith PR #1913](https://github.com/smith-horn/skillsmith/pull/1913) | Open, mergeable, sem review; preserva membership por harness durante dedup | Responder apenas a review/triage; não self-bump |
| [agent-tempo PR #942](https://github.com/vinceblank/agent-tempo/pull/942) | Open, mergeable, sem review; impede “handoff complete” sem evidência downstream | Esperar maintainer; adaptar uma vez se houver feedback |
| [awesome-agent-harness PR #40](https://github.com/Picrew/awesome-agent-harness/pull/40) | Open, mergeable, sem review | Não abrir outro diretório sem sinal desta/listagem aceita |
| [DoorDash Agentic Orchestrator PR #90](https://github.com/doordash-oss/agentic-orchestrator/pull/90) | Draft; implementação convidada; CLA é gate legal separado | Lucio decide CLA; sem aceite, manter draft e não representar consentimento |
| [Configuration Effectiveness #213](https://github.com/agentsmd/agents.md/issues/213) | Autor aceitou a ideia como possível Phase 2 e pediu colaboração | Implementar schema/fixtures apenas quando vier event shape/branch real |
| [RamenDR PR #455](https://github.com/RamenDR/ramenctl/pull/455) | Draft de demonstração; maintainer disse que ainda não está pronto para review; meu approval foi prematuro | Não revisar novamente até pedido explícito ou `ready for review`; registrar uma vez se avançar |
| [Speck issue #5](https://github.com/gi-dellav/speck/issues/5) | Implementação prometida para o fim de semana | Testar duas resoluções + failed-apply se o patch chegar |

## O que o mercado ensinou

### Memória é uma categoria ocupada

MCP memory servers, knowledge graphs, RAG sobre notas e perfis de preferência já competem por armazenamento, recuperação, decay e team memory. Pluribus deve tratá-los como produtores de candidatos/evidência, não reconstruí-los.

A pergunta Pluribus é: **qual resultado de memória foi promovido a autoridade, qual versão foi carregada, qual evidência foi suprimida/superseded e qual outcome ocorreu?**

### Portabilidade de arquivo não é paridade de runtime

O mesmo conteúdo em dois destinos pode ter semânticas diferentes:

- um runtime procura `CLAUDE.md`, outro `AGENTS.md`;
- uma skill pode depender de `references/` que um adapter não copia;
- deduplicar realpaths pode apagar a informação de quais harnesses descobrem a skill;
- um destino pode estar configurado, mas nunca entrar no prompt efetivo.

A unidade correta é um **grafo de suporte e observação**, não uma lista de hashes iguais.

### Tokens não são usefulness

Uma medição pública mostrou uma diferença grande de payload inicial e um caso em que Claude Code ignorou `AGENTS.md` mas carregou os mesmos bytes como `CLAUDE.md`. O mesmo estudo mostrou que menos tokens iniciais não garantem menor custo total quando request count/batching mudam.

A cadeia útil é:

```text
configured → visible/discovered → loaded → invoked/used → verifier → accepted_or_reverted
```

Cada seta precisa de método de observação e pode permanecer `unknown`.

### “DONE” é uma transição, não uma frase

Em handoffs e jobs longos, `dispatch + timeout` não prova conclusão. O mínimo confiável é:

```text
produced → durably persisted → verified after final write → consumed downstream
```

Isso orientou as contribuições em DoorDash e agent-tempo.

## Experimentos de distribuição e seus resultados

### Sinais positivos, ainda fracos

- Entrada mergeada em diretório Gemini/Piebald e stars posteriores de contas adjacentes.
- Skill aceita no registry Gaia e attribution corrigida/mergeada.
- 9 stars / 3 forks e tráfego/clones agregados não triviais.
- Um usuário do Reddit relatou exatamente o caso de três cópias divergentes de regras; não há prova de que executou o demo.
- Maintainers externos aceitaram ou implementaram partes do raciocínio de evidence boundaries.

### Canais que não produziram pull suficiente

- Artigo no DEV: 0 reactions / 0 comments após mais de 24 horas.
- Vários replies proativos no Reddit: silêncio recorrente e scores iniciais entre -1 e 0.
- Showcase do Cursor Discord: uma reação e zero replies no último checkpoint.
- GitHub Release `v0.3.52`: duas stars chegaram depois, mas não há sinal causal, download de asset, issue derivada do demo ou run externo atribuível.
- PRs frias de catálogo/upstream: várias continuam mergeable e sem review.

**Decisão:** não compensar ausência de pull com volume. Repetição de reply, schema, demo lane ou directory submission é sinal de canal fraco. Priorizar response-first, maintainer-supplied fixtures e mudanças verificáveis no outro lado.

## Riscos e blockers

### npm atrás do release

O repo/release está em `0.3.52`; npm `latest` está em `0.3.46`. Um publish real em 2026-07-16, usando o token granular privado documentado no runbook, foi recusado pelo registry. O segredo não foi exposto e não deve ser reutilizado em loop.

**Ação humana necessária:** rotacionar/corrigir o token de publish. Depois, publicar o mesmo artefato verificado uma única vez e executar smoke público. Enquanto isso, usar a tag GitHub imutável mostrada acima.

### CLA da DoorDash

A PR #90 requer aceitação jurídica separada. O agente não assinou nem afirmou consentimento em nome de Lucio.

**Ação humana opcional:** revisar a CLA e decidir. Sem aceite explícito, a PR permanece draft.

### Escopo excessivo do projeto

O repositório acumulou muitos exemplos e taxonomias. Isso aumentou superfície de demonstração mais rápido que adoção. Novos receipts só devem entrar quando um consumidor externo trouxer runtime/event shape/fixture ou quando substituírem, em vez de somarem, uma abstração existente.

### Interpretação de métricas

Clones, views, stars, reactions e smoke próprio não equivalem a uso. Não atribuir causalidade a release, diretório ou post sem referrer/relato/issue/run independente.

## Operação segura

- Começar com `audit` ou `sync --dry-run`; não sobrescrever contexto humano sem revisão.
- Nunca registrar prompts, código, transcripts, secrets ou paths privados em receipts públicos.
- Preservar `unknown` quando a fronteira não é observável.
- Verificar outcome depois da última mutação.
- Para ações públicas: confirmar submissão no container/timeline correto e guardar ID/permalink; texto visível em composer não é publicação.
- Para releases: comparar o commit efetivo atrás de tags anotadas (`^{commit}`), não o objeto da tag.
- Para upstreams: resposta-first, patch pequeno, teste real e nenhuma promessa em nome de terceiros.

## Próximos passos recomendados

1. **Fechar o handoff em 2026-07-18:** atualizar este memorando, gerar `CAIO-RIBEIRO-DIARIO-COMPLETO.md`, adicionar a nota honesta no README e entregar o resumo curto a Lucio.
2. **Testar pull existente, não criar nova categoria:** Speck `v1.1`, RamenDR #455, Skillsmith #1913, agent-tempo #942, DoorDash #90 ou CE #213.
3. **Resolver npm somente com credencial corrigida:** publicar `0.3.52` uma vez; não reescrever história nem inventar novo release para contornar auth.
4. **Consolidar o produto:** reduzir a navegação para três jornadas: audit cross-tool, prova de carga efetiva e receipt de outcome. Arquivar/baixar a ênfase de exemplos sem consumidor.
5. **Buscar um usuário observável:** um repo/runtime real que permita A/B com mesma tarefa, source hash, loader evidence e verifier. Um caso aceito/revertido vale mais que outra rodada de conteúdo.
6. **Manter monitoramento de mercado:** ao menos uma superfície social/comunitária por dia, mas agir apenas quando houver pergunta concreta, pedido de feedback ou fixture reproduzível.

## Hipóteses abertas para quem continuar

1. **Effective-load wedge:** builders pagarão/usarão um audit que detecta “arquivo configurado, loader ignorou” antes de investigar comportamento do modelo.
2. **Outcome join:** maintainers aceitarão um sidecar privacy-safe que liga artefato/config ao verificador e à decisão accepted/reverted.
3. **Native support graph:** equipes multi-harness precisam preservar `artefato → destinos onde é descoberto`, em vez de apenas deduplicar conteúdo.
4. **Write-back governance:** quando um target gerado diverge, `warn/reject`, `overwrite` e `review for source promotion` cobrem a maioria dos casos antes de um merge bidirecional complexo.

Falsifique rapidamente. Se nenhum usuário externo trouxer trace, fixture, decisão ou retained work, simplifique para o audit/sync mais confiável e pare de ampliar a taxonomia.

## Links de continuidade

- [Repositório](https://github.com/caioribeiroclw-pixel/pluribus)
- [Release `v0.3.52`](https://github.com/caioribeiroclw-pixel/pluribus/releases/tag/v0.3.52)
- [Demo de context sync/effective load](https://caioribeiroclw-pixel.github.io/pluribus/context-sync-demo.html)
- [Field evidence ledger](https://caioribeiroclw-pixel.github.io/pluribus/field-evidence.html)
- [Community review packet](docs/community-review-packet.md)
- [Runtime vs receipts](docs/runtime-vs-receipts.md)
- [Effective-load artigo no DEV](https://dev.to/caioribeiroclw/configured-isnt-loaded-a-3-step-test-for-ai-coding-instructions-4k15)

---

**Regra de continuidade:** preservar fatos, evidência e limites importa mais que preservar a persona. Caio Ribeiro é uma identidade projetual/agente; qualquer operador futuro deve agir com transparência quando isso importar e nunca representar consentimento legal, financeiro ou humano que não possui.
