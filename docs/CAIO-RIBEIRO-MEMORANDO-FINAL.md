# Memorando de continuidade — Caio Ribeiro / Pluribus

<!-- markdownlint-disable MD013 -->

> **Rascunho público verificável — atualizado em 2026-07-17 22:00 UTC.** Este arquivo será fechado em 2026-07-18 com os últimos resultados e links. Ele registra fatos públicos e limites, evita intencionalmente credenciais/dados privados e passou por scans direcionados; esses scans reduzem risco, mas não são garantia universal. Alegações de adoção exigem evidência independente.

## Resumo executivo

Pluribus começou como um sincronizador de contexto para ferramentas de IA: uma fonte versionada (`pluribus.md`) gera arquivos nativos como `CLAUDE.md`, `.cursorrules`, `AGENTS.md`, instruções do Copilot e regras do Bob. O trabalho de mercado mostrou que sincronizar bytes não é suficiente. Um arquivo pode existir no destino correto e ainda não ser carregado; pode ser carregado e não mudar o resultado; pode melhorar uma execução e ficar obsoleto na seguinte.

A tese mais defensável hoje é:

> **Pluribus fornece evidência privacy-safe sobre fronteiras de contexto: o que foi configurado, o que o loader nativo observou, qual artefato governou a execução e se o resultado foi aceito ou revertido.**

Pluribus não deve competir como banco de memória, sistema de RAG, orquestrador, agente autônomo ou “agent OS”. Esses mercados já têm produtos fortes. O espaço útil é o join entre artefato configurado, superfície nativa, observação de runtime e outcome.

## Estado público verificável

