# CONTEXTO DO PROJETO — App de Treino Personalizado com IA

## REGRAS DO CONTEXTO

> Estas regras garantem que o documento seja sempre consistente entre sessões.

1. **Acumulativo:** o documento nunca perde informações — cada nova versão acrescenta ao que já existe.
2. **Formatação consistente:** manter a mesma estrutura de seções, cabeçalhos e estilo entre versões.
3. **Histórico completo:** todas as versões de todas as sessões devem estar registradas, agrupadas por tema quando fizer sentido.
4. **Versão atual:** sempre atualizar a seção "VERSÃO ATUAL" ao encerrar uma sessão.
5. **Nada pode faltar:** ao encerrar uma sessão, comparar com o documento anterior e garantir que nenhuma seção, regra ou detalhe foi omitido.
6. **Regra de novo chat:** quando o chat ficar grande demais, atualizar este arquivo e iniciar novo chat com os 3 arquivos (index.html, sw.js, contexto). Esta regra deve constar no contexto.

---

## STACK E INFRAESTRUTURA

- **Arquivo:** Single HTML file (`index.html`) + `sw.js` (Service Worker PWA)
- **Hospedagem:** GitHub Pages — `https://broder33.github.io/Treino-Beta/`
- **Auth/Sync:** Supabase — `https://exhajkhacgnsrnnmeism.supabase.co`, tabela `user_data`, RLS configurado
- **IA:** Anthropic API — `claude-sonnet-4-20250514`
- **PWA:** Android (instalado), Chrome Desktop, Edge

---

## VERSÃO ATUAL

- **App:** v0.9.0.02
- **Service Worker:** `treino-v373`
- **Versão publicada online (GitHub Pages):** sempre sincronizada com o último HTML funcional
- **Arquivo de contexto:** `CONTEXTO_PROJETO_6.md`

> **CONVENÇÃO DE VERSÃO:** após v0.8.9.99 vem v0.9.0.00, depois v0.9.0.01, v0.9.0.02... O último número sempre tem dois dígitos. Sempre atualizar versão do app E `CACHE_NAME` do sw.js a cada entrega.

---

## PERFIL DO USUÁRIO

- 176cm, 68kg, 40 anos, 5x/sem
- Lesões: bíceps distal + tendão perna direita (tendão patelar) + ombro direito
- Preferência de exercícios: peso corporal e pesos soltos (chão ou banco), máquinas apenas em último caso
- **Bike:** Colnago, GPS GEOID CC-700, meta 4 rides/semana 1-2h, Z2 predominante, Z4 1x/semana
- **Regra tendão patelar:** bike NUNCA em dia D; sem sprints; cadência alta (>85rpm)
- **Localização:** Londrina, PR — UTC-3

---

## SÉRIES

| Label | Nome | Observações |
|-------|------|-------------|
| A | Ombros | |
| B | Costas / Bíceps | Única série SEM exercícios de Core |
| C | Peito / Tríceps | |
| D | Pernas | |
| Core | CORE | Série dedicada, id: `score`, por padrão complementar (inserida dentro de outros treinos) |

---

## ARQUITETURA DO STATE

```javascript
state._updatedAt              // timestamp para comparação nuvem/local
state.series[]                // Biblioteca de exercícios (inclui série Core)
state.history[]               // Histórico de treinos registrados (ciclo atual)
state.bikeHistory[]           // histórico de rides registrados (ciclo atual)
state.ciclos[]                // ciclos arquivados (ver seção SISTEMA DE CICLOS)
state.lastBibTab              // último card visitado na Biblioteca (persiste entre sessões)
state._agendaOpenCards{}      // estado dos cards da Agenda por dayKey: { open: bool, chatOpen: bool }
state.plano                   // Plano ativo
  .semanas[]                  // Semanas do ciclo (geradas por distribuirDiasEmSemanas)
  .diasStatus{}               // status por dayKey: pendente/concluido/perdido/ausente/disponivel/pulado/antecipado
  .diasExpandidos{}           // treinos expandidos por dayKey
  .diasBike{}                 // dados de bike por dayKey (ver seção SISTEMA DE BIKE)
  .dataInicio                 // data de início do ciclo (ISO)
  ._diasOriginais[]           // dias de treino numerados originais (antes da distribuição por semanas)
  .seriesData{}               // espelhamento interno dos exercícios
  ._historico[]               // snapshots para DESFAZER (máx 5)
  .chatInline{}               // histórico do chat inline por dayKey
  .configTreino               // configuração do motor de relocamento
state.planoRascunho           // plano gerado pela IA aguardando confirmação
state._pendingCicloDataInicio // data de início pendente ao gerar novo ciclo (persiste no state)
state._pendingPrimeiroTreino  // data do primeiro treino de academia (se diferente do início do ciclo)
state.perfil
  .configTreino               // configuração do motor de relocamento
  .diasCiclo                  // total de dias no ciclo (default 20, máx 40)
  .bikeModelo, .bikeGps, .bikeRides, .bikeDuracao, .bikeObjetivo, .bikeTiming, .bikeObs
state._duplicatasPendentes[]  // pares de duplicatas pendentes de revisão
state.exExplanations{}        // cache de explicações ⓘ por nome de exercício
```

