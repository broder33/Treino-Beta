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
- **IA:** Anthropic API — `claude-sonnet-4-5` (corrigido na Sessão 7; o nome antigo `claude-sonnet-4-20250514` foi descontinuado e retornava 404)
- **PWA:** Android (instalado), Chrome Desktop, Edge

---

## VERSÃO ATUAL

- **App:** v0.9.0.37
- **Service Worker:** `treino-v407`
- **Versão publicada online (GitHub Pages):** sempre sincronizada com o último HTML funcional
- **Arquivo de contexto:** `CONTEXTO_PROJETO_7.md`

> **CONVENÇÃO DE VERSÃO:** após v0.8.9.99 vem v0.9.0.00, depois v0.9.0.01, v0.9.0.02... O último número sempre tem dois dígitos. Sempre atualizar versão do app E `CACHE_NAME` do sw.js a cada entrega.

---

## PERFIL DO USUÁRIO

- 176cm, 68kg, 40 anos, 5x/sem
- Lesões: bíceps distal + tendão perna direita (tendão patelar) + ombro direito
- Preferência de exercícios: peso corporal e pesos soltos (chão ou banco), máquinas apenas em último caso
- **Bike:** Colnago (comprada USADA), GPS GEOID CC-700, meta 4 rides/semana 1-2h, Z2 predominante, Z4 1x/semana
- A bike é usada também pelo sócio do usuário — apenas os rides do usuário são registrados no app (por isso odômetro é manual, não alimentado pelos rides)
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

**Rotação de treinos superiores:** B→C→A repetindo, com D inserido a cada 2 treinos superiores. Sequência típica: A, B, D, C, A...

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
state.bikeOdo                 // Odômetro da bike — aba Bike (ver seção ABA BIKE / ODÔMETRO)
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
state._duplicatasPendentes[]  // pares de duplicatas pendentes de revisão (com _selecionado/_nomeEditado/_contexto por par — paginação preserva seleções)
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
- `_calcDataDia(semanaNum, diaNome, dataInicio)` — data real de um dia da agenda (usa getMondayOf)

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
  relocado: true | false,   // (Sessão 7) modo escolhido no D→BIKE: true=relocado, false=substituído. Legado sem flag = relocado
  musculacaoExtra: { serie, orientacao },
  distancia, tempoMov, tempoTotal, velocidade, elevacao, kcal, percurso, timingReal
}