| Superfície | Estado em 2026-07-17 13:00 UTC | Limite da evidência |
| --- | --- | --- |
| GitHub | [9 stars, 3 forks, 1 watcher](https://github.com/caioribeiroclw-pixel/pluribus) | Interesse/discovery; não prova instalação ou uso |
| Release | [`v0.3.52`](https://github.com/caioribeiroclw-pixel/pluribus/releases/tag/v0.3.52), publicada em 2026-07-14 | Artefato imutável e executável; sem asset download ou run externo atribuível |
| npm | [`pluribus-context@0.3.46`](https://www.npmjs.com/package/pluribus-context) | O registry está atrás do release GitHub; não afirmar que `latest` contém `v0.3.52` |
| Demo | [Context sync + effective-load A/B](https://caioribeiroclw-pixel.github.io/pluribus/context-sync-demo.html) | Prova comportamento do fixture browser; o A/B está marcado como sintético |
| Evidência externa | [Field evidence ledger](https://caioribeiroclw-pixel.github.io/pluribus/field-evidence.html) | Separa mudança upstream, curadoria/distribuição e adoção; não colapsar os níveis |
| Tráfego GitHub, janela móvel de 14 dias | 100 views / 43 uniques; 954 clones / 147 uniques | Snapshot em 2026-07-17 13:00 UTC; métrica agregada e ruidosa, com automação e causalidade desconhecidas |

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

### 6. agent-lint separou superfície compartilhada de ativação Codex

Uma matriz adversarial mostrou que `AGENTS.md` prova a presença de uma superfície compartilhada, mas não que Codex está ativo. O maintainer aceitou o diagnóstico como bug de modelagem, implementou `DetectedSurfaces → ValidationTargets`, separou também `.agents/skills/`, mergeou a correção e a publicou em `v2.4.1`.

- [Diagnóstico e matriz no issue #145](https://github.com/zhupanov/agent-lint/issues/145)
- [Implementação mergeada no PR #148](https://github.com/zhupanov/agent-lint/pull/148)
- [Release `v2.4.1`](https://github.com/zhupanov/agent-lint/releases/tag/v2.4.1)

O binário Linux x86_64 do release foi verificado pelo checksum publicado e testado em quatro fixtures. `AGENTS.md` sozinho e `AGENTS.md + Cursor` emitiram o check compartilhado `I002`, sem o limite Codex `CX040`; `AGENTS.md + .codex/config.toml` e `AGENTS.md + codex=true` emitiram ambos.

**Prova:** feedback externo virou modelagem, testes, merge, release e comportamento black-box observável.
**Não prova:** uso do Pluribus ou adoção do formato de receipts; valida especificamente o boundary de descoberta/ativação.

### 7. Skillsmith preservou membership por harness em vez de colapsar por realpath

O issue reproduzível mostrou que uma skill física compartilhada por symlink entre dois harnesses era atribuída apenas ao primeiro destino escaneado. O maintainer confirmou o diagnóstico, encontrou um segundo defeito no scanner CLI para diretórios de skill individualmente symlinkados e mergeou uma correção mais completa no PR #1923.

- [Diagnóstico no issue #1912](https://github.com/smith-horn/skillsmith/issues/1912)
- [Correção mergeada no PR #1923](https://github.com/smith-horn/skillsmith/pull/1923)
- [Patch inicial #1913, fechado como superseded](https://github.com/smith-horn/skillsmith/pull/1913)

A implementação separa cache de parse/hash por realpath de emissão por `(harness, realpath)`, mantém dedup dentro do mesmo harness e aplica o fallback de `skill_id` com o nome observado por cada harness. O maintainer também adicionou descoberta de diretório individualmente symlinkado no CLI. O PR foi mergeado em 2026-07-17 no commit `a6f7dc3`; os checks de core, CLI, integração, E2E, segurança, build e CodeQL passaram. Fechei o patch menor #1913 depois de confirmar que #1923 cobre o caso original e o defeito adicional.

**Prova:** diagnóstico externo aceito, implementação/testes no upstream, merge e CI verde.
**Não prova:** release publicado, uso do dashboard hospedado ou adoção do Pluribus; valida o boundary específico de membership cross-harness.

### 8. data-olympus aceitou o promotion receipt como direção de design

No issue de curadoria `kb_curate`, propus manter a fronteira entre padrão observado pelo agente e regra aceita pela equipe por meio de um promotion receipt: fontes e hashes, sinais de repetição, controles negativos, conflitos, blast radius, revisão humana e condições de staleness.

- [Proposta e triagem no issue #31](https://github.com/knaisoma/data-olympus/issues/31#issuecomment-5003411975)

Em 2026-07-17, o maintainer classificou a proposta como útil, afirmou que o shape combina com a direção human-gated e manteve o issue aberto para um design pass dedicado.

**Prova:** aceitação independente da direção de design e do shape do receipt.
**Não prova:** implementação, merge, release, uso do Pluribus ou adoção por usuários; o issue continua aberto.

### 9. Knowledge Catalog ganhou uma PR de substituição com fixtures empíricas de compressão

No [issue #53](https://github.com/GoogleCloudPlatform/knowledge-catalog/issues/53), propus separar a política declarada pelo produtor do receipt emitido pelo consumidor e testar a fronteira com quatro arquivos por caso: `concept.md`, resumo bom, resumo ruim e `expected.yaml`. A [PR #99](https://github.com/GoogleCloudPlatform/knowledge-catalog/pull/99) materializou três fixtures sintéticas, mas ficou sem review e bloqueada pelo Google CLA.

Em 2026-07-17, o colaborador que abriu o issue aceitou explicitamente o contrato, mapeou três casos observados — inversão semântica, substituição de entidade e apagamento de proveniência — e abriu a [PR #208](https://github.com/GoogleCloudPlatform/knowledge-catalog/pull/208). Ela preserva o contrato de quatro arquivos, usa IDs estáveis, cita registros públicos e mantém o teste determinístico limitado à preservação contra a política declarada, não à verdade no mundo. A PR está aberta, não é draft, e os checks de mudança e Google CLA passaram; ainda não recebeu review nem foi mergeada. Fechei a #99 como superseded para não manter duas variantes concorrentes.

**Prova:** um colaborador independente transformou o contrato em uma PR pública com três casos empíricos e os arquivos esperados; a variante sintética concorrente foi encerrada.
**Não prova:** aceite do maintainer, merge, release, execução de um evaluator, adoção do Pluribus ou validação das alegações acadêmicas subjacentes.

### 10. gbrain preservou provenance no handler público de ingestão

No issue [gbrain #1522](https://github.com/garrytan/gbrain/issues/1522), eu havia apontado que validar provenance e devolvê-la no resultado sem provar a mesma informação na linha persistida cria um falso receipt. A correção chegou no [PR #2920](https://github.com/garrytan/gbrain/pull/2920), mergeado em 2026-07-17 no commit `7ffac65` como parte de uma wave maior de source identity.

Para `ingest_capture`, o código agora encaminha `source_kind`, `source_uri` e `ingested_via: 'ingest_capture'` ao write. Um `source_id` confiável e registrado governa a linha; IDs não registrados e payloads não confiáveis permanecem fail-closed no source `default`. Os testes PGLite comparam resultado e persistência, cobrem as três rotas e todos os checks do PR passaram. A sugestão de testar idempotência por source não entrou nesta correção.

**Prova:** um boundary público levantado no thread virou código, testes e merge upstream, incluindo distinção entre metadata de provenance e autoridade para escolher o source de escrita.
**Não prova:** release publicado, uso por connector real, adoção do Pluribus ou do seu formato de receipt; o PR também inclui duas correções de source identity não atribuíveis à minha contribuição.

### 11. full-stack-ai-agent-template reduziu contexto sempre carregado e adicionou guard determinístico

No [issue #119](https://github.com/vstorm-co/full-stack-ai-agent-template/issues/119), propus medir os arquivos gerados `AGENTS.md`/`CLAUDE.md` contra outcomes, citando o custo de contexto sempre carregado e a duplicação entre o `CLAUDE.md` raiz e regras path-scoped. O maintainer confirmou o diagnóstico, rejeitou com razão um harness A/B caro e não determinístico para CI, e aceitou o caminho menor: preservar comandos, hard boundaries e pointers, remover overview/duplicações e proteger o contrato com checks baratos.

O [PR #120](https://github.com/vstorm-co/full-stack-ai-agent-template/pull/120), aberto pelo maintainer, foi mergeado em 2026-07-17 no commit `bf0fd07`. Ele reduziu o template raiz de `CLAUDE.md` de 187 para 92 linhas, removeu a árvore e seções já cobertas por `.claude/rules/*`, preservou cinco boundaries cross-cutting e adicionou quatro testes determinísticos: headings proibidos, ausência de árvore, budget de 110 linhas e presença de comandos/pointer para regras. `AGENTS.md` permaneceu self-contained para runtimes que não carregam as regras do Claude. Todos os checks visíveis do PR passaram; o merge também incluiu um bump de segurança de `click` não atribuível à proposta de contexto.

**Prova:** diagnóstico e direção ajustada em conjunto viraram patch do maintainer, testes de regressão e merge upstream.
**Não prova:** benchmark A/B de outcome, redução medida de custo em projetos gerados, release do template, uso do Pluribus ou adoção do formato de receipts.

## Contribuições em aberto

| Item | Estado atual | Próximo gate |
| --- | --- | --- |
| [agent-tempo PR #942](https://github.com/vinceblank/agent-tempo/pull/942) | Open, mergeable, sem review; impede “handoff complete” sem evidência downstream | Esperar maintainer; adaptar uma vez se houver feedback |
| [awesome-agent-harness PR #40](https://github.com/Picrew/awesome-agent-harness/pull/40) | Open, mergeable, sem review | Não abrir outro diretório sem sinal desta/listagem aceita |
| [DoorDash Agentic Orchestrator PR #90](https://github.com/doordash-oss/agentic-orchestrator/pull/90) | Draft; implementação convidada; CLA é gate legal separado | Lucio decide CLA; sem aceite, manter draft e não representar consentimento |
| [Configuration Effectiveness #213](https://github.com/agentsmd/agents.md/issues/213) | Autor aceitou a ideia como possível Phase 2 e pediu colaboração | Implementar schema/fixtures apenas quando vier event shape/branch real |
| [RamenDR PR #455](https://github.com/RamenDR/ramenctl/pull/455) | Draft de demonstração; maintainer disse que ainda não está pronto para review; meu approval foi prematuro | Não revisar novamente até pedido explícito ou `ready for review`; registrar uma vez se avançar |
| [Speck issue #5](https://github.com/gi-dellav/speck/issues/5) | Implementação prometida para o fim de semana | Testar duas resoluções + failed-apply se o patch chegar |
| [data-olympus issue #31](https://github.com/knaisoma/data-olympus/issues/31) | Maintainer aceitou o promotion receipt como direção human-gated; issue aberto para design pass dedicado | Esperar design/fixture do maintainer; não antecipar implementação sem convite |
| [Knowledge Catalog PR #208](https://github.com/GoogleCloudPlatform/knowledge-catalog/pull/208) | PR de substituição aberta, não draft, com três casos observados; checks de mudança e CLA verdes, mas sem review; #99 fechada como superseded | Esperar review do maintainer; não revisar nem ampliar sem convite explícito |

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
- Maintainers externos aceitaram ou implementaram partes do raciocínio de evidence boundaries; `agent-lint v2.4.1` contém um caso mergeado, publicado e verificado black-box.
- Skillsmith aceitou o reproducer cross-harness, mergeou a correção no PR #1923 e ampliou os testes para um segundo defeito revelado pelo mesmo caso; ainda não há prova de release/uso.
- data-olympus aceitou o promotion receipt como direção de design human-gated; ainda não há implementação, merge ou release.
- Um colaborador do Knowledge Catalog abriu a PR #208 com três fixtures empíricas e o contrato combinado; #99 foi fechada como superseded e o CLA ficou verde, mas ainda não há review ou aceite do maintainer.
- O gbrain mergeou o write-through de provenance do `ingest_capture` com testes PGLite e trust gate; ainda não há release ou uso de connector atribuído.
- O full-stack-ai-agent-template mergeou a redução de 187 para 92 linhas do `CLAUDE.md` gerado e um guard anti-duplicação/line-budget; não há benchmark de outcome, release ou uso atribuído.

### Canais que não produziram pull suficiente

- Artigo no DEV: 0 reactions / 0 comments após mais de 24 horas.
- Vários replies proativos no Reddit: silêncio recorrente e scores iniciais entre -1 e 0.
- Showcase do Cursor Discord: uma reação e zero replies no último checkpoint.
- GitHub Release `v0.3.52`: duas stars chegaram depois, mas não há sinal causal, download de asset, issue derivada do demo ou run externo atribuível.
- PRs frias de catálogo/upstream: várias continuam mergeable e sem review.
- A [PR OpenTelemetry #190](https://github.com/open-telemetry/semantic-conventions-genai/pull/190) foi fechada por mim em 2026-07-18 após review apontar que o cenário Anthropic usava contagens sintéticas que a instrumentação não conseguia emitir e que faltavam terminologia consolidada e implementações de frameworks/client libraries. O fixture e os checks gerados não provavam suporte do ecossistema nem aceite do OpenTelemetry; a CLA também permaneceu sem assinatura.

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
2. **Testar pull existente, não criar nova categoria:** Speck `v1.1`, RamenDR #455, agent-tempo #942, DoorDash #90 ou CE #213.
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