---

## MOTOR DE RELOCAMENTO (fila estática)

**Configuração em `state.perfil.configTreino`:**
```javascript
{
  filaPrincipal: ['A','B','C'],
  intercaladas: [{label:'D', freqApos:2, prioridade:1}],
  complementares: [{label:'Core', freqApos:'todos', cadaX:1}],
  posicaoFila: 0,
  diasTreino: ['Segunda','Terça','Quarta','Quinta','Sexta'],
  intervaloMinimo: 2
}
```

**Funções principais:**
- `aplicarRelocamento(dayKey, diaNome, semana, tipo)`
- `marcarSabadoDisponivel(dayKey, diaNome, semana)` — shift INVERSO
- `reorganizarPlanoAPartirDeHoje()`
- `desfazerRelocamento()` — deep restore de snapshot (5 níveis)
- `cancelarSabadoDisponivel(dayKey)`
- `desfazerConclusao(dayKey, serieLabel)` — reverte status concluído, remove do Histórico
- `getMondayOf(date)` — retorna a Segunda-feira da semana de qualquer data
- `pularDia(dayKey, serie)` — pula treino sem reagendar; status `pulado`
- `anteciparProximoTreino(dayKey)` — traz próximo treino para dia pulado; status `antecipado`
- `distribuirDiasEmSemanas(diasTreino, dataInicioTreino, diasTreinoSemana, dataInicioCiclo)` — converte lista de dias numerados em estrutura de semanas calendário
- `calcularEstadoFila(cfg, historicoLabels, n)` — determina próximos N treinos na fila a partir do histórico completo

**Status de dias:**
- `pendente`, `concluido`, `perdido`, `ausente`, `disponivel`, `pulado`, `antecipado`

**Cálculo de datas:**
- Todos os pontos de cálculo usam `getMondayOf(dataInicio)` como base — NUNCA `dataInicio + offset` direto

---

## SISTEMA DE BIKE

### Nova lógica (a partir de v0.8.9.50+)
- Bike é uma **janela livre** em todos os dias (incluindo D)
- Não há dias obrigatórios de bike — o usuário registra quando pedalar
- Por padrão aparece botão compacto "🚲 + Registrar pedal"
- Badge `🚲 PEDAL` só aparece quando há registro efetivo (`bikeStatus === 'feito'`)
- `d.bike` no plano macro foi removido (era sistema antigo de planejamento obrigatório)

### Estrutura de dados
```javascript
state.plano.diasBike[dayKey] = {
  status: 'pendente' | 'feito' | 'chuva' | 'imprevisto',
  registrado: true | false,
  _open: true,              // janela aberta pelo usuário
  substitutoD: true,        // presente apenas em dias D→BIKE
  musculacaoExtra: { serie, orientacao },
  distancia, tempoMov, tempoTotal, velocidade, elevacao, kcal, percurso, timingReal
}

state.bikeHistory[] = [{
  id, type: 'bike', date, dayKey, semana, dia,
  foco: '',   // sempre vazio (foco antigo removido)
  duracao, distancia, tempoMov, tempoTotal,
  velocidade, elevacao, kcal, percurso, timingReal
}]
```