state.bikeHistory[] = [{
  id, type: 'bike', date, dayKey, semana, dia,
  registeredAt,  // (Sessão 7) momento do registro; `date` = dia real do treino na agenda (via _calcDataDia)
  foco: '',   // sempre vazio (foco antigo removido)
  duracao, distancia, tempoMov, tempoTotal,
  velocidade, elevacao, kcal, percurso, timingReal
}]
```

### Comportamento visual
- Dia de descanso com bike registrado: label "🚲 Pedal" (não "Descanso"), badge único `🚲 PEDAL`
- `bikeFeito = bikeStatus === 'feito' || bikeInfo.registrado || bikeHistory.some(b => b.dayKey === dayKey)`
- `bikeBadgeLabel` suprimido quando `isRest && bikeFeito` (tipoLabel já mostra o pedal)

### Regras de dados (Sessão 7)
- `registrarBikeHistorico`: `date` = data real do dia da agenda (`_calcDataDia`), `registeredAt` = momento do registro — coerente com o modelo do histórico de musculação
- `updateBikeField` sanitiza unidades digitadas: remove `km` (distancia), `m` (elevacao), `kcal` (kcal) do final do valor — a UI acrescenta a unidade na exibição

### D→BIKE — Substituir ou Relocar (Sessão 7, v0.9.0.29)
- Ao clicar D→BIKE, abre modal com duas opções:
  - **SUBSTITUIR** — treino D é descartado, dia vira apenas pedal (sem relocação); `relocado: false`
  - **RELOCAR** — comportamento clássico: `aplicarRelocamento`, D vai para outro dia; `relocado: true`
- Funções: `substituirDPorBike` (modal), `_dParaBikeSubstituir`, `_dParaBikeRelocar`, `_dParaBikeMarcarDia`
- `desfazerSubstitutoD` respeita o modo: relocado → `desfazerRelocamento()`; substituído → restaura o dia diretamente (serie 'D', tipo 'treino')
- System prompt da IA atualizado descrevendo os dois modos

---

## ABA BIKE / ODÔMETRO (Sessão 7 — Etapa 1 implementada)

### Objetivo
Manter histórico de uso e revisões da bike — controle de itens de desgaste/manutenção por data e/ou quilometragem. A km total da bike é desconhecida (bike usada); o odômetro rastreia apenas os km rodados pelo usuário desde a compra.

### Modelo do odômetro (painel de carro)
- **Odômetro TOTAL:** automático, cumulativo, NUNCA zera. Exibido com prefixo `>` quando a bike é usada (km real é maior). Edição manual existe mas protegida (modal com aviso + observação) — caso de uso: GPS sem bateria, km inserida manualmente sem alterar o parcial.
- **Odômetro PARCIAL:** controlado pelo usuário (espelha o parcial do GPS, que é zerado a cada limpeza de corrente). Atualizar o valor soma o delta ao total com confirmação mostrando o cálculo. Botão RESET zera o parcial (total intocado).
- **Fluxo de atualização do parcial:**
  - delta > 0 → confirmação "parcial X→Y (+Z), total T→T+Z" com botão VOLTAR para typos
  - delta = 0 → oferece atualizar apenas a data
  - delta < 0 → pergunta o motivo: (a) digitei errado (volta), (b) parcial foi zerado e não reportei (novo valor conta a partir do zero), (c) leitura anterior estava errada (correção; total ajustado para baixo)
- **BIKE PARADA (só data):** atualiza a data da última leitura sem km — o motor de estimativas sabe que não houve rodagem no período
- **Campo de observação (opcional)** em atualizar/reset/editar total — ex: "limpeza da corrente", "troca de corrente", "GPS sem bateria". Exibido em destaque no histórico.
- **Histórico de leituras:** log completo (tipo, data, valores, observação) — tipos: setup, parcial, reset, data, edicao, edicao-total

### Estrutura `state.bikeOdo`
```javascript
state.bikeOdo = {
  nome,           // nome/modelo da bike (abre porta para múltiplas bikes no futuro — não usado ainda)
  dataCompra,     // ISO
  usada,          // true = bike comprada usada (total exibe ">"), false = nova (km exata)
  total,          // odômetro total (km rodados pelo usuário)
  parcial,        // última leitura do parcial (GPS)
  dataUltima,     // ISO da última atualização (km ou data-only)
  leituras: []    // log: {id, tipo, data, parcial?, delta?, totalApos?, parcialAnterior?, obs?}
}
```

### Motor de estimativas (fundação para componentes)
- `_bikeOdoPontosReais()` — pontos (data, total) das leituras reais em ordem cronológica
- `bikeEstimarKmNaData(dataISO)` — retorna `{km, estimado}`: interpola linearmente entre leituras reais; após a última, projeta pela média km/dia
- `_bikeOdoMediaKmDia()` — média km/dia dos últimos ~30 dias de leituras reais
- Estimativas são recalculáveis: quando uma leitura real posterior chega, eventos estimados no intervalo devem ser reinterpolados

### Três modos de km para eventos (conceito acordado)
1. **Km exata:** usuário informa o parcial do GPS no momento do evento → total = base + parcial (checkpoint real)
2. **Km estipulada:** sem leitura no momento → sistema estima pela data (interpolação/projeção), marca como estimada, corrige retroativamente quando leitura real chegar
3. Leituras oficiais são imutáveis; estimativas sempre revisáveis

### Marcação NOVO vs USADO (componentes e bike)
- Componente NOVO (ex: cassete, correntes): km exibida é exata
- Componente USADO (ex: pneus, coroa, movimento central, caixa de direção): km exibida com prefixo `>` (piso — desgaste real maior, valor desconhecido; rastreia só o uso do usuário)
- Cálculo de vida útil de componentes usados: projeção exibida invertida (ex: "restam <880km") — troca pode chegar antes
- Estado atual dos componentes: caixa de direção prestes a ser substituída; movimento central provavelmente original; cassete e corrente novos; pneus/freios/coroa usados

### ROADMAP — Etapas pendentes
- **Etapa 2 — Correntes:** 2 correntes em rotação (método de imersão em cera — uma em uso, outra pronta), km individual por corrente, km desde a última limpeza, folga medida com Park Tool CC4.2 — **medição QUANTIZADA em degraus** (0, 0.25, 0.50, 0.75...): a leitura "0.25" significa desgaste entre 0.25 e 0.50; o dado valioso é a TRANSIÇÃO de degrau (data+km em que o medidor mudou); leituras repetidas no mesmo degrau estreitam o intervalo. Vida útil em duas ramificações: cálculo "frio" (km esperada pelo usuário → km restantes + projeção temporal) e cálculo DINÂMICO (curva real de transições → km estimada até a folga máxima definida pelo usuário). Limpeza da corrente é o evento âncora do odômetro (reset do parcial do GPS).
- **Etapa 3 — Freios:** medição CONTÍNUA em mm com paquímetro (décimos, sem degraus) — discos e pastilhas; histórico de medições; usuário define espessura mínima; projeção por regressão direta + cálculo frio opcional. Desgaste NÃO é proporcional à km (depende de frenagem/relevo).
- **Etapa 4 — Cassete, coroa, rolamentos, pneus e selante:** cassete/coroa: apenas km acumulada + cálculo frio (sem manutenção periódica). Rolamentos (caixa de direção, movimento central, cubos): km total, vida útil estimada opcional (itens de vida longa). Pneus: vida útil por km + controle de reaplicação de selante (tubeless).

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
- **ATENÇÃO (aprendizado da Sessão 7):** a geração/reorganização de plano pela IA pode produzir sequências fora da rotação (ex: Semana 8 gerada como A,C,D,C,A sem B) e inconsistências entre `semanas[].serie` e `diasExpandidos[].serie`. Ao corrigir a série de um dia no JSON, apagar a expansão correspondente para o app regenerar com a série certa.

### Aba Histórico (unificada)
- Filtros: **CICLO ATUAL** · **TODOS** · botão por ciclo arquivado
- Ciclos arquivados: card de resumo (período, semanas, treinos, rides) + botão "⬡ ANALISAR COM IA"
- Botões de remover entry apenas no modo "CICLO ATUAL"
- `var _historyViewMode = 'atual'` (variável global)
- **Histórico normalizado (Sessão 7):** ao registrar treino, status `undone` é normalizado para `skipped` — no histórico só existem `done` e `skipped` (na Agenda os três estados continuam: feito / não feito / pulado, com semânticas distintas)

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

### Chat inline — ação `adicionar` (atualizado na Sessão 7)
- Formato: `{"tipo":"adicionar","nome":"novo exercício","sets":"3x10","weight":"15kg","posicao":3,"isCore":false}`
- `posicao` é base 1; `"isCore":true` para exercícios de Core/abdômen/lombar — a IA define explicitamente
- Guard programático: rejeita apenas se o exercício **já está no treino do dia atual** (NÃO verifica a biblioteca — exercícios da biblioteca podem ser adicionados ao treino normalmente)
- `isCore` é propagado: JSON da IA → `diasExpandidos` → histórico → `adicionarNovosExerciciosNaBiblioteca` (destino correto: série Core vs série do treino)

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

### Pipeline de campos (Sessão 7)
- `normalizarDiaExpandido` PRESERVA o campo `musculo` (antes era descartado — causa raiz de Core parar na série errada)
- `finishSerieFromAgenda` propaga `musculo` e `isCore` para o histórico
- `adicionarNovosExerciciosNaBiblioteca` detecta Core por: `ex.isCore` OU regex no `musculo` OU regex no nome (expandido: prancha, plank, crunch, sit-up, dead bug, bird dog, abdominal, elevação de perna, elevação de joelh, roman chair, captain chair, knee raise, ab wheel, hollow body, l-sit, dragon flag, pallof, mountain climb)

### System prompt do chat inline (Sessão 7)
- Inclui SEMPRE a biblioteca completa (todas as séries) com a regra: se o usuário pedir exercício que NÃO está na biblioteca, sugerir apenas exercícios ausentes da lista
- Mantém a liberdade: "Você está livre para sugerir qualquer exercício, inclusive novos" — a restrição é EXCEÇÃO condicionada ao pedido explícito (a instrução antiga "Use seu conhecimento livremente" existia para permitir exercícios novos fora da biblioteca; foi reformulada, não removida)
- Biblioteca da série do dia continua condicional via `_msgNeedsBiblioteca(msg)`

---

## SISTEMA DE DUPLICATAS (reescrito na Sessão 7)

- `verificarDuplicatasHistoricoCompleto` faz DUAS verificações numa chamada à IA:
  1. Biblioteca vs biblioteca — pares com nomes diferentes que são o mesmo movimento
  2. Histórico (incluindo ciclos arquivados) vs biblioteca — nomes do histórico sem correspondência exata
- `buildDuplicatasPrompt(bibliotecaNames, historicoNomes)` — retorna JSON `{"pares":[{treino, biblioteca, serie, motivo, nomeOficial, tipo}]}`; `tipo`: "biblioteca" (ambos da biblioteca) ou "historico"
- Modal com paginação: seleções e nomes editados PRESERVADOS ao trocar de página (`_selecionado`/`_nomeEditado`/`_contexto` no objeto do par); "APLICAR SELECIONADOS" coleta de TODAS as páginas
- Labels do modal: "BIBLIOTECA" ou "HISTÓRICO" conforme `par.tipo`
- `aplicarUnificacao`:
  - Renomeia no histórico atual E nos `ciclos[].history` arquivados (ambos os nomes do par); guard contra `ex.name` null
  - Na biblioteca: renomeia ambos os nomes → deduplica cada série (mantém primeira ocorrência)
  - Se `par.biblioteca` NÃO existe na biblioteca (exercício só do histórico, ex: Pullover com Haltere): ADICIONA o exercício à biblioteca — série inferida do próprio histórico (busca em qual `serieLabel` o exercício foi registrado)
- Todos os caminhos têm feedback: toast "Nenhuma duplicata encontrada ✓", "Nenhuma duplicata selecionada.", erro de parse visível (catch não é mais silencioso)
- Nomenclatura: nome como um personal trainer brasileiro experiente escolheria (PT ou EN conforme uso no Brasil)

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

### Abas
AGENDA · BIBLIOTECA · HISTÓRICO · PERFIL · PLANO · 🚲 BIKE (nova na Sessão 7)

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
- **REGRA PERMANENTE (Sessão 7): TODA data a inserir no sistema deve ter o botão 📅 de calendário.** Helpers genéricos: `datepickerInlineHTML(key, targetInputId)` gera o picker inline; `toggleDatepickerInline(key, wrapId)` abre/fecha; `_dpSelect` tem ponte via `data-target` no hidden `mf-{key}` — copia a data escolhida para o input visível. O usuário nunca deve precisar pedir isso de novo.

### Modais
- `confirmarAcao(mensagem, callback)` — modal de confirmação simples, MAS fixa o botão como "APAGAR" (foi feita para apagar chats). NÃO reutilizar para outros fluxos — construir modal próprio com `modal-title`/`modal-body` e botões no body (padrão usado em D→BIKE e odômetro)
- `closeModal()` restaura `modal-confirm`: display e texto "CONFIRMAR" (fix da Sessão 7 — o label "APAGAR" vazava para modais seguintes)

### Mobile
- **NÃO usar scroll horizontal** — apenas scroll vertical
- Emulação: 411×715px, DPR 3.5

---

## SINCRONIZAÇÃO SUPABASE

- `saveState(fromCloud?)` — salva localmente + agenda sync Supabase; `state._updatedAt` só avança quando `fromCloud` é false
- `supabaseLoad()` — APENAS BAIXA, NUNCA FAZ UPLOAD (regra da Sessão 7). Baixa quando: nuvem mais recente OU `updated_at` da nuvem é null (não comparável — preferir nuvem). Local mais novo ou igual → não faz nada; upload só acontece quando o usuário modifica dados (via `scheduleSyncToSupabase`)
- `supabaseSave()` — usa `state._updatedAt` como `updated_at` no upsert (NUNCA `new Date()` — os timestamps dos dois lados precisam representar a mesma coisa: quando os dados foram modificados, não quando foram enviados)
- Proteção: `_supabaseLoadComplete` flag evita sobrescrita prematura
- `saveState(false, false)` — salva sem capturar undo e sem sync (uso interno)
- **Limitação conhecida:** o sync só acontece na inicialização — não há sync em tempo real nem em `visibilitychange`. Dispositivo aberto não vê mudanças de outro dispositivo até recarregar.
- **Histórico do incidente (Sessão 7):** desktop sobrescreveu dados mais novos do celular. Causas encadeadas: (1) `supabaseLoad` fazia upload quando o local parecia mais novo; (2) `updated_at` da nuvem estava NULL (→ cloudUpdatedAt=0, local sempre "mais novo"); (3) `supabaseSave` gravava hora do upload, não do dado. Todas corrigidas. Dados perdidos não foram recuperáveis.

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
12. **(Sessão 7)** Sempre solicitar o JSON/arquivos MAIS RECENTES antes de editar — nunca trabalhar em dados desatualizados
13. **(Sessão 7)** NUNCA assumir contexto de teste (se o usuário limpou conversa, recarregou o app etc.) — perguntar quando relevante. O usuário SEMPRE testa na versão mais recente.
14. **(Sessão 7)** Toda data a inserir no sistema deve ter botão 📅 (datepicker `date-br` inline)
15. **(Sessão 7)** Mensagens/toasts devem representar fielmente o que foi feito (ex: contador de itens apagados deve incluir tudo que foi apagado)
16. **(Sessão 7)** O ambiente de arquivos do Claude é temporário — working copies se perdem entre interações distantes. Ao retomar, verificar versão do arquivo em `/home/claude` e pedir reenvio se estiver desatualizado.
17. **(Sessão 7)** Ler e entender o código completo antes de propor soluções — não adivinhar. Explicações de bugs devem ser completas (se a explicação não fecha logicamente, investigar mais).
18. Distinção `date` vs `registeredAt` no histórico (gym E bike): `date` = quando o treino ocorreu; `registeredAt` = quando foi registrado. Manter sempre separados.

---

## BUGS EM ABERTO

1. **Dropdown "+ SÉRIE ▾" na Biblioteca:** não abre ao clicar no Claude.ai. Funciona via console. `position:fixed` com `getBoundingClientRect()` implementado.
2. **Cor chuva/imprevisto em dias passados:** `bikeStatus='chuva'/'imprevisto'` — cor azul/laranja não testada em produção.
3. **`anteciparABCParaDiaBike` — semana extra:** lógica implementada mas não testada em produção.
4. **(Sessão 7)** Chat inline às vezes retorna ```json``` vazio em pedidos de modificação — comportamento da IA, sem correção no código; limpar a conversa e tentar de novo resolve.
5. **(Sessão 7)** Geração de plano pela IA pode violar a rotação de séries (ex: Semana 8 gerada A,C,D,C,A) e criar inconsistência `semanas[].serie` vs `diasExpandidos[].serie` — corrigido pontualmente via JSON; validação automática da rotação na geração ainda não implementada.

---

## CORREÇÕES DE DADOS VIA JSON (Sessão 7)

Registro das intervenções manuais no `treino_backup.json` (para rastreabilidade):
- `registeredAt` do treino refeito (série B de 05/06) corrigido para 05/06 22:30 BRT
- Todos os `undone` do histórico normalizados para `skipped`
- Core movidos para a série Core (`score`) com `isCore:true`: "L-Sit na Parede" (estava em B), "Elevação de Joelhos no Roman Chair" (estava em D)
- "Rotação de Tronco com Anilha" removida da série A (usuário não fará mais)
- Semana 8: Terça 21/07 corrigida de C para B; expansões `sem8_Terça` (era C) e `sem8_Segunda` (era D, devia ser A) apagadas para regeneração
- `registeredAt` do último treino C (16/07) corrigido para 16/07 21:20 BRT
- Pedal de Sábado 18/07: `date` corrigido de Domingo (momento do registro) para Sábado; `registeredAt` preservado
- Ride 17/07: `distancia` corrigida de "~15km" para "~15" (unidade duplicava na exibição)

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

### Grupo 23: Sessão 7 — Sync, Duplicatas, Core, D→Bike, Odômetro (v0.9.0.03 → v0.9.0.37)

**Incidente de perda de dados:** desktop com state desatualizado sobrescreveu a versão mais nova do celular na nuvem; dados do ciclo perdido (incluindo chats inline) irrecuperáveis. Motivou a cadeia de correções de sync abaixo.

**v0.9.0.03 / v374:** `supabaseLoad` NUNCA faz upload — removido o branch "local mais novo → upload". Upload só quando o usuário modifica dados.

**v0.9.0.04 / v375:** Botões "Limpar Chat" também apagam `chatInline` de todos os `state.ciclos[]` arquivados (ciclos encerrados são integralmente passados).

**v0.9.0.05 / v376:** `importData` zera o cache em memória `chatInlineHistory` (chats do JSON importado passam a valer); normalização `undone`→`skipped` ao registrar treino no histórico (`finishSerieFromAgenda`) — no histórico, "não feito" e "pulado" são a mesma coisa.

**v0.9.0.06 / v377:** Contador `limpos` do "Limpar Chat" inclui os dias dos ciclos arquivados; early return removido (ciclo atual sem chatInline não impedia mais a limpeza dos arquivados).

**v0.9.0.07 / v378:** `switchTab` salva os drafts dos chats inline (`_chatInlineDrafts`) antes de sair da aba Agenda — texto digitado não some mais ao trocar de aba.

**v0.9.0.08 / v379:** `normalizarDiaExpandido` preserva `musculo`; `finishSerieFromAgenda` propaga `musculo` ao histórico — Core detectável na adição à biblioteca.

**v0.9.0.09–10 / v380–381:** Biblioteca Core incluída no system prompt do chat inline com instrução imperativa (IA não deve sugerir como "novo" o que já existe).

**v0.9.0.11:** Guard em `aplicarModificacoesInline.adicionar` contra duplicata na biblioteca (CORRIGIDO depois na .28 — verificação estava no lugar errado).

**v0.9.0.12–13 / v382–383:** Biblioteca COMPLETA (todas as séries) no systemInline com regra de verificação; instrução "livre para sugerir qualquer exercício" restaurada com exceção condicional (o propósito original — permitir exercícios novos — era do usuário e não podia ser removido).

**v0.9.0.14 / v384:** Campo `"isCore"` no formato `adicionar`; propagado JSON→diasExpandidos→histórico→biblioteca. Detecção de Core passa a depender da IA declarar, não de regex frágil. (Testado OK.)

**v0.9.0.15–16 / v385–386:** `verificarDuplicatasHistoricoCompleto` reescrita: biblioteca vs biblioteca + histórico (incluindo ciclos arquivados) vs biblioteca, numa única chamada.

**v0.9.0.17–18 / v387–388:** Paginação do modal de duplicatas preserva checkboxes e nomes editados (`_selecionado`/`_nomeEditado` no par); "APLICAR SELECIONADOS" coleta seleções de TODAS as páginas (salvando a página atual antes).

**v0.9.0.19 / v389:** Toast "Verificando duplicatas na Biblioteca..."; labels do modal conforme `par.tipo` (BIBLIOTECA/HISTÓRICO); deduplicação da biblioteca após renomear (entradas de mesmo nome colapsadas).

**v0.9.0.20–21 / v390–391:** Renomeação cobre `ciclos[].history` arquivados e ambos os nomes do par; guard `ex && ex.name` (crash `Cannot read properties of null`).

**v0.9.0.22 / v392:** Regex de Core expandido: roman chair, captain's chair, knee raise, ab wheel, hollow body, l-sit, dragon flag, pallof, mountain climb, elevação de joelh.

**v0.9.0.23 / v393:** `aplicarUnificacao`: quando `par.biblioteca` não existe na biblioteca, ADICIONA o exercício (fim do loop infinito do "Pullover com Haltere" reaparecendo).

**v0.9.0.24 / v394:** Toast ao fechar modal sem seleção; catch de parse com erro visível.

**v0.9.0.25 / v395:** Série do exercício histórico-only inferida do próprio histórico (busca `serieLabel` onde foi registrado) — não mais do `par.serie` da IA.

**v0.9.0.26 / v396:** RAIZ DO BUG DE SYNC ENCONTRADA: `updated_at` da nuvem estava NULL (→ cloudUpdatedAt=0 → local sempre "mais novo" → nunca baixava). Fixes: `supabaseSave` usa `state._updatedAt` como `updated_at`; `supabaseLoad` baixa quando `updated_at` é null e há state na nuvem.

**v0.9.0.27 / v397:** Modelo `claude-sonnet-4-20250514` (404, descontinuado) → `claude-sonnet-4-5` (11 ocorrências).

**v0.9.0.28 / v398:** Guard do `adicionar` corrigido: verifica o TREINO DO DIA atual, não a biblioteca (adicionar exercício da biblioteca ao treino é legítimo; o toast "já existe na Biblioteca" bloqueava indevidamente — era o "modal" que confundiu a IA inline).

**v0.9.0.29 / v399:** D→BIKE com modal de escolha SUBSTITUIR vs RELOCAR; flag `relocado` em `diasBike`; `desfazerSubstitutoD` respeita o modo; `closeModal` restaura display do botão confirm; system prompt atualizado.

**v0.9.0.30 / v400:** `registrarBikeHistorico`: `date` = dia real da agenda (`_calcDataDia`), `registeredAt` = momento do registro.

**v0.9.0.31 / v401:** `updateBikeField` sanitiza unidades (km/m/kcal) — fim do "~15kmkm".

**v0.9.0.32 / v402:** ETAPA 1 DA ABA BIKE: aba 🚲 BIKE, setup inicial, painel odômetro total/parcial, fluxo de atualização com confirmação e cálculo exibido, tratamento delta<0 (3 opções), RESET, BIKE PARADA, EDITAR TOTAL, histórico de leituras, motor de estimativas (`bikeEstimarKmNaData`, `_bikeOdoMediaKmDia`, `_bikeOdoPontosReais`).

**v0.9.0.33 / v403:** Distinção NOVA/USADA no setup; total com prefixo ">" e badge "(BIKE USADA)"; banner de migração para config pré-existente.

**v0.9.0.34 / v404:** Campo nome/modelo da bike (setup + título editável no painel); porta aberta para múltiplas bikes.

**v0.9.0.35 / v405:** Botão 📅 na data da compra; helpers genéricos `datepickerInlineHTML`/`toggleDatepickerInline`; ponte `data-target` em `_dpSelect`. REGRA PERMANENTE: todas as datas com botão de calendário.

**v0.9.0.36 / v406:** Campo de observação opcional em ATUALIZAR PARCIAL e RESET (todos os caminhos); observações destacadas no histórico de leituras.

**v0.9.0.37 / v407:** EDITAR TOTAL em modal único com label correto ("APLICAR NOVO TOTAL" — antes herdava "APAGAR" da `confirmarAcao`) + campo de observação + texto explicando o caso de uso (GPS indisponível); `closeModal` restaura o texto do botão para "CONFIRMAR" (fix do vazamento do label).

---

## PRÓXIMOS PASSOS (prioridade)

1. **Aba Bike — Etapa 2: Correntes** (2 correntes em rotação com cera; folga quantizada CC4.2 por transições de degrau; km individual; km desde última limpeza; vida útil fria + dinâmica) — ver seção ABA BIKE / ODÔMETRO → ROADMAP
2. **Aba Bike — Etapa 3: Freios** (medição contínua mm; regressão)
3. **Aba Bike — Etapa 4: Cassete, coroa, rolamentos, pneus, selante**
4. Bugs em aberto (seção BUGS EM ABERTO)

---

## ARQUIVOS DE TRABALHO

- `index.html` — versão atual (v0.9.0.37)
- `sw.js` — `treino-v407`
- `CONTEXTO_PROJETO_7.md` — este arquivo

---

## REGRA PARA NOVA SESSÃO

Ao iniciar nova sessão, o usuário deve anexar:
1. `index.html` (versão mais recente)
2. `sw.js` (versão mais recente)
3. `CONTEXTO_PROJETO_7.md`