### Comportamento visual
- Dia de descanso com bike registrado: label "🚲 Pedal" (não "Descanso"), badge único `🚲 PEDAL`
- `bikeFeito = bikeStatus === 'feito' || bikeInfo.registrado || bikeHistory.some(b => b.dayKey === dayKey)`
- `bikeBadgeLabel` suprimido quando `isRest && bikeFeito` (tipoLabel já mostra o pedal)

---

## SISTEMA DE CICLOS

### Estrutura
```javascript
state.ciclos[] = [{
  id, numero, nome,
  dataInicio, dataFim,
  plano: { ...plano completo arquivado },
  history: [ ...treinos de musculação do ciclo ],
  bikeHistory: [ ...rides do ciclo ],
  series: [ ...snapshot da biblioteca no encerramento ]
}]
```

### Fluxo de encerramento
1. Botão **⊠ ENCERRAR CICLO ATUAL** na aba Ciclos
2. Modal pede nome do ciclo (opcional)
3. App arquiva em `state.ciclos[]` — plano + histórico completo + snapshot da biblioteca
4. Limpa `state.plano`, `history`, `bikeHistory`
5. Abre aba Plano com mensagem de boas-vindas

### Fluxo de novo ciclo
Botão **✦ INICIAR NOVO CICLO** na aba Plano abre modal com:
- **DATA DE INÍCIO DO CICLO** — datepicker customizado `date-br` (dd/mm/aaaa, sem formato americano)
- **PRIMEIRO TREINO DE ACADEMIA** — datepicker `date-br`, opcional (se diferente do início)
- **SEQUÊNCIA DE TREINOS** — radio: "Continuar do ciclo anterior" (padrão) ou "Iniciar em: [campo]"
- **OBSERVAÇÕES** — texto livre (feriados, restrições etc.)

**Ao confirmar:**
1. `state._pendingCicloDataInicio` = data de início (persiste no state)
2. `state._pendingPrimeiroTreino` = primeiro treino de academia (se diferente)
3. `planoChatHistory` é limpo (contexto zero para novo ciclo)
4. Prompt enviado com: data de início, hoje, sequência calculada pelo app, observações
5. `temPlano` forçado `false` quando `_pendingCicloDataInicio` existe

**Geração do plano:**
- Sistema prompt recebe instrução de dias numerados (não semanas)
- App sempre redistribui via `_redistribuirRascunhoSeNecessario` ao receber rascunho
- Redistribuição: extrai dias em ordem → recalcula sequência correta → `distribuirDiasEmSemanas`
- `_pendingCicloDataInicio` e `_pendingPrimeiroTreino` consumidos ao aplicar

### Aba Histórico (unificada)
- Filtros: **CICLO ATUAL** · **TODOS** · botão por ciclo arquivado
- Ciclos arquivados: card de resumo (período, semanas, treinos, rides) + botão "⬡ ANALISAR COM IA"
- Botões de remover entry apenas no modo "CICLO ATUAL"
- `var _historyViewMode = 'atual'` (variável global)

---

## SISTEMA DE UNDO

- `undoStack[]` — array em memória, máximo 20 snapshots (deep copies do state)
- `pushUndo(label)` — captura snapshot ANTES de mutações (chamado diretamente nas funções de ação)
- `undoAction()` — restaura último snapshot, chama `render()` + `saveState(false, false)`
- Botão `↩ N` no header — mostra contagem de passos disponíveis, tooltip com nome da ação
- Ctrl+Z / Cmd+Z funcionam globalmente
- Funções que chamam `pushUndo` diretamente (antes de mutar): `aplicarRelocamento`, `pularDia`, `aplicarDiaExpandido`, `finishSerieFromAgenda`, `desfazerConclusao`, `marcarDiaDescansoNeutro`
- `saveState(false, false)` — salva sem capturar undo (usado em sub-rotinas como `marcarDia`)

---

## SISTEMA DE TOOLS (IA sob demanda)

### Conceito
O modelo não recebe dados automaticamente. Solicita apenas quando necessário retornando JSON de tool request.

### Tools disponíveis
```javascript
get_historico(n)       // n sessões com exercícios/cargas
get_plano_macro        // semanas + status + [Dia N] por dia de treino
get_serie(label)       // exercícios de A, B, C ou D
get_bike               // rides registrados + planejamento
get_ciclo_anterior(n)  // ciclo N mais recente: plano + histórico + biblioteca
```

### Fluxo
1. Modelo retorna `{"tool":"get_historico","n":20}` (nada mais)
2. App exibe `⟳ Buscando: histórico de treinos…`
3. Resolve localmente, injeta como `[TOOL_RESULT: ...]`, faz nova chamada
4. Máximo 4 rounds de tool por mensagem

### `get_plano_macro` retorna
```
Semana 1, Sexta [Dia 1]: B — orientação... [pendente]
Semana 2, Segunda [Dia 2]: C — orientação... [pendente]
```
Com instrução: "use diaNum para modificar, nunca semana+dia"

---

## SISTEMA DE MODIFICAÇÕES DO PLANO

### Formato (temPlano=true)
```json
{"modificacoes":{"serieLabel":"planoMacro","acoes":[
  {"diaNum":3,"orientacao":"nova orientação","intensidade":"75%"},
  {"tipo":"alterar_serie","serie":"D","orientacao":"instrução universal"}
]}}
```

### Tipos de ação
- `{"diaNum":N,...}` — modifica o Dia N de treino (referência primária)
- `{"tipo":"alterar_serie","serie":"X",...}` — modifica todos os dias da série X

**Semana+dia removido** — o plano é por dias, não por semanas.

---

## FORMATO DO PLANO (geração de novo ciclo)

### JSON gerado pelo modelo
```json
{"planoMacro":{"objetivo":"...","dias":[
  {"dia":1,"serie":"B","orientacao":"instrução específica","intensidade":"70%"},
  {"dia":2,"serie":"D","orientacao":"instrução específica","intensidade":"70%"}
],"observacoes":"progressão: Dias 1-8 acumulação 70-76%, Dias 9-16 intensificação..."}}
```

### Regras
- Apenas dias de treino (A, B, C, D) — sem descansos
- Progressão expressa em números de dia, NUNCA em semanas
- Sequência de séries definida pelo app via `calcularEstadoFila`
- App converte `dias[]` → `semanas[]` via `distribuirDiasEmSemanas`

---

## MOTOR DE GERAÇÃO DE TREINO (EXPANSÃO DO DIA)

### Fluxo em duas etapas
**Etapa 1 — Geração livre:** retorna `nome`, `musculo`, `rest`
**Etapa 2 — Refinamento com Biblioteca:** usa nomes/sets/weight da Biblioteca; `rest` mantido da etapa 1

---

## BOTÃO PARAR

- Botão ↑ (enviar) vira ■ vermelho durante geração
- `_abortRequested = true` → `stopGeneration()`
- Verificado antes de cada chamada e após receber resposta
- Não cancela request em andamento (o request completa mas resposta é descartada)
- Funciona no chat do Plano (`plano-send-btn`) e chats inline (`inline-send-{dayKey}`)
- **Limitação:** `AbortSignal` não pode ser usado — Claude.ai usa `postMessage` que não consegue clonar `AbortSignal`

---

## LAYOUT E UX

### Header
- `#sticky-nav` — wrapper `position:sticky;top:0` contendo `<header>` + `.tabs`
- Header e abas fixos ao rolar

### Aba Plano — botões quick actions
- **✦ INICIAR NOVO CICLO** — abre modal de novo ciclo
- **↺ REORGANIZAR A PARTIR DE HOJE** — redistribui dias futuros
- **✦ GERAR ORIENTAÇÕES** — pede orientações para dias futuros
- **↺ NOVA CONVERSA** — limpa histórico do chat (mantém mensagens visíveis na tela)

### Datepicker customizado (`date-br`)
- Calendário inline no modal, semana começa na Segunda
- Valor gravado em `dd/mm/aaaa` no campo hidden
- Nunca usar `<input type="date">` visível — browser exibe em formato americano
- `showPicker()` não funciona em iframe cross-origin (Claude.ai)

### Mobile
- **NÃO usar scroll horizontal** — apenas scroll vertical
- Emulação: 411×715px, DPR 3.5

---

## SINCRONIZAÇÃO SUPABASE

- `saveState(fromCloud?)` — salva localmente + agenda sync Supabase
- `supabaseLoad()` — compara timestamps, baixa se nuvem for mais recente
- Proteção: `_supabaseLoadComplete` flag evita sobrescrita prematura
- `saveState(false, false)` — salva sem capturar undo e sem sync (uso interno)

---

## REGRAS DE DESENVOLVIMENTO

1. Sempre verificar sintaxe JS com `node --check` antes de entregar
2. Sempre incrementar versão do app E `CACHE_NAME` do sw.js
3. **NÃO fazer alterações não solicitadas**
4. **Não criar lógica específica — sempre lógica universal**
5. **Testar uma versão antes de subir a próxima**
6. **NÃO usar scroll horizontal em mobile**
7. **Sempre atualizar sw.js junto com index.html**
8. **Sempre perguntar antes de agir em decisões de produto**
9. Cálculos de data: sempre usar `getMondayOf(dataInicio)` como base
10. Datas: sempre `dd/mm/aaaa` — nunca formato americano
11. `pushUndo()` deve ser chamado ANTES de qualquer mutação do state

---

## BUGS EM ABERTO

1. **Dropdown "+ SÉRIE ▾" na Biblioteca:** não abre ao clicar no Claude.ai. Funciona via console. `position:fixed` com `getBoundingClientRect()` implementado.
2. **Cor chuva/imprevisto em dias passados:** `bikeStatus='chuva'/'imprevisto'` — cor azul/laranja não testada em produção.
3. **`anteciparABCParaDiaBike` — semana extra:** lógica implementada mas não testada em produção.

---

## HISTÓRICO DE VERSÕES

### Grupo 1: Sincronização e Plano (v0.8.5.58–63)
- **.58:** Correções de sincronização Supabase
- **.59–60:** Debug de sync
- **.61:** "⬤ APLICAR ESTE PLANO" só aparece quando `planoRascunho` existe; modal de confirmação
- **.62:** `planoRascunho` limpo após aplicar plano e modificações
- **.63:** Modal de confirmação usa `confirm()` nativo

### Grupo 2: Campo `rest` e Histórico (v0.8.5.64–67)
- **.64:** Campo `rest` adicionado à Biblioteca, Agenda e prompts
- **.65:** `rest` corrigido em dois pontos de normalização e em `seriesData`
- **.66:** `rest` salvo e exibido no Histórico
- **.67:** Bug de sintaxe no Histórico corrigido

### Grupo 3: Biblioteca — Core, Toggle, Variante (v0.8.5.68–73)
- **.68:** Aba CORE criada; Toggle Manual/Plano removido; Variante removida
- **.69–73:** Grid CSS, série Core dedicada, exercícios, tabs

### Grupo 4: Chat UX (v0.8.5.74–78)
- **.74:** Chat inline oculta JSON; confirmações no chat do Plano
- **.75–78:** `planoRascunho` limpo; proteção dupla; comparação correta

### Grupo 5: Sistema de Duplicatas (v0.8.5.79–92)
- **.79–92:** Sistema implementado, interface batch, prompts, nomenclatura PT/EN

### Grupo 6: Sábado Disponível (v0.8.5.93–98)
- **.93–98:** `marcarSabadoDisponivel` com shift inverso; `cancelarSabadoDisponivel`

### Grupo 7: Biblioteca e Agenda (v0.8.5.99 → v0.8.6.13)
- Botão "i" na Biblioteca, `sincronizarNomesAgenda`, semanas vazias ocultadas

### Grupo 8: Prompt e Chat (v0.8.6.14–24)
- `prompt2` com nomes da Biblioteca, tag [PRONTO PARA APLICAR], classe `hoje`

### Grupo 9: Biblioteca automática e Relocamento (v0.8.6.35–45)
- `adicionarNovosExerciciosNaBiblioteca`, `desfazerRelocamento` preserva diasExpandidos, `getMondayOf`

### Grupo 10: Layout Mobile (v0.8.6.46–62)
- Header mobile compacto, tabs, Biblioteca mobile, "LIMPAR HISTÓRICO" responsivo

### Grupo 11: Configuração de Relocamento (v0.8.6.63–77)
- Botões ↑↓ na fila, séries complementares, bloqueio bidirecional, `coreInstruction`

### Grupo 12: Chat Inline — JSON e Modificações (v0.8.6.78–92)
- `aplicarModificacoesInline`, `atualizarListaExerciciosInline`, guard `diaExpandido`

### Grupo 13: Header Mobile e Bugs (v0.8.6.93 → v0.8.7.05)
- Header mobile dropdown ⋮, `_supabaseLoadComplete` flag

### Grupo 14: Bugfixes Agenda e Biblioteca (v0.8.7.06 → v0.8.7.24)
- `marcarTodosInline`, botão "i", `state._agendaOpenCards`, `irParaTreino(chatOpen)`

### Grupo 15: Chat Inline e Agenda (v0.8.7.25 → v0.8.7.28)
- Fix restauração de chat ao trocar aba

### Grupo 16: Layout e UX (v0.8.7.29 → v0.8.7.40)
- Input sets 120px, `getMondayOf`, semanas encerradas opacity, EXPORTAR/IMPORTAR header

### Grupo 17: Funcionalidades de Agenda (v0.8.7.41 → v0.8.7.59)
- "Pular este treino", "DIA PERDIDO ▾", `anteciparProximoTreino`, status `antecipado`

### Grupo 18: Layout Perfil (v0.8.7.60 → v0.8.7.99)
- CSS Perfil, bloqueio bidirecional corrigido, `complementares` salvo, Core migração

### Grupo 19: Modal, Série Mista e Orientações (v0.8.8.0 → v0.8.8.17)
- `confirmarAcao()`, `criarSerieMista()`, prompt "Gerar Orientações" com resumo semanas

### Grupo 20: Sistema de Bike — Fundação (v0.8.8.18 → v0.8.8.99)
- Estrutura `diasBike` e `bikeHistory`, CSS bike, perfil ciclismo
- Funções: `registrarBike`, `desfazerBike`, `updateBikeField`, `registrarBikeHistorico`
- Histórico unificado: timeline mesclando gym + bike por data
- Bug orientação no relocamento corrigido: `orientacaoPerdida` salva antes do overwrite
- Reordenação manual de exercícios na Agenda: botões ▲▼
- Debug panels removidos

### Grupo 21: D→BIKE Completo (v0.8.9.00 → v0.8.9.47)
- **v0.8.9.00–06:** `substituirDPorBike`, `desfazerSubstitutoD`, card D→BIKE com tipo='bike'
- **v0.8.9.07–14:** `anteciparABCParaDiaBike` — múltiplas iterações para acertar cascade
- **v0.8.9.15–20:** Labels e badges: "Pedal + C" → nome da série; badge unificado
- **v0.8.9.21–27:** Eliminação badge "PEDAL"; unificação em badge "BIKE"; exclusão dias D
- **v0.8.9.28–32:** `hasTreinoAfter` substitui `_semanaTemTreino`; dias após fim do ciclo sem bike
- **v0.8.9.33:** Botões ANTES/APÓS só com `musculacaoExtra`
- **v0.8.9.34–39:** `gerarOrientacaoBike` com prompt rico; toggle sem regerar
- **v0.8.9.40:** Detecção de mensagens existentes com `children.length`
- **v0.8.9.41:** Debug panel removido
- **v0.8.9.42:** Botões D→BIKE com `flex-wrap` para mobile
- **v0.8.9.43:** `registrarBikeHistorico`: fix typo `bikHistory`; remove condição `status!='feito'`; adiciona `tempoMov/tempoTotal/kcal`
- **v0.8.9.44:** Card bike concluído usa class `concluido` (verde igual musculação)
- **v0.8.9.45:** `bikeFeito` verifica também `bikeHistory`
- **v0.8.9.46:** `registrarBikeHistorico` seta `status='feito'`
- **v0.8.9.47:** `bikeFeito` → `concluido` independente do `diasStatus`; tipoLabel "🚴 BIKE" quando `bikeFeito`

### Grupo 22: Undo, Ciclos, Tools, Bike Livre (v0.8.9.48 → v0.9.0.02)

**v0.8.9.48–49:** Sistema de undo com 20 níveis; `pushUndo` direto nas funções de ação; fix undo em relocamentos

**v0.8.9.50–51:** Fix `marcarDiaDescansoNeutro` limpa `d.bike`; fix dia D perdido não herda bike

**v0.8.9.52:** Header + abas fixos (`#sticky-nav`); histórico expandido no contexto IA

**v0.8.9.53:** Sistema de tools sob demanda: `get_historico`, `get_plano_macro`, `get_serie`, `get_bike`; `chamarAPIComTools`; `buildContextoTreino` removido

**v0.8.9.54–57:** Nova lógica de bike — janela livre em todos os dias; `toggleBikeSection`; `bikeTemDia = true`; badge só com registro; fix histórico foco "Z2 Endurance" → "Ride"; migração única via `state._migrations`

**v0.8.9.58–59:** Migração one-shot via flag; limpeza `d.bike` do JSON exportado

**v0.8.9.60:** Sistema de ciclos: `encerrarCiclo`, `renderCiclos`, `analisarCicloNoChat`, tool `get_ciclo_anterior`

**v0.8.9.61:** Botões aba Plano revisados: GERAR NOVO PLANO → ✦ INICIAR NOVO CICLO; removidos DESFAZER, ENVIAR PLANO ATUAL, ENCERRAR CICLO

**v0.8.9.62–63:** `iniciarNovoCiclo` com modal de data; `_pendingCicloDataInicio` persiste no state; `setPlanoInicio` fix timezone

**v0.8.9.64–65:** `calcularEstadoFila` e sequência contínua entre ciclos; aba Ciclos removida, Histórico unificado com filtros; fix `toggleHistoryEx`

**v0.8.9.66:** Formato `planoMacro.dias[]`; `distribuirDiasEmSemanas`; `_redistribuirRascunhoSeNecessario`; "Dia N" na Agenda

**v0.8.9.67–70:** Datepicker customizado `date-br`; fix seleção de data via `addEventListener`

**v0.8.9.71–79:** Fix `_pendingCicloDataInicio` — variável em memória eliminada, apenas `state._pendingCicloDataInicio`; redistribuição ao receber rascunho (não apenas ao aplicar); `temPlano` forçado false com data pendente; limpeza do chat history ao iniciar ciclo

**v0.8.9.80–84:** Diagnóstico via toast; fix causa raiz — histórico do chat causava modelo usar formato `modificacoes`; `planoChatHistory` limpo ao iniciar ciclo (mensagens visuais preservadas)

**v0.8.9.85–86:** Modal com campo "PRIMEIRO TREINO DE ACADEMIA" separado de "DATA DE INÍCIO"; `_pendingPrimeiroTreino`; `distribuirDiasEmSemanas` aceita `dataInicioCiclo` separado de `dataInicioTreino`

**v0.8.9.87–88:** Campo `primeiroTreino` usa datepicker `date-br`; campo "SEQUÊNCIA DE TREINOS" com radio-with-input (Continuar / Iniciar em:)

**v0.8.9.89–93:** Sistema de modificações por `diaNum` (remove semana+dia); `alterar_serie`; system prompt refatorado — periodização por dias, não semanas; `_calcDataDia`; "Dia N do ciclo" no contexto de hoje

**v0.8.9.94:** `semanasNecessarias` removido dos prompts completamente

**v0.8.9.95–97:** Botão parar: ■ vermelho durante geração, `_abortRequested` flag; fix `AbortSignal` não funciona em iframe cross-origin (Claude.ai usa postMessage)

**v0.8.9.98:** Fix `toggleBikeSection` usava `dataInicio + offset` direto (bug quando ciclo não começa na Segunda); corrigido para `getMondayOf(dataInicio)`

**v0.8.9.99:** Input de data nativo removido do header da Agenda; botão ✎ e `showPicker` removidos (não funciona em iframe cross-origin)

**v0.9.0.00:** Versão bump; limpeza

**v0.9.0.01–02:** Fix badge "DESCANSO" em dias com bike registrado; `bikeFeito` verifica `bikeStatus === 'feito'`; `bikeBadgeLabel` suprimido quando `isRest && bikeFeito`

---

## ARQUIVOS DE TRABALHO

- `index.html` — versão atual (v0.9.0.02)
- `sw.js` — `treino-v373`
- `CONTEXTO_PROJETO_6.md` — este arquivo

---

## REGRA PARA NOVA SESSÃO

Ao iniciar nova sessão, o usuário deve anexar:
1. `index.html` (versão mais recente)
2. `sw.js` (versão mais recente)
3. `CONTEXTO_PROJETO_6.md`
