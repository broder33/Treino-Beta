# CONTEXTO DO PROJETO — App de Treino Personalizado com IA

> # ⛔ LEIA ISTO ANTES DE QUALQUER SEÇÃO
>
> ## O app está NO MEIO de uma reescrita de arquitetura. Documento cumulativo v11 — app v0.9.1.73 / SW treino-v540.
>
> **O modelo de CICLOS foi eliminado.** Existe uma migração irreversível (`state._migracaoContinuoV1`)
> que funde os ciclos arquivados num histórico único. **O app se comporta de duas formas
> completamente diferentes conforme essa flag** — essa é a chave para ler qualquer coisa aqui:
>
> | | Antes da migração | Depois da migração |
> |---|---|---|
> | Histórico | `state.history` + `state.ciclos[]` | `state.history` único; `state.ciclos` **deletado** |
> | Agenda | semanas do plano com datas | feed contínuo (card PRÓXIMO TREINO + registros) |
> | Próximo treino | dia do plano | rotação derivada do histórico |
> | Registrar treino | card de dia do plano | `abrirRegistroTreino()` pelo card |
> | Registrar pedal | dia do plano com bike prescrita | `abrirRegistroPedal()`, data própria |
> | Encerrar ciclo | disponível | bloqueado (recriaria `state.ciclos`) |
>
> **~1.400 linhas deste documento descrevem o modelo de CICLOS**, que ainda é o comportamento
> real para quem não migrou. Seguem aqui por isso, marcadas com
> `⚠️ MODELO DE CICLOS — EM ELIMINAÇÃO`. **Não são o destino.**
>
> ### O que a próxima sessão precisa saber, em ordem
>
> 1. Leia **"SESSÃO 14"** (fim do documento). É o estado atual. A Sessão 13 descreve a
>    migração; a 14 descreve o app que existe hoje.
> 2. Leia **"PENDÊNCIAS — FIM DA SESSÃO 14"**.
> 3. **A suíte de 439 testes NÃO EXISTE mais** — vivia em `/home/claude` e o ambiente é
>    recriado a cada sessão. A seção "SUÍTE DE TESTES" descreve como reconstruí-la. Na Sessão 14
>    o método foi extrair funções do `index.html` com Python e exercitá-las em Node/jsdom, caso
>    a caso; isso pegou vários bugs e está descrito em "MÉTODO DE TESTE (Sessão 14)".
> 4. **A aba PLANO e a aba HISTÓRICO não existem mais** depois da migração, e a Etapa 5 foi
>    concluída no que importa: o plano de N dias não governa mais nada.
>
> ### Lições caras desta sessão (não repetir)
>
> - **Uma decisão do usuário não é um recurso opcional.** A eliminação dos ciclos ficou atrás de
>   um item de menu; o usuário pediu a mesma coisa TRÊS vezes porque, sem aquele clique, o app
>   continuava idêntico. Se foi decidido, tem que acontecer sem ele procurar.
> - **Mudar o formato do dado sem mudar as telas que o leem** produziu três bugs seguidos
>   (filtros de ciclo vazios, rótulo `_ciclo` sobrevivendo, registro impossível após migrar).
>   Ao mexer no dado, listar TODAS as telas que o consomem antes de entregar.
> - **Não inventar linguagem visual.** O primeiro feed da agenda usou caixas genéricas e ficou
>   pior que o que substituía. O app tem componentes (`.agenda-dia`, `.agenda-dia-label`,
>   `.agenda-dia-serie`, badges) — reusá-los.
> - **O contexto só é gerado quando o usuário pede**, e depois das alterações prontas. Gerar no
>   meio da conversa desperdiça a janela.

## REGRAS DO CONTEXTO

> Estas regras garantem que o documento seja sempre consistente entre sessões.

1. **Acumulativo:** o documento nunca perde informações — cada nova versão acrescenta ao que já existe.
2. **Formatação consistente:** manter a mesma estrutura de seções, cabeçalhos e estilo entre versões.
3. **Histórico completo:** todas as versões de todas as sessões devem estar registradas, agrupadas por tema quando fizer sentido.
4. **Versão atual:** sempre atualizar a seção "VERSÃO ATUAL" ao encerrar uma sessão.
5. **Nada pode faltar:** ao encerrar uma sessão, comparar com o documento anterior e garantir que nenhuma seção, regra ou detalhe foi omitido.
6. **Regra de novo chat:** quando o chat ficar grande demais, atualizar este arquivo e iniciar novo chat com os 3 arquivos (index.html, sw.js, contexto). Esta regra deve constar no contexto.
7. **Quando gerar o contexto:** SOMENTE quando o usuário pedir, e SOMENTE depois de as alterações estarem prontas. Gerar no meio da conversa desperdiça a janela e produz um documento que já nasce desatualizado.
8. **Marcar o que foi superado:** ao substituir um modelo, marcar TODAS as seções afetadas (não só uma) com aviso visível. Preservar histórico não é apresentar arquitetura obsoleta como verdade corrente — um leitor novo pesa pelo volume do texto.

---

## STACK E INFRAESTRUTURA

- **Arquivo:** Single HTML file (`index.html`) + `sw.js` (Service Worker PWA)
- **Hospedagem:** GitHub Pages — `https://broder33.github.io/Treino-Beta/`
- **Auth/Sync:** Supabase — `https://exhajkhacgnsrnnmeism.supabase.co`, tabela `user_data`, RLS configurado
- **IA:** Anthropic API — `claude-sonnet-4-5` (corrigido na Sessão 7; o nome antigo `claude-sonnet-4-20250514` foi descontinuado e retornava 404)
- **PWA:** Android (instalado), Chrome Desktop, Edge

---

## VERSÃO ATUAL

- **App:** v0.9.1.73
- **Service Worker:** `treino-v540`
- **Versão publicada online (GitHub Pages):** sempre sincronizada com o último HTML funcional
- **Arquivo de contexto:** `CONTEXTO_PROJETO_11.md`
- **Suíte de testes automatizados:** 439 testes em jsdom (ver "SUÍTE DE TESTES")

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

> ⚠️ **MODELO DE CICLOS — EM ELIMINAÇÃO.** Descreve o app como está HOJE no código. Ver
> "ARQUITETURA NOVA — MODELO CONTÍNUO" no fim do documento.
> **Nesta mudança:** state.plano, state.ciclos, diasStatus, diasExpandidos, diasBike, dataInicio e planoRascunho desaparecem.

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

// ─── acrescentados na Sessão 12 ───
state._syncBase               // âncora: updated_at que a NUVEM tinha na última leitura/escrita
                              //   bem-sucedida DESTE aparelho. Metadado de aparelho: nunca sobe.
state._syncLog[]              // diário de sincronização (12 últimos eventos) — UI_FIELD
```

**Campos de RIDE (`bikeHistory[]` e `plano.diasBike{}`)** — acrescentado `bpmMedio` na Sessão 12:
`distancia`, `tempoMov`, `tempoTotal`, `velocidade`, `elevacao`, `kcal`, **`bpmMedio`**, `percurso`,
`timingReal`, `foco`, `dayKey`, `semana`, `dia`, `date`.

---

## MOTOR DE RELOCAMENTO (fila estática)

> ⚠️ **MODELO DE CICLOS — EM ELIMINAÇÃO.** Descreve o app como está HOJE no código. Ver
> "ARQUITETURA NOVA — MODELO CONTÍNUO" no fim do documento.
> **Nesta mudança:** a rotação SOBREVIVE, mas passa a gerar UM treino por vez, com a posição derivada do histórico em vez de `posicaoFila` guardada.

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

> ⚠️ **MODELO DE CICLOS — EM ELIMINAÇÃO.** Descreve o app como está HOJE no código. Ver
> "ARQUITETURA NOVA — MODELO CONTÍNUO" no fim do documento.
> **Nesta mudança:** a prescrição de bike por dia do plano MORRE; o pedal vira registro autônomo com data própria.

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

> ⚠️ **MODELO DE CICLOS — EM ELIMINAÇÃO.** Descreve o app como está HOJE no código. Ver
> "ARQUITETURA NOVA — MODELO CONTÍNUO" no fim do documento.
> **Nesta mudança:** esta seção inteira MORRE; histórico passa a ser único e contínuo.

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
> ⚠️ **ELIMINADO NA SESSÃO 14** — ver "O QUE FOI ELIMINADO NESTA SESSÃO" no fim do documento.


> ⚠️ **MODELO DE CICLOS — EM ELIMINAÇÃO.** Descreve o app como está HOJE no código. Ver
> "ARQUITETURA NOVA — MODELO CONTÍNUO" no fim do documento.
> **Nesta mudança:** muda de forma: deixa de modificar um plano de N semanas e passa a gerar/regenerar um único próximo treino.

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
> ⚠️ **ELIMINADO NA SESSÃO 14** — ver "O QUE FOI ELIMINADO NESTA SESSÃO" no fim do documento.


> ⚠️ **MODELO DE CICLOS — EM ELIMINAÇÃO.** Descreve o app como está HOJE no código. Ver
> "ARQUITETURA NOVA — MODELO CONTÍNUO" no fim do documento.
> **Nesta mudança:** MORRE: não há mais geração de plano de ciclo.

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

> ⚠️ **MODELO DE CICLOS — EM ELIMINAÇÃO.** Descreve o app como está HOJE no código. Ver
> "ARQUITETURA NOVA — MODELO CONTÍNUO" no fim do documento.
> **Nesta mudança:** sobrevive em forma modificada: é o que gera o conteúdo do PRÓXIMO TREINO.

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

> ⚠️ **SEÇÃO SUPERADA PELA SESSÃO 12.** O modelo abaixo (comparação por carimbo simples, upsert
> cego, `_supabaseLoadComplete` como única guarda) foi substituído por âncora `_syncBase` +
> travamento otimista + detecção de conflito. Mantida aqui por ser o registro histórico do que
> existia. **Para o comportamento atual, ver "SESSÃO 12 — SINCRONIZAÇÃO".**

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

---
---

# ATUALIZAÇÃO — SESSÕES 8, 9 e 10 (v0.9.0.38 → v0.9.1.07)

> **Nota de leitura:** tudo acima é preservado integralmente (documento cumulativo).
> As seções "PRÓXIMOS PASSOS", "ARQUIVOS DE TRABALHO" e "VERSÃO ATUAL" acima refletem
> o estado do fim da Sessão 7 — as versões correspondentes **desta** seção prevalecem.

---

## VERSÃO ATUAL (fim da Sessão 10)

- **App:** v0.9.1.07
- **Service Worker:** `treino-v477`
- **Hospedagem:** GitHub Pages — `https://broder33.github.io/Treino-Beta/`

---

## RESUMO DA SESSÃO 9 (v0.9.0.38 → v0.9.0.93)

Sessão longa, quase inteiramente dedicada à expansão da Aba Bike. Principais entregas:

### Cubos (v0.9.0.67–68)
- `cubo` dentro de cada posição do jogo de rodas: `{dataInstalacao, kmInstalacaoTotal, kmAcumulado, kmInicioSessaoAtual, manutencoes[]}`
- Registro de MANUTENÇÃO com data e exclusão com confirmação
- `cuboIntervaloManutencaoKm` global editável (padrão 5000km)

### Selante por tempo (v0.9.0.69)
- `roda.pneu.selante = {aplicacoes[]}` por posição
- Previsão baseada em **TEMPO** (dias), não km — `selanteIntervaloDias` (padrão 60 dias)
- Helper `_bikeDiasLinhaHTML` para linhas de vida útil por dias

### Garrafa de selante (v0.9.0.70–71)
- `selante.garrafaAtual = {pesoCheiaNova, volumeMl, dataInicio}` — sem necessidade de "peso vazio"
- Consumo por perda de peso: `gramas perdidas ≈ ml consumidos` (densidade ~1g/ml)
- `_bikeSelanteRestanteMl()`, `_bikeSelanteTaxaConsumoPorDia()`, `_bikeSelanteProximaCompra()`
- TROCAR GARRAFA arquiva em `garrafasAnteriores`

### `bikeEstimarKmNaData` corrigido (v0.9.0.78)
- Bug: datas anteriores à primeira leitura real eram travadas no valor dessa leitura
- Fix: `dataCompra` (0km) entra como ponto conhecido implícito; interpolação entre compra e primeira leitura
- **Não afeta** `_bikeOdoMediaKmDia`/`_bikeOdoMediaKmDiaGeral` (usam `_bikeOdoPontosReais()` cru)

### Múltiplos jogos de rodas (v0.9.0.79) — mudança arquitetural
- `state.bikeOdo.jogosDeRodas[]` substitui a estrutura fixa `rodas`
- Cada jogo: `{id, nome, status:'ativo'|'espera', dianteira:{...}, traseira:{...}}`
- **Km por sessão**: componentes que viajam com a roda congelam quando o jogo vai para `espera` e retomam ao ativar
- `_bikeJogoSelecionado()`, `_bikeRodaAtual(pos)`, `_bikeCompKm(comp, ativo)`, `_bikeCompCongelar/Retomar`
- `_jogoRodasSelecionado` é estado de UI (o jogo visualizado ≠ jogo ativo)
- Migração automática da estrutura antiga

### PowerLock (v0.9.0.80–82)
- `c.powerlockContador` por corrente; `powerlockLimiteMontagens` global (padrão 7, editável)
- Incrementa em: nova corrente ativada, ativação de corrente, imersão
- `_bikeCorrentePowerlockRestante(c)` = km restante do ciclo atual + `(restantes-1) × kmPorCiclo`
- O km restante do ciclo atual vem de `_bikeCorrenteProximaImersao.kmRestante` (não assume ciclo cheio)

### Sub-abas da Bike (v0.9.0.81–82)
- `DRIVETRAIN | RODAS/PNEUS | FREIOS | ROLAMENTOS`
- Odômetro e histórico de leituras ficam **sempre visíveis**, fora das sub-abas
- Estado persistido em `state.bikeOdo._subTabBike`

### Freios e disco (v0.9.0.83–85)
- `freios: {dianteiro:{pastilha:{...}}, traseiro:{pastilha:{...}}}` — pastilha é presa ao quadro
- **DINÂMICO**: taxa de desgaste (mm/km) das duas últimas medições consecutivas, projetada até a espessura mínima
- Disco migrado para dentro do jogo de rodas (viaja com a roda)

### Rolamentos (v0.9.0.86–89)
- `rolamentos: {'headset-inferior', 'headset-superior', 'bb'}` — presos ao quadro, sem sessão
- Cada um: `{nome, dataInstalacao, kmInstalacaoTotal, kmEsperadoTroca, intervaloManutencaoKm, manutencoes[], anteriores[]}`
- Headset dividido em superior/inferior por migração; ordem anatômica (superior acima)

### Datas em todos os registros (v0.9.0.90)
- Auditoria completa: 8 funções não tinham campo de data. Todas corrigidas.
- TROCAR usa `bikeEstimarKmNaData(dataISO)` para ancorar a peça nova

### Consistência de km (v0.9.0.91–92)
- Classe de bug: cálculos usavam km bruto enquanto a exibição usava `_bikeKmMelhorEstimativa` → discrepância aparecia como "já passou" logo após o primeiro registro
- Corrigido em `_bikeRolamentoFixo`, `_bikeRolamentoKmDesdeManutencao`, `_bikeRodaCuboKmDesdeManutencao` e no **registro** de manutenções
- Migrações `_migracaoManutencaoEstimativaV1` e `_migracaoCuboManutencaoEstimativaV1`
- Exclusão de manutenções de rolamento adicionada

---

## SESSÃO 10 (v0.9.0.94 → v0.9.1.07) — DETALHADA

### v0.9.0.94 / v464 — Km e histórico das trocas
- `kmRodados` arquivado nas trocas (rolamento, freio, pneu, disco) passou a usar o km estimado, não o bruto
- **Histórico da peça é preservado no arquivamento**: manutenções (rolamento) e medições (freio, disco) vão junto para `anteriores[]` — antes se perdiam na troca
- Linha de "TROCAS ANTERIORES" do rolamento virou clicável ("ver") → modal com datas, km e histórico de manutenções da peça arquivada
- Migração `_migracaoAnterioresEstimativaV1`

### v0.9.0.95 / v465 — Nome nos modais de cadastro
- **Lição importante:** o campo de nome existia apenas no card, não no modal de CADASTRO/instalação. Corrigido em rolamento e pneu.
- Regra derivada: ao adicionar nome editável a um componente, verificar **os dois lugares** (card e modal de cadastro).

### v0.9.0.96 / v466 — Cassete
- `jogo.traseira.cassete` — fica no freehub, portanto **acompanha o jogo de rodas** (com sessão), mas é **exibido na sub-aba DRIVETRAIN**
- Nome editável, KM INDIVIDUAL, FIXO (expectativa editável, padrão 15000km), TROCAR com nome do novo + histórico clicável

### v0.9.0.97 / v467 — Texto dos históricos padronizado
Formato antigo (confuso): `25/07/2026 · Nome · rodou 3114.2km — obs`
Formato atual, aplicado nos 5 lugares (rolamento, pneu, disco, freio, cassete):

```
REMOVIDO em 25/07/2026 — **Nome da peça**, rodou 3114.2km · Motivo: <observação>
```

### v0.9.0.98–99 (tentativas descartadas)
Duas iterações intermediárias tentaram resolver a ambiguidade da âncora com (a) um checkbox "original de fábrica" e (b) três opções de origem. **Ambas foram rejeitadas por serem confusas** e substituídas pelo modelo definitivo abaixo. Registradas aqui só para não serem reintroduzidas.

### v0.9.1.00 / v470 — ⭐ MODELO DEFINITIVO DE KM (regra central)

**Régua única: km COMBINADO.**

```javascript
_bikeCombinadoAtual() = state.bikeOdo.total + (_bikeUsoAnteriorEstimado() || 0)
```
É exatamente o número exibido em ODÔMETRO TOTAL (ex.: ≈3114.2km = 114.2 rastreados + 3000 estimados do dono anterior).

**Duas categorias, e apenas duas** (definição do usuário, textual):
> 1. Componente original da bicicleta: km do componente = km da bicicleta
> 2. Componente trocado: km do componente = km da bicicleta na data da troca

Implementação:
- **Original** → `kmInstalacaoTotal = 0`; km individual = km combinado atual
- **Trocado** → `kmInstalacaoTotal` = km **combinado** na data da troca; km individual = combinado atual − âncora

No modal, isso aparece como dois rádios; o bloco de data + km só é exibido quando "Trocado" está marcado (a opção "Original" não pede nada).

**Proibições que decorrem disso:**
- ❌ Não usar `_bikeKmMelhorEstimativa` nem `_bikeKmDisplay` em componentes já migrados
- ❌ Não misturar escala bruta (`state.bikeOdo.total`) com escala combinada no mesmo cálculo
- ❌ Não usar `bikeEstimarKmNaData` para ancorar troca de componente (o usuário informa o km combinado diretamente)
- ✅ Prefixo `≈` é exibido sempre que `_bikeUsoAnteriorEstimado() !== null`

### v0.9.1.01 / v471 — Mover componente entre jogos de rodas
Na troca de rodas, **qualquer um dos três cenários pode acontecer** (definição do usuário):
1. Disco/cassete ficam na roda → o jogo novo precisa dos seus próprios
2. Os componentes atuais passam para as rodas novas
3. Disco e cassete são independentes entre si

Solução: botão **MOVER P/ OUTRO JOGO** no disco (por posição) e no cassete.
- Troca o item físico entre dois jogos; se o destino já tinha um, os dois trocam de lugar
- Todo o histórico viaja junto com a peça
- Congela o que sai e retoma o que chega, respeitando o status (ativo/espera) de cada jogo

### v0.9.1.02 / v472 — Horário do pedal
- Bug: o card do pedal exibia a hora a partir de `date` (dia do calendário, hora sempre zerada por `_calcDataDia`) → sempre 00:00
- Fix: usar `registeredAt` (timestamp real do registro)

### v0.9.1.03 / v473 — Reorganização das abas
- Sub-aba **ROLAMENTOS → QUADRO**
- **Disco saiu de RODAS/PNEUS e foi para FREIOS** (dados continuam no jogo de rodas; o card indica qual jogo está ativo)
- Título da seção **RODAS → PNEUS**
- Nova seção **CUBOS E RAIOS** na sub-aba RODAS/PNEUS

Ordem final da sub-aba RODAS/PNEUS: Jogos de Rodas → Pneus → Cubos e Raios → Garrafa de Selante

### v0.9.1.04 / v474 — Cubo no modelo definitivo
Nome editável + escala combinada + duas categorias + migração `_migracaoCuboKmCombinadoV1`

### v0.9.1.05 / v475 — Pneu, disco e rolamento no modelo definitivo
Os três receberam o mesmo tratamento completo. Migrações: `_migracaoPneuKmCombinadoV1`, `_migracaoDiscoKmCombinadoV1`, `_migracaoRolamentoKmCombinadoV1`.

⚠️ Detalhe capturado durante a implementação: as **medições/manutenções já registradas** precisam ser migradas mesmo quando a âncora é 0, senão cálculos de taxa (DINÂMICO) enxergam um salto artificial entre a última medição antiga e a primeira nova.

### v0.9.1.06 / v476 — Freehub e tensão dos raios
- Freehub introduzido (inicialmente como componente independente — corrigido logo em seguida)
- **TENSÃO DOS RAIOS**: card por roda, verificação periódica com data + observação, `raiosIntervaloVerificacaoKm` global (padrão 2000km), previsão de próxima verificação
- Raios **não** têm km individual/instalação/troca — são apenas um log de verificações

### v0.9.1.07 / v477 — Freehub corrigido
> "O freehub faz parte do cubo traseiro — não é uma peça à parte"

- Removidos nome, instalação, troca e sessão próprios do freehub
- `jogo.traseira.freehub = { manutencoes: [] }` — apenas um **segundo item de manutenção dentro do cubo traseiro**
- Usa o **km do próprio cubo** (`_bikeRodaCuboKm('traseira')`) como referência
- Reaproveita `cuboIntervaloManutencaoKm`
- Anatomia registrada: **cubo traseiro** tem rolamentos do cubo **e** rolamentos do freehub (dois itens de manutenção distintos); **cubo dianteiro** tem apenas os rolamentos do cubo

---

## ESTRUTURA ATUAL DE `state.bikeOdo` (v0.9.1.07)

```javascript
state.bikeOdo = {
  // ODÔMETRO
  nome, dataCompra, usada, total, parcial, dataUltima, leituras[],
  usoAnterior: {modo, fixoKm, kmDiaFixo, dataInicial, dataFinal, divisor},

  // DRIVETRAIN
  correntes: [{id, nome, status, kmInstalacao, kmAcumulado, kmInicioSessaoAtual,
               imersoes[], medicoes[], dripWaxTopoffs[], powerlockContador}],
  powerlockLimiteMontagens,          // global, padrão 7
  correnteExpectativaKm, correnteIntervaloImersaoKm,
  correnteExtensaoTopoffKm, correnteMaxTopoffs,
  _bikeCorrenteSelecionada,
  ferramentasFolga[], ferramentaFolgaAtivaId,
  cera: {imersoesSujasMax, pesoPanelaVazia, pesagens[], topUpsPote[], trocas[]},

  // JOGOS DE RODAS
  jogosDeRodas: [{
    id, nome, status: 'ativo' | 'espera',
    dianteira: {
      pneu:  {nome, dataInstalacao, kmInstalacaoTotal, kmAcumulado,
              kmInicioSessaoAtual, kmEsperado, selante:{aplicacoes[]}} | null,
      cubo:  {nome, dataInstalacao, kmInstalacaoTotal, kmAcumulado,
              kmInicioSessaoAtual, manutencoes[]},
      disco: {dataInstalacao, kmInstalacaoTotal, kmAcumulado, kmInicioSessaoAtual,
              espessuraMinima, medicoes[], anteriores[]},
      raios: {verificacoes: [{id, data, kmTotal, obs}]},
      pneusAnteriores: [{id, nome, dataRemocao, kmRodados, ...}]
    },
    traseira: {
      ...tudo acima...,
      freehub: {manutencoes: [{id, data, kmTotal, obs}]},   // SÓ traseira; parte do cubo
      cassete: {nome, dataInstalacao, kmInstalacaoTotal, kmAcumulado,
                kmInicioSessaoAtual, kmEsperadoTroca, anteriores[]}  // SÓ traseira
    }
  }],
  _jogoRodasSelecionado,             // estado de UI (visualizado ≠ ativo)
  cuboIntervaloManutencaoKm,         // global, padrão 5000 (cubo e freehub)
  raiosIntervaloVerificacaoKm,       // global, padrão 2000
  selanteIntervaloDias,              // global, padrão 60
  selante: {
    garrafaAtual: {pesoCheiaNova, volumeMl, dataInicio},
    pesagens: [{id, data, pesoAtual, obs}],
    garrafasAnteriores: [{id, pesoCheiaNova, volumeMl, dataInicio, dataFim, obs}]
  },

  // FREIOS (presos ao quadro — sem sessão)
  freios: {
    dianteiro: {pastilha: {dataInstalacao, kmInstalacaoTotal, espessuraMinima,
                           medicoes[], anteriores[]}},
    traseiro:  {pastilha: {...}}
  },

  // QUADRO / ROLAMENTOS (presos ao quadro — sem sessão)
  rolamentos: {
    'headset-superior': {nome, dataInstalacao, kmInstalacaoTotal, kmEsperadoTroca,
                         intervaloManutencaoKm, manutencoes[], anteriores[]},
    'headset-inferior': {...},
    'bb':               {...}
  },

  _subTabBike: 'drivetrain' | 'rodas' | 'freios' | 'rolamentos',

  // FLAGS DE MIGRAÇÃO (nunca remover — evitam reprocessamento)
  _migracaoKmSelanteV2, _migracaoDiscoParaJogoV1,
  _migracaoManutencaoEstimativaV1, _migracaoCuboManutencaoEstimativaV1,
  _migracaoAnterioresEstimativaV1,
  _migracaoCuboKmCombinadoV1, _migracaoPneuKmCombinadoV1,
  _migracaoDiscoKmCombinadoV1, _migracaoRolamentoKmCombinadoV1
}
```

---

## MAPA: ONDE CADA COMPONENTE VIVE E APARECE

| Componente | Dados vivem em | Aparece na sub-aba | Sessão de rodízio? |
|---|---|---|---|
| Corrente / Cera | `bikeOdo` (nível raiz) | DRIVETRAIN | Não (rotação própria) |
| Cassete | `jogo.traseira` | **DRIVETRAIN** | Sim |
| Pneu | `jogo[pos]` | RODAS/PNEUS | Sim |
| Selante (aplicações) | `jogo[pos].pneu.selante` | RODAS/PNEUS | — (por tempo) |
| Garrafa de selante | `bikeOdo.selante` | RODAS/PNEUS | — |
| Cubo | `jogo[pos]` | RODAS/PNEUS | Sim |
| Freehub | `jogo.traseira.freehub` | RODAS/PNEUS (dentro do cubo) | Usa km do cubo |
| Raios | `jogo[pos].raios` | RODAS/PNEUS | — (log de verificações) |
| Disco | `jogo[pos]` | **FREIOS** | Sim |
| Pastilha | `bikeOdo.freios[pos]` | FREIOS | Não (quadro) |
| Headset / BB | `bikeOdo.rolamentos` | QUADRO | Não (quadro) |

---

## TIPOS DE PREVISÃO DE VIDA ÚTIL (padrões consolidados)

- **FIXO** — expectativa em km, editável inline. Usado por: pneu, cassete, rolamentos, corrente
- **DINÂMICO** — taxa de desgaste (mm/km) das duas últimas medições, projetada até a mínima. Usado por: disco, pastilha, folga da corrente.
  ⚠️ DINÂMICO é razão delta/delta — o deslocamento aditivo da estimativa se cancela, então **não** precisa de tratamento especial de escala
- **PRÓXIMA MANUTENÇÃO** — intervalo fixo em km desde a última. Usado por: cubo, freehub, rolamentos
- **PRÓXIMA VERIFICAÇÃO** — igual acima, mas sem componente/âncora. Usado por: tensão dos raios
- **POR TEMPO (dias)** — `_bikeDiasLinhaHTML`. Usado por: selante

---

## REGRAS DE DESENVOLVIMENTO (acréscimos das Sessões 9 e 10)

### Escala de km
1. **Uma régua só: km combinado.** Nenhum componente novo deve usar `state.bikeOdo.total` cru.
2. Cadastro de componente = **duas opções** (original / trocado). Nunca três, nunca checkbox.
3. Registros (manutenções, medições) gravam km **na mesma escala** usada pelo cálculo que os lê.
4. Toda mudança de escala exige **migração com flag própria**, cobrindo também os registros históricos.

### Completude de componente
Ao criar ou revisar um componente, verificar a lista inteira:
- [ ] Nome editável **no card** e **no modal de cadastro**
- [ ] Data em **todo** registro, sempre com o datepicker `date-br` (botão 📅)
- [ ] Duas categorias (original/trocado) na instalação
- [ ] `pushUndo(label)` antes de qualquer mutação
- [ ] TROCAR arquiva com nome, datas, km e **histórico** (manutenções/medições) da peça
- [ ] Histórico de trocas no formato padronizado ("REMOVIDO em … — **Nome**, rodou Xkm · Motivo: …")

### Processo
- **Uma mudança por vez**; nunca avançar de versão sem o teste do usuário
- Ao aplicar um padrão novo, **aplicar em todos os componentes equivalentes na mesma entrega** — não deixar metade no modelo antigo
- Diante de um relato de bug, **verificar o código antes de sugerir cache/versão desatualizada**; e verificar o caminho específico relatado (o modal, não só o card)
- `node --check` em script extraído antes de toda entrega
- Cuidado com `str_replace` grande: pode remover assinaturas de função adjacentes — sempre revalidar
- Dados salvos ficam no dispositivo do usuário; alterações de modelo só chegam neles via **migração** ou reconfiguração manual

---

## MESCLAGEM DE BACKUPS (Sessão 10)
> ⚠️ **ELIMINADO NA SESSÃO 14** — ver "O QUE FOI ELIMINADO NESTA SESSÃO" no fim do documento.


Dois backups divergentes foram mesclados em `treino_backup_MESCLADO.json`:
- **Treino** (`history`, `plano`, `diasBike`, `diasStatus`) veio do arquivo mais completo, que refletia a semana 8 real (dias perdidos + relocamento para a semana 9)
- **Bike** (`bikeOdo`) veio do outro arquivo, o único com o sistema completo
- `bikeHistory` do mais completo (7 rides; os do outro eram subconjunto exato)
- Conflito resolvido: Série D / Leg Press Inclinado — mantido **100kg** (bate com a orientação do próprio plano); os 10kg do outro arquivo eram erro de digitação
- Horários corrigidos (início + duração, UTC−3): 18/07 16:32+1:30 → 18:02 · 21/07 18:06+1:08 → 19:14 · 25/07 17:09+1:27 → 18:36

---

## PENDÊNCIAS

> Estado ao fim da Sessão 10. Situação atualizada ao fim da Sessão 11 marcada em cada item.

### Bike — componentes ainda não construídos
1. ~~**Pedivela / Coroa** (DRIVETRAIN) — km + desgaste~~ — **RESOLVIDO** na Sessão 11 (v0.9.1.08)
2. ~~**Pastilha ainda no modelo antigo**~~ — **RESOLVIDO** na Sessão 11 (v0.9.1.30)
3. **Câmara alternativa** (para quem não usa tubeless) — **ainda não construído**; na Sessão 11 o usuário optou por adiar antes de especificar
4. ~~**Exclusão de registros**~~ — **RESOLVIDO** na Sessão 11 (v0.9.1.33), 9 listas

### Processo
5. ~~Verificar os números de pneu/disco/rolamento após as migrações~~ — **CONFERIDO** na Sessão 11: usuário confirmou que os números estão corretos
6. Manter GitHub Pages atualizado com o HTML funcional mais recente — **permanente**

---

## ARQUIVOS DE TRABALHO (fim da Sessão 10)

- `index.html` — v0.9.1.07
- `sw.js` — `treino-v477`
- `CONTEXTO_PROJETO_8.md` — este arquivo

## REGRA PARA NOVA SESSÃO (atualizada)

Anexar sempre os três:
1. `index.html` (mais recente)
2. `sw.js` (mais recente)
3. `CONTEXTO_PROJETO_8.md`

---
---

# SESSÃO 11 — v0.9.1.08 → v0.9.1.36 (SW `treino-v478` → `treino-v506`)

> Sessão longa: 29 versões. Fechou as pendências de componentes da bike, resolveu um bloqueio
> grave de sincronização entre aparelhos e fez limpeza estrutural de código morto.

## RESUMO POR VERSÃO

| Versão | SW | O que mudou |
|---|---|---|
| v0.9.1.08 | v478 | **Coroa** (DRIVETRAIN) |
| v0.9.1.09 | v479 | Cubo/freehub/raios em card único; intervalos independentes |
| v0.9.1.10 | v480 | Removidas 2 funções duplicadas |
| v0.9.1.11 | v481 | Bug: D→Bike não limpava o treino gerado |
| v0.9.1.12–.13 | v482–483 | Espessura nova (fábrica) de disco e pastilha |
| v0.9.1.14 | v484 | Nome editável em disco e pastilha |
| v0.9.1.15 | v485 | **Fluido DOT** (por tempo) |
| v0.9.1.16–.20 | v486–490 | **Torque de pre-load do headset** + ajustes de posição/duplicidade |
| v0.9.1.21–.25 | v491–495 | Diagnóstico e correção da **sincronização** |
| v0.9.1.24 | v494 | Correção do **cache do PWA** (`no-store`) |
| v0.9.1.26 | v496 | Bug: sem registrar pedal após concluir treino |
| v0.9.1.27 | v497 | Ordenação do histórico |
| v0.9.1.28 | v498 | Botão ✎ para editar datas do histórico |
| v0.9.1.29 | v499 | **Altura do selim** (QUADRO) |
| v0.9.1.30 | v500 | **Pastilha** migrada para escala combinada |
| v0.9.1.31 | v501 | Bug de corrupção: MOVER disco entre jogos |
| v0.9.1.32 | v502 | **Carimbo único** de data/hora + `_diaLocal` |
| v0.9.1.33 | v503 | ✕ de exclusão em 9 listas |
| v0.9.1.34 | v504 | Sync passa a **empurrar** quando o local é mais novo |
| v0.9.1.35 | v505 | `pushUndo` no `_dParaBikeSubstituir` |
| v0.9.1.36 | v506 | Removidas **17 funções mortas** |

---

## COMPONENTES NOVOS

### Coroa (DRIVETRAIN, v0.9.1.08)
- Único ponto de desgaste do conjunto pedivela/coroa — a pedivela tem vida útil ilimitada.
  Trocar a coroa com ou sem a pedivela dá no mesmo; só a coroa é rastreada.
- **Sem manutenção periódica** — padrão FIXO (expectativa de troca em km), igual pneu/cassete.
- Presa ao quadro: **não** acompanha o jogo de rodas. Escala combinada direta, sem sessão.
- `_bikeCoroaInit` / `_bikeCoroaComp` / `_bikeCoroaKm` / `_bikeCoroaFixo`; estado em `bikeOdo.coroa`.

### Fluido DOT (FREIOS, v0.9.1.15)
- **Único para a bike toda** (decisão do usuário) — os dois freios são trocados juntos.
- Rastreado por **tempo (dias)**, não por km: o fluido degrada por absorção de umidade.
- Intervalo padrão 365 dias, editável. Estado em `bikeOdo.dot = { intervaloDias, trocas[] }`.
- `_bikeDotDiasDesde` / `_bikeDotProximaTroca`; exibição via `_bikeDiasLinhaHTML`.

### Torque de pre-load do headset (QUADRO, v0.9.1.16–.20)
- **Só registro**, sem cálculo de vida útil. Um registro para o headset como um todo (é um
  parafuso só no topo, que ajusta os dois rolamentos juntos).
- Posicionado **abaixo do bloco SUPERIOR**, antes do INFERIOR — é ajuste da parte de cima.
- Card mostra o **último torque em destaque** (com ✕ próprio) e o histórico traz apenas os
  registros **anteriores** ao mais recente, para não duplicar a mesma linha.
- Estado em `bikeOdo.headsetPreload = { historico[] }` — fora de `bikeOdo.rolamentos`, para
  não interferir nos loops genéricos que iteram aqueles componentes.

### Altura do selim (QUADRO, v0.9.1.29)
- Sob cabeçalho **POSIÇÃO**, separado de ROLAMENTOS: é fit, não desgaste.
- Marcação do canote em **campo de texto livre** (aceita `12.5`, `155mm`, letras) — formato
  das marcações varia por canote.
- Histórico de ajustes (não valor único), para permitir voltar a uma posição anterior.
- Estado em `bikeOdo.selim = { historico[] }`.

---

## MIGRAÇÕES DE ESCALA

### Pastilha → escala combinada (v0.9.1.30)
Era o **último** componente ancorado na km bruta do odômetro.
- `_bikeFreioKm` passou a usar `_bikeCombinadoAtual()`.
- **Sem** `kmAcumulado`/sessão, de propósito: a pastilha fica na pinça, presa ao quadro. Quem
  acompanha o jogo de rodas é o **disco**, que é preso à roda.
- Migração `_migracaoPastilhaKmCombinadoV1`: soma o uso anterior estimado a `kmInstalacaoTotal`,
  `medicoes[].kmIndividual` e `anteriores[].kmRodados`. Âncora `0` (peça original) **não** é
  convertida — já acompanha a km total.
- Cadastro com as duas categorias; indicador `≈` no lugar do `_bikeKmDisplay` legado.

### Auditoria de escala (v0.9.1.31)
Todas as 11 escritas de âncora de sessão do arquivo foram conferidas:
- **Corrente** → km **bruta**, por design (rastreio exato desde a instalação, sem uso anterior).
- **Cubo, disco, cassete, pneu** → `_bikeCombinadoAtual()`.
- **Fluxos de instalação/troca** → km combinado digitado pelo usuário.

---

## BUGS CORRIGIDOS

### Intervalos de cubo e freehub eram compartilhados (v0.9.1.09)
`cuboIntervaloManutencaoKm` era um **valor global único**, usado pelos dois cubos *e* pelo
freehub. Agora cada cubo tem o seu `intervaloManutencaoKm` e o freehub tem o dele. Migração
faz cada um herdar o valor global antigo como ponto de partida. O freehub continua usando o
**km do cubo traseiro** como régua (os rolamentos giram junto) — o que é independente é o
*intervalo*.

### D→Bike não eliminava o treino já gerado (v0.9.1.11)
O treino gerado fica em `plano.diasExpandidos[dayKey]`, e a agenda renderiza esse card
**independente** de `diaObj.serie`/`tipo`. O fluxo RELOCAR já limpava (via
`aplicarRelocamento`); o fluxo **SUBSTITUIR** não. O dia virava PEDAL e o card do treino D
continuava pendurado embaixo. Limpeza movida para `_dParaBikeMarcarDia`, comum aos dois fluxos.

### Impossível registrar pedal após concluir o treino (v0.9.1.26)
Dois portões fechavam junto: a lista da agenda omite a seção de bike quando o dia está
expandido (correto — `expandirDia` a anexa por outro caminho), e esse outro caminho tinha
`&& status !== 'concluido'`. Num dia em que se treinou **e** pedalou, não sobrava lugar
nenhum. A condição foi removida — concluir a musculação não diz nada sobre ter pedalado.

### MOVER disco entre jogos corrompia a km (v0.9.1.31)
O fluxo de MOVER chamava `_bikeCompCongelar`/`_bikeCompRetomar`, que gravam a âncora de sessão
na km **bruta**, enquanto `_bikeRodaDiscoKm` lê subtraindo de `_bikeCombinadoAtual()`. Cada
movimentação **inflava a km do disco em exatamente o uso anterior estimado**. Passou a usar
`_bikeRodaDiscoCongelar`/`_bikeRodaDiscoRetomar`. As três helpers genéricas foram **removidas**
— eram a armadilha que causou o bug.

---

## SISTEMA DE DATA E HORA (reescrito na v0.9.1.32)

### Antes
Cada registro guardava **dois** campos: `date` (dia da agenda, hora zerada em 00:00) e
`registeredAt` (momento do registro). O card mostrava a data de um e a **hora** do outro — o
que exibia a hora do registro como se fosse a hora da atividade.

### Agora — carimbo único
Decisão do usuário: *"não precisamos de dois horários; eu devo registrar o treino assim que ele
é concluído, esse é o único horário que eu preciso ter"*. Quando não dá para registrar na hora
(esquecimento, bug, app fora do ar), o **✎ do histórico corrige** — foi para isso que ele existe.

- `date` passou a carregar **dia + hora real**. `registeredAt` deixou de existir.
- `_carimboNoDia(dataDia)` — dia vem da agenda, hora é a de agora.
- Migração `_migracaoCarimboUnicoV1`: mantém o **dia** de `date` e adota a **hora** de
  `registeredAt`. O dia **nunca muda** — fundir pelo `registeredAt` inteiro moveria para o dia
  seguinte qualquer registro feito de madrugada.
- Ordenação do histórico passou a ser direta por `date` (o desempate por `registeredAt` da
  v0.9.1.27 deixou de ser necessário).

### `_diaLocal()` — armadilha de fuso resolvida junto
As comparações de dia usavam `date.slice(0,10)`, que lê a data em **UTC**. Isso funcionava
enquanto `date` era meia-noite local (03:00Z em UTC−3). Com hora real, um treino às 22:00
viraria **01:00Z do dia seguinte** e deixaria de casar com o dia da agenda — quebrando
justamente os treinos de fim de dia. `_diaLocal(d)` monta `YYYY-MM-DD` a partir dos
componentes **locais**; as 5 comparações afetadas foram trocadas.

> **REGRA:** nunca usar `.toISOString().slice(0,10)` para obter o dia de um registro. Sempre `_diaLocal()`.

### Edição de datas (✎, v0.9.1.28, simplificado na .32)
Botão ✎ ao lado do ✕ em cada registro do histórico (filtro CICLO ATUAL). Edita **um** carimbo:
DATA (datepicker `date-br`) + HORA (`hh:mm`). `pushUndo` antes de gravar.

### Formato de data
- Eliminado o último `input[type=datetime-local]` do arquivo (renderizava em formato americano).
- Varredura confirmou: **nenhum** `datetime-local` nem `input type="date"` em código vivo.
- *Nota honesta:* a função onde essa troca foi feita (`finishSerie`) era **código morto** — a
  correção não teve efeito visível. O que valeu da v0.9.1.32 foi o carimbo único e o `_diaLocal`.

---

## SINCRONIZAÇÃO — DIAGNÓSTICO COMPLETO (v0.9.1.21 → .25)

> Esta seção registra também o **caminho errado**, porque foram 3 correções no lado errado
> antes de encontrar a causa. O erro de método foi deduzir pelo código sem medir onde a
> corrente quebrava.

### Sintoma
PWA com o histórico mais recente; desktop não recebia. `Ctrl+Shift+R` no desktop não resolvia.

### Tentativas que NÃO resolveram (e por quê)
1. **v0.9.1.21 — re-leitura no foco da aba.** Correção real de um buraco real (aba aberta nunca
   reconsultava a nuvem), mas **irrelevante para o sintoma**: hard reload já executa o mesmo
   `supabaseLoad`. O usuário apontou isso corretamente.
2. **v0.9.1.22 — `saveState(true)` na limpeza de boot.** Bug real: a limpeza de `planoRascunho`
   chamava `saveState()` normal, carimbando `_updatedAt = agora` **antes** de `supabaseInit`
   rodar (500 ms depois), fazendo o local sempre parecer mais novo. Explicava por que o reload
   não resolvia — mas **não era a causa do caso do usuário**.
3. **Instrução para usar o botão "SINCRONIZAR COM A NUVEM"** — o botão **não existia**. A função
   `syncFromCloud()` estava no arquivo, completa, mas **nunca ligada a nada**. Código morto.

### Causa real
O **PWA não estava subindo**. O local tinha o dado bom, a nuvem tinha versão mais velha —
o desktop nunca teve o que baixar. Só ficou claro quando o usuário reportou a mensagem do
próprio app: *"seus dados locais são mais recentes que a nuvem"*.

O motivo estava escrito no código: quando o local era mais novo, `supabaseLoad` **não fazia
nada**. O upload dependia só do debounce de 2 s após uma edição — e no celular, se o app vai
para o fundo nessa janela, o SO congela a página e o `setTimeout` nunca dispara. O envio se
perdia em silêncio e nada nunca o recuperava.

### Correções
- **v0.9.1.23** — `syncFromCloud()` **ligada ao menu**; modal passou a mostrar também a **conta
  logada** (para comparar aparelhos) e os erros passaram a aparecer no toast com a mensagem real.
- **v0.9.1.25** — **ENVIAR PARA A NUVEM** (espelho manual, força o local a subir) +
  `flushSyncPendente()` no `pagehide`/aba oculta, que dispara o envio pendente antes do congelamento.
- **v0.9.1.34** — `supabaseLoad` passou a **empurrar** quando o local é estritamente mais novo.
  Fecha o buraco de vez: boot e retorno de foco reconciliam nos **dois sentidos**.

### Os 5 caminhos de upload hoje
1. **Debounce de 2 s** após cada `saveState()` não-vindo-da-nuvem (bloqueado até a leitura
   inicial terminar, para não sobrescrever a nuvem com estado incompleto).
2. **Flush na saída** — `pagehide` / aba oculta dispara o pendente na hora.
3. **Reconciliação** no boot / foco / volta de rede — compara carimbos e sobe ou desce.
4. **Primeiro login** — nuvem vazia, sobe o local inteiro.
5. **Manual** — ENVIAR PARA A NUVEM.

> **Guarda importante:** a reconciliação (3) **não roda** se houver upload pendente na fila dos
> 2 s — é proposital, para não baixar por cima de edição não enviada. Logo ela age no *próximo*
> foco, não instantaneamente.

### Limitação conhecida (não resolvida)
A decisão é sempre por **carimbo de tempo**, nunca por conteúdo. Dois aparelhos editando
offline: o de carimbo mais recente vence, o outro perde sem aviso. Resolver exigiria merge
campo a campo.

---

## CACHE DO PWA (v0.9.1.24)

### Sintoma
PWA travado numa versão antiga; desktop atualizava normalmente. Fechar o app não resolvia.

### Causa
No `sw.js`, `fetch(event.request)` para navegação **ainda passa pelo cache HTTP do navegador**
— camada separada do cache do Service Worker. O comentário "never cached" só valia para o cache
do SW. O GitHub Pages manda header de cache no HTML. No desktop, `Ctrl+Shift+R` ignora o cache
HTTP; no Android **não existe hard reload** e fechar o app não o limpa.

### Correção
- `sw.js`: `fetch(event.request.url, { cache: 'no-store', credentials: 'same-origin' })`.
  Usa a **URL em string** porque construir um `Request` novo a partir de um com `mode:'navigate'`
  lança `TypeError`.
- `index.html`: registro com `{ updateViaCache: 'none' }`, para o próprio `sw.js` nunca vir do
  cache HTTP.

### Destravamento manual (sem perder dados)
Chrome → Configurações → Privacidade → Limpar dados de navegação → Avançado → marcar **apenas**
"Imagens e arquivos armazenados em cache". **Nunca** marcar "Cookies e dados do site": é onde
fica o IndexedDB com todo o estado local.

> *Nota:* instruções que não funcionam no PWA — abrir URL com `?v=2` — foram sugeridas e estavam
> erradas: o PWA não tem barra de endereço, e URL diferente cria entrada nova no cache em vez de
> atualizar a original.

---

## EXCLUSÃO DE REGISTROS (v0.9.1.33)

✕ adicionado em **9 listas** (uma a mais que as 8 mapeadas — o drip-wax fica no mesmo card da
corrente e ficaria inconsistente sem):

| Lista | Onde |
|---|---|
| Imersões | Corrente |
| Drip-wax top-offs | Corrente |
| Medições de folga | Corrente |
| Medições de espessura | Pastilha |
| Medições de espessura | Disco |
| Manutenções | Cubo |
| Manutenções | Freehub |
| Aplicações de selante | Rodas |
| Verificações de tensão | Raios |

Padrão: `_bikeRegExcluirModal` (confirmação genérica) + `_bikeRegExcluirFim` (salvar/fechar/
renderizar/toast). `pushUndo` antes de apagar. Já tinham ✕: cera, rolamento, selim, pre-load, DOT.

---

## LIMPEZA DE CÓDIGO MORTO

### v0.9.1.10 — funções duplicadas
`gerarOrientacaoBike` e `desfazerSubstitutoD` estavam **declaradas duas vezes**. Em JS a segunda
declaração sobrescreve a primeira silenciosamente, então só a de baixo rodava. As de
`gerarOrientacaoBike` eram idênticas; as de `desfazerSubstitutoD` **não** (a que rodava era a
mais completa). Risco real: editar a cópia errada e a mudança não fazer efeito.

### v0.9.1.36 — 17 funções sem nenhuma referência
`cycleStatus` · `setExStatus` · `getPlanSerie` · `setSerieMode` · `addPlanExercise` ·
`updatePlanExField` · `markAll` · `finishSerie` · `setVariant` · `addVariant` ·
`enviarPlanoAtual` · `abrirChatDia` · `regenerarDia` · `corrigirDiaComoBike` ·
`_restoreChatInline` · `setPlanoInicio` · `solicitarReplanejamento`

Várias parecem restos do `planMode`, removido em sessão anterior. Antes de apagar foi
verificado que **não existe despacho dinâmico** no arquivo (`window[...]`, `eval`,
`new Function`) — se existisse, a detecção por texto seria não confiável. Após a remoção:
nova varredura acusou **zero** órfãs e nenhuma órfã criada em cascata. ~13 mil caracteres.

> **MÉTODO:** varredura de código morto = para cada `^function nome(`, contar ocorrências totais
> do identificador menos as declarações. Zero → morta. Só é confiável sem despacho dinâmico.

---

## APRENDIZADOS DE PROCESSO (Sessão 11)

1. **Diante de um bug, medir antes de deduzir.** Três correções foram entregues no lado errado
   da sincronização porque o diagnóstico veio da leitura do código, sem confirmar onde a corrente
   quebrava. A pista decisiva foi uma mensagem que o próprio app já exibia.
2. **Não mandar o usuário usar algo sem verificar que existe.** O botão "SINCRONIZAR COM A NUVEM"
   foi indicado duas vezes antes de se descobrir que a função nunca fora ligada à interface.
3. **Corrupção silenciosa de dado se conserta na hora**, não vira item de pauta. O bug do MOVER
   disco foi reportado e deixado parado; o usuário questionou, com razão.
4. **Ao corrigir um bug causado por helper obsoleta, remover a helper.** Deixá-la no arquivo
   garante que alguém a use de novo.
5. **`str_replace`/scripts com padrões multi-linha:** separar o que é **alvo de edição** do que é
   só **âncora de desambiguação**. Uma tentativa da v0.9.1.33 destruiu linhas adjacentes por
   cortar a partir do fim do padrão inteiro; o `node --check` pegou antes da entrega.
6. **Antes de adicionar hora a um campo de data, auditar as comparações por dia.** A mudança do
   carimbo único teria introduzido um bug pior que o resolvido, sem o `_diaLocal`.
7. **Ao migrar escala, verificar os *dois* lados:** quem lê e quem escreve a âncora. O bug do
   MOVER existia porque só o leitor foi migrado.

---

## ARQUIVOS DE TRABALHO (fim da Sessão 11)

- `index.html` — v0.9.1.36
- `sw.js` — `treino-v506`
- `CONTEXTO_PROJETO_9.md` — este arquivo

## PENDÊNCIAS ABERTAS (fim da Sessão 11)

1. **Câmara alternativa** (não-tubeless) — não construído, sem especificação. Duas decisões em
   aberto: se substitui o selante numa roda (roda é tubeless **ou** com câmara) ou convive com
   ele; e o que rastrear (só instalação + km, ou também remendos/furos).
2. **Conflito de sync por carimbo, não por conteúdo** — limitação conhecida, ver seção de
   sincronização.
3. **Hora real da atividade vs. hora do registro** — resolvido por decisão de produto (carimbo
   único + ✎), não por campo separado. Registrar aqui caso a decisão mude.
4. Manter GitHub Pages atualizado com o HTML funcional mais recente.

---
---

# SESSÃO 12 — v0.9.1.37 → v0.9.1.62 (SW treino-v507 → treino-v530)

> Sessão longa, com dois eixos: **(1) reescrita completa do núcleo de sincronização** e
> **(2) construção do contexto que a IA recebe para gerar orientações**. Ao final, o usuário
> decidiu uma **mudança arquitetural grande** (eliminação do modelo de Ciclos), especificada na
> última seção e **ainda não implementada**.
>
> Nenhuma versão `.45` existiu no `index.html` — o comentário do `sw.js` cita esse número porque
> era o previsto quando a mudança do Service Worker foi escrita; a entrega saiu como `.46`.

---

## SESSÃO 12 — SINCRONIZAÇÃO (substitui a seção antiga)

### O problema de origem

A decisão de quem vence — local ou nuvem — era sempre por carimbo (`_updatedAt`), nunca por
conteúdo. Dois aparelhos editando em paralelo: o de carimbo mais recente vencia integralmente e
o outro perdia dados **sem aviso**. Pior: o app **não conseguia nem detectar** o conflito, porque
comparar `cloudUpdatedAt` vs `localUpdatedAt` não distingue:

- (a) o outro aparelho editou depois de mim, eu não mexi em nada → baixar é correto
- (b) os dois editaram em paralelo desde o último encontro → **CONFLITO**

Nos dois casos a nuvem aparece mais nova.

### A âncora `_syncBase` (v0.9.1.37)

`state._syncBase` guarda o `updated_at` que a **nuvem** tinha na última vez que **este aparelho**
leu ou escreveu com sucesso — o ancestral comum. Com ela os três casos ficam separáveis:

| Situação | Significado |
|---|---|
| `cloud === base` | a nuvem não mudou desde que eu a vi → subir é seguro |
| `cloud > base`, local intocado | só o outro lado mudou → baixar é seguro |
| `cloud > base` **e** local mudou | **divergência real** |

Regras da âncora:
- **Nunca sobe para a nuvem** (`delete payload._syncBase` antes de todo upsert). É metadado de
  aparelho: se viajasse, o outro aparelho baixaria uma âncora que não é dele.
- É sempre reescrita **depois** de `Object.assign(loadState(), parsed)`, porque `loadState()`
  devolve o **DEFAULT** (não o persistido) e o assign zeraria o valor.
- Gravar a âncora usa `saveState(true)` (caminho `fromCloud`): ancorar não pode avançar
  `_updatedAt` nem disparar upload, senão o próprio ato de ancorar criaria uma edição.
- Ancorar SEMPRE no carimbo **como o banco o devolve**, não como o JS o mandou (ver
  "formato de timestamp" abaixo).

### Modal único SINCRONIZAÇÃO (v0.9.1.38 / .39)

Antes eram dois itens de menu — "SINCRONIZAR COM A NUVEM" (baixava) e "ENVIAR PARA A NUVEM"
(subia). Os nomes descreviam o efeito, não a direção, e cada um refazia por conta própria a
leitura da nuvem, com código quase idêntico já divergindo entre si.

Agora existe **um** item, `abrirSincronizacao()`, que lê a nuvem UMA vez e mostra:

```
Conta            richard@…
☁ Nuvem          30/07/26 23:38
📱 Este aparelho  30/07/26 23:38
Base comum       30/07/26 23:38
✓ Local e nuvem estão iguais.
[⬇ BAIXAR DA NUVEM]  [⬆ SUBIR PARA A NUVEM]
↳ últimos eventos (n)
```

- Nomes pela **DIREÇÃO**: BAIXAR DA NUVEM / SUBIR PARA A NUVEM.
- O painel abre **antes** da leitura remota (v0.9.1.39): três das quatro linhas são locais e
  offline é justamente quando mais interessa ver que há edição não enviada. Estados da linha da
  nuvem: `lendo…` / `sem conexão` (amarelo, com `↻ tentar de novo`) / carimbo.
- Sem leitura confirmada, **as duas direções ficam desabilitadas** — subir sem saber o que há na
  nuvem é o padrão que causa perda de dado.
- Painel 2 confirma a direção e destaca em **amarelo** quando a escolha vai sobrescrever o lado
  mais RECENTE pelo mais antigo — que é a única coisa que esses botões fazem e a reconciliação
  automática não faz.
- O SUBIR manual **recarimba `_updatedAt` para agora**. Sem isso, subir de propósito uma versão
  mais antiga seria desfeito na reconciliação automática seguinte.

### `_cloudLoaded` (v0.9.1.40)

`_supabaseLoadComplete` e `_cloudLoaded` respondem perguntas **diferentes** e por isso são duas:

- `_supabaseLoadComplete` = "a rotina de boot terminou, o app pode operar" → precisa virar `true`
  **mesmo na falha**, senão o app trava.
- `_cloudLoaded` = "eu realmente li a nuvem nesta sessão" → precisa continuar `false` na falha.
  É o que autoriza escrever.

**Bug que isso corrigiu:** o comentário no fonte dizia `on error, unblock saves`. Se a leitura
falhasse, o aparelho ficava com estado velho e AUTORIZADO A SUBIR; o upsert cego sobrescrevia a
nuvem com a cópia velha, que saía com carimbo NOVO — e os outros aparelhos baixavam a versão
velha por cima da boa deles.

- Zero linhas (conta nova) **conta como leitura bem-sucedida** e marca `true` antes do
  `supabaseSave()` daquele ramo, senão o guard barraria o primeiro envio.
- Resetado em `SIGNED_OUT` e em `supabaseLogout`.
- Bloqueia apenas o caminho **automático** (tudo que passa por `supabaseSave`). O SUBIR manual
  tem upsert próprio e continua livre: ali a escrita é ordem explícita do usuário.

### Camada 1 — dado vs. tela (v0.9.1.42)

Preferência de tela pertence ao APARELHO. Antes tudo subia junto, com dois efeitos: trocar de aba
num aparelho mexia na tela do outro e — pior — **fazia o carimbo avançar**, então um aparelho
podia "ganhar" da edição real do outro só porque alguém abriu uma aba nele.

```javascript
var UI_FIELDS = ['_agendaOpenCards','lastBibTab','planoSemana','planoDia',
                 '_bikeCorrenteSelecionada','_pendingCicloDataInicio','_pendingPrimeiroTreino',
                 '_duplicatasPendentes','_syncLog'];
stripUIFields(o)      // remove UI_FIELDS + _syncBase
buildCloudPayload()   // stripUIFields(cópia do state), SEM _updatedAt
capturarUIFields() / restaurarUIFields(m)
```

- A lista é por **CAMPO**, nunca por nome de função: o mesmo `saveState()` é chamado por ação de
  tela e por ação de dado, então só o campo diz de qual dos dois se trata.
- `buildCloudPayload()` exclui `_updatedAt` **de propósito**: ele muda a cada gravação e, dentro
  da assinatura, faria toda comparação dar "mudou". É recolocado no upsert.
- Guardar-e-recolocar os campos de tela é obrigatório nos **três** caminhos de substituição total
  (download do `supabaseLoad`, `_syncAplicarBaixar`, importação), porque `loadState()` devolve o
  default e o assign deixaria cada campo no valor de fábrica.

### Camada 2 — duas assinaturas (v0.9.1.42)

- `_lastDataSig` — o DADO mudou desde a última gravação? (vale offline)
- `_lastCloudSig` — a nuvem já recebeu exatamente este payload?

São independentes. `saveState` só carimba `_updatedAt` e só agenda envio se a assinatura mudou;
o espelho local grava **sempre**, inclusive preferência de tela.

**`_lastDataSig` é inicializado no fim de `loadPersistedState`**, a partir do estado que acabou de
ser carregado. Sem isso ele nasce `null`, a primeira gravação após o boot conta como "mudou" seja
qual for, e trocar de aba logo após abrir o app ainda carimbaria.

### Assinatura CANÔNICA (v0.9.1.50)

`JSON.stringify` sozinho **não** garante que o mesmo dado produza a mesma string:

- **Ordem das chaves** — `stringify` respeita a ordem de inserção; `Object.assign(loadState(),
  parsed)` monta na ordem do DEFAULT, enquanto um estado que evoluiu localmente está noutra ordem.
- **`null` vs ausente** — `stringify` OMITE chave `undefined` e ESCREVE chave `null`. Bastou uma
  rotina normalizar (`state.bikeOdo = null`) para o payload "mudar" sem nada ter mudado.

```javascript
_canon(v)        // chaves ordenadas; null e ausente viram a mesma coisa
_assinatura(o)   // JSON.stringify(_canon(o))
```

Custo medido: **~10ms** num estado de 294 KB, contra ~2ms do stringify simples.

### Camada 4 — carimbo visível (v0.9.1.43)

`⟳ dd/mm/aa hh:mm` no cabeçalho, **à esquerda junto do logo** (`.header-brand`), não dentro de
`.header-actions` — no mobile aquele bloco é `nowrap` e já disputa espaço.

| Estado | Exibe | Cor |
|---|---|---|
| Confirmado | `⟳ 30/07/26 22:15` | cinza |
| **Degradado** | `⟳ 30/07/26 22:15 · local` | amarelo (`--partial`) |
| **Conflito** | `⟳ 30/07/26 22:15 · conflito` | laranja (`--accent2`) |
| Sem nuvem | `⟳ 30/07/26 22:15` | cinza |

`_cloudExpected` = "este navegador usa nuvem?", lido do token `sb-*-auth-token` no localStorage.
Sem ele não dá para distinguir "nunca logou, está tudo certo" de "tem conta mas não falou com o
servidor" (degradado). `fmtStamp()` formata `dd/mm/aa hh:mm`; sem data ou data inválida → `—`.

### Travamento otimista e conflito (v0.9.1.46 / .48)

```javascript
dbu.from('user_data').update({ state, updated_at: carimbo })
   .eq('id', user.id).eq('updated_at', state._syncBase).select('updated_at')
```

Zero linhas afetadas significa que alguém escreveu no meio — **mas tem duas causas com respostas
opostas**, então a suspeita é conferida antes de virar acusação: relê o `updated_at` e compara
como **INSTANTE**, não como texto.

- **Formato de timestamp:** o JS manda `2026-07-31T02:47:54.827Z`; o Postgres devolve
  `2026-07-31T02:47:54.827+00:00`. Mesmo instante, texto diferente. **Confirmado em produção que
  o `.eq` casa de primeira** (o Supabase converte antes de comparar), mas a rota de recuperação
  existe: instantes iguais → reancora no formato do banco e repete uma vez.
- Sem `_syncBase` (primeiro envio de conta nova) cai no upsert de sempre — não há versão anterior
  para casar.
- Linha ausente na nuvem → grava do zero, sem acusar conflito.

**Com conflito pendente, os DOIS lados congelam:** nada sobe (escreveria por cima do outro
aparelho) e nada baixa (apagaria a edição local não enviada). É o único momento em que as duas
cópias têm conteúdo que a outra não tem.

**Painel de resolução** (`_syncPainelConflito`): três carimbos + **tabela comparando os dois
lados** (treinos no histórico, registros da bike, séries, ciclos, dias marcados). Sem a tabela a
escolha seria entre duas datas abstratas. O **lado perdedor é baixado como JSON antes de qualquer
mutação** — se o download falhar, nada foi aplicado.

- MANTER ESTE APARELHO → baixa o JSON da nuvem, reancora no carimbo atual dela (é isso que faz o
  update condicional voltar a casar), força `_lastCloudSig = null` e sobe.
- MANTER A NUVEM → baixa o JSON local, aplica a nuvem preservando UI_FIELDS.

### Diário de sincronização (v0.9.1.47)

`state._syncLog` (12 últimos eventos, em `UI_FIELDS`), exibido em `<details>` no fim do modal.
**Existe porque o console não serve no celular** — no Android não há como abri-lo sem cabo USB e
um desktop — e o celular é justamente onde o conflito nasce.

- Tipos: `enviado`, `baixado`, `descida manual`, `subida manual`, `conflito`,
  `conflito resolvido`, `bloqueado`, `falha de leitura`, `reancorado`.
- **Repetição imediata colapsa em `×N`**, senão uma falha de rede persistente enche as 12 linhas.
- `_logSync` **não chama `saveState`** — seria recursão, já que os pontos de log ficam dentro do
  `saveState` e do `supabaseSave`.
- Está em `UI_FIELDS`: se entrasse na assinatura, cada linha registrada contaria como alteração de
  dado e o carimbo avançaria sozinho.

### Filtro de console (desktop)

```
/travamento:|CONFLITO:|bloqueado,/
```

---

## SESSÃO 12 — SERVICE WORKER: network-first com queda para cache

O SW **nunca** cacheava o `index.html` (decisão anterior, para resolver PWA preso em versão
antiga no Android). O preço, descoberto nesta sessão: **o app não abria offline** — o `catch`
devolvia uma página fixa "Conecte-se".

Agora: toda navegação bem-sucedida grava a cópia em `INDEX_CACHE_KEY = './index.html'`, e o
`catch` devolve essa cópia. **A propriedade anti-obsolescência continua intacta** — online a
resposta vem sempre do `fetch` com `cache:'no-store'`, nunca do cache. Chave de cache **fixa**,
porque requisições de navegação variam (query string, hash) e cada variante viraria uma entrada.

---

## SESSÃO 12 — IMPORTAÇÃO DE BACKUP E O CARIMBO (v0.9.1.44)

Importar é a **única** operação que separa "quando o conteúdo foi produzido" de "quando este
aparelho recebeu a ordem".

| Arquivo | Prompt | Data final |
|---|---|---|
| Mais novo | IMPORTAR DADOS | **preserva a do arquivo** |
| Mais antigo | ⚠️ IMPORTAR VERSÃO MAIS ANTIGA (mostra as duas datas) | **hora atual** |
| Sem data | IMPORTAR ARQUIVO SEM DATA | **hora atual** |

Raciocínio: conteúdo idêntico tem de exibir data idêntica, senão o carimbo não serve para conferir
se dois aparelhos bateram. Já um arquivo antigo com data antiga seria **desfeito sem aviso** pelo
outro aparelho, que aplicaria corretamente a regra de não deixar nuvem velha apagar o que tem.

Pontos que não podem ser omitidos:
1. As duas leituras (`fileStamp`, `curStamp`) vêm **antes** de qualquer merge.
2. `_lastDataSig` é atualizado **antes** do `saveState`, senão ele lê a importação como alteração
   e carimba a hora atual por cima da data preservada.
3. **Divergência em relação ao Agenda:** lá o upload mora dentro do `saveState` e depende só do
   `_lastCloudSig`. Aqui quem agenda o envio é a flag `_mudou`, então "nada mudou" também
   significaria "não envia" — a importação nunca chegaria à nuvem. Resolvido com
   `scheduleSyncToSupabase()` **explícito**.
4. `_syncBase` e UI_FIELDS vêm no arquivo (o export é dump do state inteiro) e são **descartados**:
   a âncora do arquivo diz o que OUTRO aparelho viu da nuvem.
5. Importação chama `pushUndo`.
6. Comparação lexicográfica de ISO com `<` estrito — reimportar o mesmo arquivo não gera aviso.

---

## SESSÃO 12 — CONTEXTO DE TREINO ENVIADO À IA

### O problema

`gerarOrientacoesDiasFuturos()` mandava só a lista de dias futuros e o resumo das semanas. O
histórico existia como **tool** (`get_historico`), mas a instrução do sistema manda "solicite
dados apenas quando a pergunta realmente exigir; não solicite por precaução" — então o modelo
periodizava **sem saber quais cargas foram realmente usadas nem quais dias foram cumpridos**.

Decisão: **injetar direto**, não por tool. Determinístico, custa uma rodada de API a menos, e não
depende de o modelo decidir pedir. O prompt instrui explicitamente a NÃO chamar `get_historico`
nem `get_bike`.

### Os blocos (na ordem em que entram no prompt)

**1. `_textoCobertura(nHist, nProg, nBike)`** — declara o alcance da análise:

```
COBERTURA DESTA ANÁLISE:
  Trajetória de carga: 110 sessões desde 27/08/25 (342 dias)
  Detalhe exercício a exercício: 24 sessões desde 17/05/26 (79 dias)
  Ciclos abrangidos: 3 — ciclo atual, Ciclo 2, Ciclo 1
  Rides lidos: 30
  * Existem 10 sessões mais antigas fora desta janela — não afirme tendências anteriores a …
```

Duas janelas, **dois períodos declarados separadamente**: dizer só o da janela grande fazia
parecer que o detalhe alcançava aquele período também. Os limites são em SESSÕES, então o período
em dias varia com a frequência de treino — de propósito: uma janela "últimos 30 dias" traria 20
sessões numa fase boa e 4 numa fase de lesão, ficando mais rasa justamente quando mais importa.

**2. `_textoHistorico(n)`** — sessões com data, série, cumprimento e cada exercício com séries,
carga e marca de pulado. Extraído do resolvedor de `get_historico` para não existirem duas
formatações do mesmo dado. Entradas de ciclos arquivados levam `[Ciclo N]` — sem a marca o modelo
leria a virada de plano como queda de desempenho.

**3. `_textoProgressaoCargas(maxSessoes, maxPontos)`** — trajetória por exercício em ordem
**CRONOLÓGICA** (`history` é `unshift`, então sem inverter o modelo lê a evolução de trás para
frente):

```
Série B:
  Puxada neutra: 60kg → 65kg → 67.5kg  [séries: 4x8]
  Remada unilateral: 30kg → 32kg → 32kg  [séries: 3x10]
```

**Exclui core** (ver abaixo).

**4. `_textoCore(maxSessoes, maxPontos)`** — core é **transversal** a A/B/C/D:

```
CORE (transversal às séries A/B/C/D — avalie por FREQUÊNCIA GLOBAL, nunca por série):
  Sessões com core prescrito: 4 | com core realizado: 2 (50%)
  Último core realizado: qui., 30/07 (na série B) — há 1 dia
  Distribuição por série (apenas informativo): B 1/1 · C 0/2 · D 1/1
  Trajetória:
    Prancha lateral: 4x30s → 4x35s
```

**Motivo:** com o core diluído no agrupamento por série, o modelo leu "core pulado nas duas
últimas sessões C" e concluiu que havia problema de core — sem enxergar core concluído nas
sessões B e D do mesmo período. A conclusão era correta a partir de uma premissa mal construída.
A trajetória de core usa `sets` (4x30s → 4x35s), não carga: muitos não têm peso.

`_ehCore(ex)` — campo `isCore` + regex de músculo + regex de nome. **Extraída** da rotina da
Biblioteca: duas heurísticas divergentes classificariam o mesmo exercício de formas diferentes em
lugares diferentes.

**5. `_textoBike(maxRides, maxLista)`**:

```
CICLISMO (carga que afeta a recuperação para musculação):
  Rides registrados: 4 | Distância total: 159km
  Últimos 30 dias: 3 rides · 124km · 4h45 em movimento
  BPM médio geral: 145 (últimos: 138 → 142 → 151 → 148)
  * BPM é a carga INTERNA do ride: distância igual com BPM maior significa esforço maior…
  Rides recentes (mais recente primeiro): …
  Rides próximos a treino de PERNAS (série D):
    D em 02/08 — ride na véspera (52km, 151bpm)
```

O cruzamento com D é o que muda prescrição. Janela: rides até 2 dias antes do treino de pernas.

**6. `_textoAderencia()`** — a partir de `plano.diasStatus`; dias de descanso não contam como
falha. **Este bloco morre no modelo contínuo** (ver última seção).

### Limites calibrados por CUSTO MEDIDO

| Bloco | Limite | Custo (histórico de 120 sessões × 8 exercícios) |
|---|---|---|
| `_textoHistorico` | **24 sessões** | 1812 tokens |
| `_textoProgressaoCargas` | **120 / 8 pontos** | 1479 |
| `_textoCore` | **120 / 8** | 121 |
| `_textoBike` | **120 rides / 10 na lista** | 419 |
| | **Total** | **~3.800 tokens** |

O histórico detalhado cresce **por sessão** (60 sessões = ~4.500 tokens sozinhas); progressão,
core e bike são uma linha por **exercício/agregado** — de 40 para 120 sessões custaram ~330 tokens
no total. A trajetória longa é trabalho da progressão; detalhe de sessão só interessa perto.

### Histórico ATRAVESSANDO ciclos (v0.9.1.58)

`_historicoCompleto()` e `_bikeHistoricoCompleto()` juntam `state.history` + todos os
`state.ciclos[].history`, ordenam por data e marcam a origem com `_ciclo`.

**Bug que isso corrigiu:** arquivar um ciclo faz `state.history = []`. Nenhum bloco lia
`state.ciclos`, então **a IA começava todo ciclo novo com histórico ZERO** — os limites de 20/40
sessões quase nunca eram atingidos; o que limitava era a idade do ciclo.

As entradas arquivadas são **CÓPIAS** com a marca `_ciclo` (cópia rasa) — mexer no objeto original
corromperia o arquivo do ciclo.

---

## SESSÃO 12 — BUGS ENCONTRADOS FORA DO SYNC

### `savePerfil` destruía campos de outros caminhos (v0.9.1.49)

```javascript
state.perfil = { altura: …, peso: … };   // ANTES: literal, só os campos DESTE formulário
state.perfil = Object.assign({}, state.perfil, { … });  // AGORA
```

`configTreino` (CONFIGURAÇÃO DE RELOCAMENTO) é gravado por `saveConfigTreino`, não pelo formulário
do Perfil. **Cada tecla digitada no Perfil apagava a fila de séries configurada**; `getConfigTreino`
caía no default e o REORGANIZAR passava a seguir a fila padrão sem avisar. E se consolidava:
`loadConfigTreino`, ao renderizar a aba, gravava o default de volta nos ramos de migração — o
estado apagado virava estado legítimo e nem o backup seguinte tinha a configuração original.

### A tela não acompanhava a nuvem (v0.9.1.50)

`loadPerfil()` era chamado só por `switchTab('perfil')`, undo e importação. **Nenhum caminho de
download o chamava.** Quem estivesse parado na aba Perfil quando a nuvem chegasse continuava vendo
valores antigos — e, como `savePerfil` lê os campos do DOM, digitar qualquer coisa naquele
formulário velho gravava os valores velhos por cima do que tinha chegado e subia isso.

Havia **cinco cópias** da sequência de re-render (login, sessão existente, repull, BAIXAR manual,
resolução de conflito), já divergindo: nenhuma chamava `loadPerfil` e duas não chamavam
`renderBikeTab`. Unificadas em **`_reRenderAposNuvem()`** — `loadPerfil()` vem por último de
propósito (toca ~20 elementos; se falhar, o resto da tela já foi atualizado).

### Prévia ≠ aplicação no plano macro (v0.9.1.51)

**Duas implementações da mesma operação.** `renderModificacoesProposta` montava a prévia com uma
versão completa (entendia `semana`+`dia`, `{"tipo":"semana"}` e o campo `bike`);
`aplicarModificacoesMacro` gravava com outra, que só entendia `diaNum` e `alterar_serie`.

`gerarOrientacoesDiasFuturos` pede ao modelo `{"tipo":"alterar","semana":N,"dia":"…"}` — formato
que a primeira entende e a segunda ignora. **A prévia mostrava as orientações, o APLICAR não fazia
nada, e o app anunciava "Plano macro atualizado ✓"** — sucesso declarado para zero trabalho.

Unificado em **`_aplicarAcoesMacro(plano, mod)`**, usado pelos dois: prévia e resultado são iguais
**por construção**. O aplicador conta as ações e, se for zero, diz "o formato retornado não foi
reconhecido" em vez de anunciar sucesso.

Detalhe: a verificação de **endereçabilidade vem primeiro**. Antes, uma ação de formato
desconhecido caía no ramo `semana`+`dia` e o `a.semana || 1` **criava uma semana 1 vazia** antes de
descobrir que não havia dia.

### `pushUndo` ausente nos três aplicadores (v0.9.1.61)

`aplicarModificacoes`, `aplicarModificacoesInline` e `aplicarModificacoesMacro` mutavam sem
desfazer. No macro, a correção aplica numa **cópia** primeiro: o caminho de zero ações não toca o
estado nem empilha undo vazio.

### `b.tempo` no `get_bike` (v0.9.1.57)

Campo que **nunca existiu** (os gravados são `tempoMov`/`tempoTotal`). A duração simplesmente não
aparecia naquele texto desde sempre.

### `isCore` perdido num caminho de gravação (v0.9.1.53)

Um dos dois caminhos que montam o registro do histórico não copiava o campo — o registro nascia
sem a marca, tornando o core indistinguível de exercício da série.

---

## SESSÃO 12 — RIDES: BPM E EDIÇÃO

### BPM médio (v0.9.1.54 / .55)

Campo `bpmMedio` na segunda linha do card de bike (VEL. MÉD. · ELEV. · KCAL · **BPM MÉD.**),
aceita "142 bpm" e guarda só o número. Vai para o histórico e para o contexto da IA.

### EDITAR RIDE (v0.9.1.54)

O ✎ do card de ride passou a editar o **registro inteiro**, não só data e hora: km, tempo de
movimento, tempo total, velocidade, elevação, kcal, BPM e percurso. É como se preenche BPM em
pedais já gravados.

- O registro do histórico é uma **cópia** do que estava em `diasBike`; editar atualiza os dois.
- **O plano de origem é o do CICLO a que o registro pertence** (`achado.ciclo.plano`), nunca
  `state.plano`: chaves como `sem1_Segunda` existem em todo ciclo, e usar o atual escreveria num
  dia alheio por coincidência de chave.

### `_localizarRegistro(id, tipo)` (v0.9.1.62)

Localiza registro por id **inclusive em ciclos arquivados**, devolvendo a **REFERÊNCIA** ao objeto
real (ao contrário de `_historicoCompleto`, que copia). O ✎ passou a aparecer em **qualquer modo**
do histórico; **remover continua só no ciclo atual** — editar corrige, remover destrói.

### Máscara de tempo (v0.9.1.56)

`_mascaraTempo(el)` (oninput) e `_normalizaDuracao(v)` (gravação). Inserção **pela direita**: os
dois últimos dígitos são sempre os minutos.

| Digita | Vira |
|---|---|
| `45` | `0:45` |
| `115` | `1:15` |
| `1230` | `12:30` |

- Vale em T. MOVIMENTO, T. TOTAL (card e modal) e no campo HORA do modal.
- **Só reformata com o cursor no fim** — se a pessoa clicou no meio para corrigir um dígito, mexer
  no valor jogaria o cursor para o fim.
- A normalização acontece **no ponto de gravação** (`updateBikeField`), não só na tela: colar,
  editar pelo modal e digitar convergem para o mesmo formato.
- Campos ganharam `inputmode="numeric"`.

---

## SESSÃO 12 — SUÍTE DE TESTES AUTOMATIZADOS

**301 testes em jsdom**, arquivos em `/home/claude/`: `harness.js` + `testes_sync.js`. **Não fazem
parte do `index.html`** — não incham o app.

O harness carrega o `index.html` **real** com um Supabase falso que registra `upsert`, respeita os
filtros `.eq()` do `update` (é o que permite testar o travamento otimista) e permite forçar falha
de leitura/escrita e simular o formato de carimbo que o banco devolve.

### Baterias

| Bloco | Cobre |
|---|---|
| A | `_cloudLoaded`: nuvem vazia = sucesso, falha bloqueia upload, releitura destrava, logout zera |
| B | Âncora `_syncBase` |
| C | Modal de sincronização (abre offline, botões desabilitados, painel 1↔2, `closeModal`) |
| D | Camada 1 — dado vs. tela |
| E | Camada 2 — carimbo só avança com dado |
| F | Camada 4 — carimbo no cabeçalho |
| G | Importação (os 4 casos do adendo) |
| H | Travamento otimista e conflito |
| I | Diário de sincronização |
| J | Resolução de conflito |
| K | `savePerfil` não destrói campos alheios |
| L | **A TELA acompanha a nuvem** (nível DOM) |
| M | Modificações do plano macro (prévia == resultado) |
| N | Contexto de treino injetado |
| O | Core como dimensão transversal |
| P | BPM e edição de rides |
| Q | **RENDER de verdade** — variáveis indefinidas |
| R | Máscara de tempo |
| S | Ciclismo no contexto |
| T | Histórico atravessa ciclos |
| U | Cobertura declarada |
| V | `pushUndo` + editar registro arquivado |

### Lições de método (não repetir)

1. **`node --check` valida SINTAXE, não referência a variável inexistente.** Um campo entrou no
   card da agenda referenciando `bpm` sem a declaração e a suíte inteira passou — nenhum teste
   RENDERIZAVA. Daí a bateria Q.
2. **Nunca procurar texto em `document.body.innerHTML`**: o body inclui o código-fonte dos
   `<script>`, então a busca casa com o próprio código e o teste vira falso positivo.
3. **Scripts de edição que gravam só no fim descartam tudo ao abortar.** Passos reportados como
   "ok" foram perdidos duas vezes. Verificar o arquivo por `grep` DEPOIS de cada patch.
4. **Verificar que o teste pega a regressão**: reverter a correção e confirmar que ele falha.
5. Testes com acesso defensivo — um teste que derruba o executor esconde todo o resto da bateria.
6. Fixtures precisam refletir o app real (`_open:true` na seção de bike, `_updatedAt` dentro do
   blob da nuvem, estado semeado a partir do default real).

---
---

# ARQUITETURA NOVA — MODELO CONTÍNUO (ESPECIFICADO, NÃO IMPLEMENTADO)

> Decidido no fim da Sessão 12, com o usuário. **Nada foi implementado.** Esta seção é a
> especificação acordada; a próxima sessão começa por aqui.

## A decisão

**Eliminar o modelo de Ciclos.** Motivo do usuário: os treinos são dinâmicos e há variáveis fora
do controle dele (faltas, clima, pedal) que exigem regeneração constante. Planejar N semanas
produz um plano que envelhece antes de ser executado.

No lugar:

1. **Histórico único e contínuo.** `state.ciclos` deixa de existir; tudo migra para
   `state.history` / `state.bikeHistory`.
2. **Nada de plano multi-dia.** Existe **um "PRÓXIMO TREINO"** por vez, **sem data**.
3. A série vem da rotação do Perfil (`gerarFilaEstatica` — fila principal + intercaladas), mas a
   **posição é derivada do histórico**, não de um índice guardado.
4. A orientação daquele treino é gerada com o histórico recente, incluindo o intervalo desde o
   último treino.
5. Ao concluir, entra no histórico **com a data do registro** e passa a contar para a próxima
   geração.

## Decisões acordadas

| Ponto | Decisão |
|---|---|
| Aba AGENDA | Vira feed contínuo: card do PRÓXIMO TREINO no topo, histórico cronológico abaixo (treinos e pedais misturados) |
| "Dias sem treino" | Deixa de ser `diasStatus`/"perdido". Vira **intervalo/cadência** calculado das datas do histórico. O bloco ADERÊNCIA morre e vira bloco de cadência |
| Pedal | **Registro autônomo com data própria** (datepicker `dd/mm/aaaa`), gravando direto em `bikeHistory`. Desamarrado do dia do plano. A prescrição de bike morre — não se prescreve o que não se controla |
| Histórico existente | **Fundamental, deve permanecer.** A migração apenas converte do modelo de ciclos para o contínuo. Backup automático antes |
| Pedal na programação | **Fica solto** — entra no histórico, não na programação |

## O conflito pedal × pernas

**O pedal é prioridade máxima.** O usuário só não pedala se houver impedimento fora do controle
dele (frio, chuva). E quando pedala, não treina pernas no mesmo dia.

**Sobre "poupar músculo de ciclismo":** o ciclismo carrega quadríceps, glúteo, posterior e
panturrilha; A/B/C (ombros, costas/bíceps, peito/tríceps) praticamente não tocam nisso. **O
conflito real é só o D.** Não há treino a inventar — são os três que já existem. (Meio-termo
teórico — pernas leve, sem excêntrico pesado — NÃO deve ser prescrito por conta do histórico de
tendão patelar; é decisão para a IA com histórico na mão ou para profissional.)

### Desenho acordado

Interruptor no card do próximo treino, **padrão SIM** (pedal é prioridade):

```
PRÓXIMO TREINO          PEDAL HOJE: [SIM] NÃO

A — OMBROS
↳ D — PERNAS aguarda uma noite sem pedal (12 dias)
```

- **SIM** → a rotação pula D e entrega o próximo de A/B/C.
- **NÃO** → D fica elegível e, se estiver adiado, **fura a fila**.
- **D nunca é perdido** — fica esperando, e o app mostra há quanto tempo.
- **O interruptor é PERSISTENTE**: lembra a última escolha até o usuário mudar. **Sem reset
  diário.**
- **É DADO, não `UI_FIELD`** — vai para a nuvem. A decisão é sobre o usuário, não sobre o
  aparelho; se fosse de tela, marcar NÃO no celular deixaria o desktop mostrando outro "próximo
  treino".
- Se marcar NÃO, treinar D e a noite melhorar: **registra os dois sem reclamar.** O app não
  discute com o que já aconteceu.

### O que a IA analisa (não o app decidindo sozinho)

Dias desde o último D, quantas vezes foi adiado, e o volume de pedal do período. Com isso pode
sugerir "faz 12 dias sem pernas e você pedalou 9 vezes; vale reservar uma noite" — ou o contrário.
**A restrição vai explícita no prompt**, senão a IA prescreve o impossível.

## Etapas propostas (cada uma testável, sem quebrar o app no meio)

1. **Migração de dados** — fundir `ciclos` no histórico único, com backup automático antes. Nenhuma
   mudança de UI.
2. **Próximo treino** — rotação derivada do histórico + card, convivendo com o plano atual.
3. **Registro de pedal autônomo** — desamarrar do dia do plano.
4. **Nova Agenda** — feed contínuo substituindo a visão de semanas.
5. **Remoção do plano multi-dia** — só depois que tudo acima estiver de pé.

## Footprint da mudança (medido)

| Conceito | Ocorrências no `index.html` |
|---|---|
| `state.plano` | 614 |
| `semanas` | 182 |
| `diasExpandidos` | 136 |
| `dataInicio` | 96 |
| `diasStatus` | 94 |
| `diasBike` | 57 |
| `planoRascunho` | 40 |
| `state.ciclos` | 26 |

**Não é uma sub-versão — é uma reescrita do núcleo.**

---

## BUGS E PENDÊNCIAS EM ABERTO (fim da Sessão 12)

1. **Layout da aba PLANO no celular (PWA) está quebrado** — funciona no desktop. Aguardando print
   do usuário para diagnóstico; "quebrado" pode ser o chat, a tabela de semanas ou os botões.
2. **Carimbo do cabeçalho a 411px** — nunca conferido no celular. Se transbordar, a saída barata é
   cortar o ano (`⟳ 30/07 22:15`).
3. **Não testado no aparelho:** campo BPM, EDITAR RIDE, máscara de tempo, blocos novos do contexto
   da IA (v0.9.1.54 → .62).
4. **GitHub Pages** — subir a v0.9.1.62.
5. **Câmara alternativa** (não-tubeless) — pendente desde a Sessão 11, escopo nunca especificado.
6. **Conflito multi-aparelho offline em paralelo** — agora é DETECTADO e resolvível pela interface,
   mas nunca foi exercitado com dois aparelhos reais editando de verdade.


---
---

# SESSÃO 13 — MODELO CONTÍNUO (v0.9.1.63 → v0.9.1.73 · SW treino-v531 → v540)

> **Este é o estado atual do app.** Tudo abaixo é o comportamento DEPOIS da migração
> (`state._migracaoContinuoV1`). Antes dela, o app segue exatamente como descrito nas seções
> antigas — nada foi removido do caminho pré-migração.

## Por que o modelo de ciclos morreu

Decisão do usuário: os treinos são dinâmicos e há variáveis fora do controle dele (faltas, clima,
pedal) que exigem regeneração constante. **Planejar N semanas produz um plano que envelhece antes
de ser executado.**

## A migração (v0.9.1.63 → .67)

`abrirMigracaoContinuo()` — **a operação mais destrutiva do app.** Roda uma vez, é irreversível, e
o que está em jogo é todo o histórico de treino.

Sequência, em que nenhuma mutação acontece antes da verificação:

1. conta tudo ANTES e **mostra os números** antes de confirmar
2. baixa backup JSON — se falhar, aborta sem tocar em nada
3. monta os arrays novos **em memória**, sem tocar no `state`
4. verifica: contagem bate **E** todo id de origem está presente
5. só então grava, deleta `state.ciclos` e marca a flag

> **Não mexer na tela NÃO torna uma migração segura — torna um erro INVISÍVEL.** Foi testado
> sabotando o resultado de propósito (perdendo um registro): abortou, dados intactos, flag não
> marcada. Uma guarda que nunca falhou de verdade é decorativa.

- **Se apresenta sozinha no boot** (800ms após carregar), quando há ciclos a migrar. Não fica
  escondida em menu — ver "Lições caras" no topo.
- `_limparResiduosDeCiclo()` alinha quem migrou nas versões .63/.64 (que ainda gravavam `_ciclo`
  nos registros). Idempotente.
- `encerrarCiclo()` fica **bloqueado** depois da migração: recriaria `state.ciclos` e
  re-arquivaria o histórico, desfazendo tudo em silêncio.
- **Nada de `_ciclo` sobrevive** — nem no registro, nem na tela, nem no prompt da IA. A ideia de
  manter o rótulo como "procedência" foi abandonada: procedência de quê, se o conceito não existe?

## Próximo treino (v0.9.1.68 → .69)

```
[hoje]  PRÓXIMO   A — OMBROS                              PEDAL [SIM]
        TREINO    ↳ D — PERNAS aguarda uma noite sem pedal (14 dias)
                  Último registrado: C — PEITO / TRÍCEPS, há 1 dia
                  [⬤ REGISTRAR A]  [🚲 REGISTRAR PEDAL]
```

### A posição é DERIVADA do histórico, nunca guardada

`_estadoRotacao()` percorre `state.history` **do mais antigo ao mais recente** reproduzindo os
contadores de intercalada. Não basta olhar o último treino: uma intercalada entra "a cada N
treinos da fila principal", e isso depende de quantos principais se passaram desde a última.

> Um ponteiro em `state` desanda em silêncio: basta um registro editado, removido ou vindo do
> outro aparelho para apontar para o lugar errado, e nada na tela denuncia.

**Config do usuário HOJE: fila linear `A,B,C,D` SEM intercalada.** Ele usava D intercalado antes
de começar a pedalar. **Verificado:** sem intercaladas, a repetição se reduz a "o próximo depois
do último feito" (cada sessão sobrescreve a posição), então o histórico produzido sob a config
antiga NÃO contamina a rotação nova. Testes AC1/AC2.

Funções: `_serieDePernas()`, `_estadoRotacao()`, `_serieNaFila(rot, pular)`, `_ultimoTreino(label)`,
`_diasDesde(label)`, `_proximoTreino()`.

### O conflito pedal × pernas

**Pedal é prioridade máxima** — o usuário só não pedala por impedimento fora do controle dele
(frio, chuva). E quando pedala, não treina pernas no mesmo dia.

Sobre "poupar músculo de ciclismo": o ciclismo carrega quadríceps, glúteo, posterior e panturrilha;
A/B/C praticamente não tocam nisso. **O conflito real é só o D** — não há treino a inventar, são os
três que já existem. (Meio-termo — pernas leve, sem excêntrico pesado — **não** deve ser prescrito
por conta do histórico de tendão patelar.)

- **`state.pedalHoje`**, padrão **SIM**. Com SIM, a série de pernas é **PULADA, nunca perdida**:
  continua na frente e entra na primeira noite sem pedal. O card mostra há quantos dias espera.
- **É DADO, não `UI_FIELD`** — sobe para a nuvem. Se fosse de tela, marcar NÃO no celular deixaria
  o desktop mostrando outro próximo treino.
- **Persistente, sem reset diário** — lembra a última escolha até o usuário mudar.
- Marcou NÃO, treinou D e a noite melhorou? **Registra os dois sem reclamar.** O app não discute
  com o que já aconteceu.
- `_serieDePernas()` identifica **pelo NOME** (`/perna|quadr|leg/i`), com fallback para o rótulo
  `D`: o rótulo é configurável e pode mudar.

### O que a IA analisa (não o app decidindo)

Dias desde o último D, quantas vezes foi adiado, volume de pedal do período. **A restrição precisa
ir explícita no prompt** — ainda NÃO foi feito (ver pendências).

## Agenda contínua (v0.9.1.70 → .72)

`renderAgendaContinua(list)` substitui a visão de semanas depois da migração.

> **Por que não podem coexistir:** o card deriva da ROTAÇÃO (último feito → o seguinte da fila),
> o plano antigo tem DATAS fixas decididas semanas atrás. Os dois estavam certos dentro da própria
> lógica e discordavam na tela — o app afirmava duas coisas contraditórias sem dizer qual valia.

- Feed cronológico de `history` + `bikeHistory`, os 60 mais recentes, treinos e pedais juntos.
- **Usa os componentes existentes**: `.agenda-dia` (+ `concluido` / `bike-dia`),
  `.agenda-dia-label` (dia/data/hora), `.agenda-dia-serie`, `.agenda-dia-tipo`.
- Datas relativas: `HOJE`, `ONTEM`, senão o dia da semana.
- **Cards de treino expandem** mostrando exercício, séries, carga, descanso e o ponto de status.
  `toggleAgendaEx(id)` usa prefixo **`ag-ex-`** — a aba HISTÓRICO usa `hist-ex-` para os mesmos
  ids, e as duas telas coexistem no DOM; prefixo compartilhado abriria o card da outra aba.
- **✎ editar e ✕ remover** em cada card, com `event.stopPropagation()` para não abrir o detalhe.
- `removeHistoryEntry` e `removeBikeHistoryEntry` passaram a chamar `renderAgendaLinear()`.

## Registro no modelo contínuo (v0.9.1.73)

> **Bug crítico encontrado ao fechar a sessão:** `finishSerieFromAgenda` só é alcançável de dentro
> do card de dia do PLANO. Depois da migração aquele card não é renderizado — **o app ficou sem
> nenhuma forma de registrar treino ou pedal.** Corrigido na mesma versão.

**`abrirRegistroTreino(labelForcado?)`** — série vem da rotação, exercícios da Biblioteca, todos
marcados como feitos por padrão (caso comum; desmarca-se o que não saiu). Data e hora editáveis
(`dd/mm/aaaa` + máscara de tempo). Grava em `state.history` com `variant: 'Contínuo'`.
**A rotação avança sozinha** — ela deriva do histórico.

**`abrirRegistroPedal()`** — Etapa 3. Pedal autônomo, **sem dia de plano**, com data própria e
todos os campos (km, tempos, velocidade, elevação, kcal, **BPM**, foco, percurso). Unidades
sanitizadas, máscara de tempo aplicada. A prescrição de bike por dia de plano **morreu**: não se
prescreve o que não se controla.

## Estado do plano de etapas

| Etapa | Estado |
|---|---|
| 1 — Migração de ciclos | ✅ v0.9.1.63–.67 |
| 2 — Próximo treino | ✅ v0.9.1.68–.69, registro em .73 |
| 3 — Pedal autônomo | ✅ v0.9.1.73 |
| 4 — Nova Agenda | ✅ v0.9.1.70–.72 |
| 5 — Remover plano multi-dia | ❌ **NÃO FEITO** |

---

## SUÍTE DE TESTES

**439 testes em jsdom.** Arquivos em `/home/claude/`: `harness.js` + `testes_sync.js`. **Não fazem
parte do `index.html`.** Rodar: `node testes_sync.js` (~40s).

Baterias A–V descritas na Sessão 12. Acrescentadas na Sessão 13:

| Bloco | Cobre |
|---|---|
| W | Migração para histórico contínuo (contagem, backup, verificação, idempotência) |
| X | Aba HISTÓRICO após a migração (filtros de ciclo somem) |
| Y | Ciclo eliminado de verdade (sem `_ciclo`, sem `state.ciclos`, sem `[Ciclo N]` no prompt) |
| Z | Migração não pode ser desfeita por acidente (`encerrarCiclo` bloqueado) |
| AA | A migração se apresenta sozinha no boot |
| AB | Rotação derivada do histórico + interruptor PEDAL |
| AC | Config LINEAR ABCD e troca de configuração |
| AD | Agenda contínua e rótulo do último treino |
| AE | Feed com detalhe e ações |
| AF | Registro de treino e pedal no modelo contínuo |

**Fixtures precisam de estado REAL** (`carregarApp` → `JSON.stringify(state)` como semente):
`series: []` montado à mão faz o `switchTab` do boot lançar em `state.series[0].id`, e a exceção
aborta o boot inteiro.

---

## PENDÊNCIAS — FIM DA SESSÃO 13

### Esperando decisão do usuário (perguntado, não respondido)

1. **Botão LIMPAR HISTÓRICO ATUAL** — é a última coisa que só existe na aba HISTÓRICO. É do modelo
   velho: "apaga o histórico do ciclo atual" não significa nada num histórico contínuo, e hoje
   apagaria **tudo**, incluindo o que veio dos ciclos migrados. Opções apresentadas:
   (a) eliminar de vez (o ✕ por registro já cobre); (b) mover para o menu com nome honesto
   ("APAGAR TODO O HISTÓRICO") e confirmação forte. **Com isso decidido, a aba HISTÓRICO pode ser
   removida** — o feed da agenda absorveu expansão, ✎ e ✕.

### Trabalho identificado, não feito

2. **Etapa 5 — remover a geração de plano multi-dia.** A aba PLANO ainda gera planos de N semanas.
   `state.plano`, `semanas`, `diasStatus`, `diasBike`, `dataInicio`, `planoRascunho` continuam
   existindo e sendo escritos.
3. **`_textoAderencia()` lê `plano.diasStatus`** — morre no modelo contínuo. Deve virar bloco de
   **cadência/intervalos** calculado das datas do histórico (decidido com o usuário, não feito).
4. **A restrição pedal × pernas ainda NÃO vai no prompt da IA.** Sem isso ela prescreve o
   impossível. Também falta ela analisar/sugerir sobre adiamentos empilhados de pernas.
5. **`gerarOrientacoesDiasFuturos`** ainda opera sobre dias futuros do plano — precisa virar
   geração de orientação para **um** treino.
6. **Bloco de cobertura da IA** ainda menciona ciclos no caminho pré-migração (correto), mas a
   contagem de janelas deve ser revista quando o plano sair.

### Nunca testado no aparelho

7. Migração no celular (o usuário deve fazer **EXPORTAR manual antes**, além do backup automático).
8. BPM, EDITAR RIDE, máscara de tempo, registro contínuo, feed novo.
9. **Carimbo do cabeçalho a 411px** — pendente desde a v0.9.1.43.

### Antigas, ainda abertas

10. **Layout da aba PLANO no celular está quebrado** — nunca diagnosticado (faltou print). Pode
    deixar de importar se a Etapa 5 remover a aba.
11. **GitHub Pages** — subir a v0.9.1.73.
12. **Câmara alternativa** (não-tubeless) — pendente desde a Sessão 11, escopo nunca especificado.
13. **Conflito multi-aparelho offline em paralelo** — detectável e resolvível pela interface, nunca
    exercitado com dois aparelhos reais.


---
---

# SESSÃO 14 — v0.9.1.73 → v0.9.2.14 (SW `treino-v540` → `treino-v581`)

> **Esta seção descreve o app que existe hoje.** A Sessão 13 descreve a migração do modelo de
> ciclos para o contínuo; esta descreve o que foi construído sobre ela — e o que foi eliminado.
>
> **44 versões.** A sessão começou fechando pendências da 13 e terminou reescrevendo o fluxo do
> próximo treino a pedido do usuário.

---

## VERSÃO ATUAL (fim da Sessão 14)

| | |
|---|---|
| `index.html` | **v0.9.2.14** |
| `sw.js` | **treino-v581** |
| Modelo | Contínuo (migração concluída e testada pelo usuário) |
| Abas | AGENDA · TREINO (séries) · BIBLIOTECA · CORE · BIKE · PERFIL |
| Abas eliminadas | **PLANO** e **HISTÓRICO** (só existem antes da migração) |

---

## O QUE FOI ELIMINADO NESTA SESSÃO

| Elemento | Versão | Motivo |
|---|---|---|
| Botão `LIMPAR HISTÓRICO ATUAL` | .75 | Dizia "ciclo atual", `clearHistory()` fazia `state.history = []`. Rótulo mentia. O ✕ por registro cobre o caso real. |
| Aba **HISTÓRICO** | .75 | Sem nada exclusivo depois da migração; o feed da AGENDA absorveu expansão, ✎ e ✕. Renderizada só se `!_migracaoContinuoV1`. |
| Aba **PLANO** | .78 | Era casa de duas coisas: o plano de N semanas e o chat. O plano morreu; o chat mudou de casa. |
| Capacidades de plano no system prompt | .82 | Gerar plano macro, modificar dias, dia perdido, bike por dia de plano. |
| `get_plano_macro`, `get_ciclo_anterior` | .82 | Ferramentas que só podiam responder "Nenhum plano ativo". |
| Botão **MESCLAR** e suas 3 funções | .06 | Nasceu de um caso pontual (v.80) e o usuário não mantém backups paralelos. |

**Não foi eliminado:** as ~87 funções / 4.996 linhas (27% do arquivo) que leem `state.plano`.
Elas **são o caminho pré-migração**, não código morto. Ver "O VARRIMENTO QUE NÃO SE FAZ".

---

## FLUXO DO PRÓXIMO TREINO (a arquitetura central da Sessão 14)

Especificado pelo usuário em três passos. **A rotação propõe, o usuário decide, a IA projeta.**

### Estados do card

| Estado | O que mostra | Botões |
|---|---|---|
| **EM ABERTO** | `Pela ordem da fila, a vez seria de X` · carga de pedal 7d · dias sem pernas · último registrado | `✦ AVALIAR` · `ESCOLHER SÉRIE` · `🚲 REGISTRAR PEDAL` |
| **DECIDIDO** | Série + motivo da IA (ou "Escolhido por você") + painel da projeção | `⬤ REGISTRAR X` · `✦ PROJETAR TREINO` / `↺ REPROJETAR` · `↺ REABRIR` |

### `state.proximoDecidido`

```js
{
  label: 'C',
  motivo: 'texto da IA',
  origem: 'ia' | 'usuario',
  em: ISO,
  treino: {                       // só depois de PROJETAR
    foco: '...', observacoes: '...',
    exercicios: [ { nome, sets, weight, rest, obs, status } ]
  }
}
```

- **Vive em `state` e sincroniza.** É decisão sobre treino, não preferência de tela: definir no
  celular tem de valer no desktop.
- **Sai sozinha no registro do treino.** A partir daí quem manda é o histórico.
- **`_serieDecidida()` valida contra o Perfil**: série apagada → card volta a EM ABERTO.
- **Trocar a série apaga `treino`** — projeção é de UMA série; mantê-la mostraria cargas de outro
  treino sob o rótulo novo.

### Funções

| Função | Papel |
|---|---|
| `_serieDecidida()` | Decisão válida ou `null` |
| `_aplicarDecisaoTreino(label, motivo, origem)` | Grava a decisão (sem `treino`) |
| `limparDecisaoTreino()` | ↺ REABRIR |
| `abrirEscolhaSerie()` | Escolha manual — **existe sem passar pela avaliação** |
| `avaliarProximoTreino()` | Chamada à IA → `{"proximoTreino":{"serie","motivo"}}` |
| `_confirmarSugestao(serie, motivo)` | Modal APLICAR / ESCOLHER OUTRA |
| `_aplicarSugestaoPendente()` | Consome `_sugestaoPendente` |
| `projetarTreino()` | Chamada à IA → `{"treinoProjetado":{...}}` |
| `_painelProjecao(dec)` | Painel editável |
| `_projMutar/_projEditarCampo/_projMover/_projRemover/_projAdicionar/_projStatus` | Edição |
| `ajustarProjecaoChat()` | Chat inline sobre a projeção |
| `_exerciciosDaSessao(serie)` | Lista que o registro consome |
| `_catalogoDaSessao(serie)` | Exercícios da série **+ os de Core** |

### Painel da projeção (v.02 / .03)

Nasce aberto. Por exercício: **ponto de status** (`○` pendente → `●` feito → `✕` pulado → `○`),
**↑↓** reordenar, campos editáveis de **sets / carga / descanso**, **✕** remover. Abaixo:
seletor `+ ACRESCENTAR DO CATÁLOGO` e campo de **chat inline**.

- Edita `state.proximoDecidido.treino` **direto**, sem cópia intermediária — é a mesma fonte que
  o registro lê.
- `_projEditarCampo` **não redesenha**: o input está em foco e um re-render tiraria o cursor.
- O chat devolve a **projeção inteira**, não ações de diff — evita o "substituir" que não acha o
  alvo e falha em silêncio. **Não tem memória**: cada pedido é isolado.

### Regra confirmada pelo usuário

> "Somente quando eu bato em REGISTRAR é que o que eu fiz e o que eu não fiz deve ser registrado."

Os pontinhos do painel são **intenção**. Não há treino no histórico até o REGISTRAR. Proposta de
um botão CONCLUIR TREINO no painel foi **descartada**.

### O card é editável antes do registro — o modal não precisa ser

O modal REGISTRAR mostra sets e carga como `<span>`, não `<input>`. Proposta de torná-los
editáveis foi **descartada**: o ajuste acontece no painel da projeção, antes de registrar.

---

## CONTEXTO ENVIADO À IA (reescrito nesta sessão)

### `_contextoTreino()` — FONTE ÚNICA (v.97)

`AVALIAR` e `ORIENTAÇÃO` decidem sobre o mesmo treino e montavam contexto em lugares diferentes:
a avaliação recebia só bike, a orientação recebia tudo, e a janela de bike divergia (30 × 120).

Agora um só montador: `_textoCobertura(24,120,120)` · `_textoHistorico(24)` ·
`_textoProgressaoCargas(120,8)` · `_textoCore(120,8)` · `_textoBike(120,10)`.
Cada bloco em `try` individual — um falhando não zera o contexto.

**O que pode diferir entre as chamadas é a TAREFA, nunca o que se sabe ao decidir.**

### `_textoRotacao()` — estado da rotação (v.74, revisto até .96)

```
ESTADO DA ROTAÇÃO (modelo contínuo — a posição é derivada do histórico):
  Fila principal: A → B → C → D
  Vez pela ordem da fila: C — PEITO/TRÍCEPS   (é só a saída da fila — NÃO é recomendação nem decisão)
  Último registrado: B — COSTAS, há 1 dia(s)
  Dias desde o último treino de cada série: A 4d · B 1d · C 7d · D 16d
  CARGA DE CICLISMO RECENTE — 3d: 2 ride(s), 50 km | 7d: 3 ride(s), 85 km | último ride há 1 dia(s)
  PEDAL HOJE: NÃO
  Série de pernas (D — PERNAS): último registro há 16 dia(s)

RESTRIÇÃO PEDAL × PERNAS (absoluta — decisão do usuário, não negociável): ...
```

Vazio antes da migração. Dentro de `try/catch` — entra no system prompt de toda conversa.

**Decisões de redação que custaram três rodadas cada:**

1. **Não rotular como "Próximo treino".** Entregar um vencedor no topo fazia a IA ancorar nele e
   usar o resto do texto para justificar.
2. **Dias desde o último treino de CADA série.** Sem comparação, "16 dias" não tem escala.
3. **Carga de ciclismo em duas janelas** (3d e 7d) + dias desde o último ride.
4. **`PEDAL HOJE = NÃO` é argumento A FAVOR de pernas**, e "nenhum dado contraindica adiar" não é
   razão para adiar — exige razão positiva.
5. **Nenhum intervalo fixo de recuperação.** Deriva do cruzamento ride × pernas do histórico.
6. **`PEDAL HOJE: SIM (ride de hoje JÁ REGISTRADO...)`** — distingue intenção de fato.

### `_textoCadencia(90)` — substitui a aderência (v.76)

```
CADÊNCIA DE TREINO (últimos 90 dias — não há plano a cumprir, então não existe percentual):
  Musculação: 12 sessões (0,9/semana) · últimos 30 dias: 8
  Intervalo entre sessões: mediana 3 dia(s), maior 20 dia(s)
  Distribuição por série: A 3 · B 3 · C 3 · CORE 1 · D 2
  Último treino: 04/08 (há 1 dia(s))
  Pedais no mesmo período: 3
  Maiores paradas: 20 dias (26/06 → 16/07); 9 dias (22/07 → 31/07)
```

- **Mediana, não média** — uma viagem de duas semanas distorce a média.
- **Paradas com datas** — permite a IA perguntar o que houve.
- Intervalos por **dia local** (`setHours(0,0,0,0)`).
- `_textoAderencia()` virou **dispatcher**: migrado → `_textoCadencia(90)`.

### `_notacaoCargas()` — as cinco formas (v.13 / .14)

O campo `weight` é **texto livre**. `_textoProgressaoCargas` repassa como string, sem converter —
por isso nada quebrou; o que faltava era a IA saber ler.

| Forma | Significado |
|---|---|
| `22kg` | Carga única |
| `3 pesos` | **Placas da máquina**, não quilos. NUNCA converter nem inventar equivalência |
| `18-20-22kg` / `18-20kg` | **Progressão executada** na sessão. Não é faixa nem média |
| `... cada lado` | Vale para UM lado; total é o dobro. **Ausência ≠ bilateral** — o usuário só anota quando não é óbvio. Não acrescentar onde não aparece |
| `Peso corporal` | Sem carga externa. Não substituir por número |

**Regra geral:** usar a notação do **registro mais recente** daquele exercício, incluindo unidade
e qualificadores. Nunca converter nem normalizar.

### `getPLANO_SYSTEM()` — dois ramos (v.82)

Migrado (~2.385 chars, contra 4.334 do antigo): **"NÃO EXISTE PLANO"** + 4 capacidades —
orientar próximo treino (texto), modificar exercícios da Biblioteca (JSON), ciclismo (texto),
conversa normal. Periodização expressa em relação ao histórico, nunca em "Dia 12"/"Semana 3".

### `projetarTreino()` — regras de seleção (v.00 → .04)

- A lista é **catálogo, não sessão**. Selecionar, devolver **na ordem de execução**.
- **QUANTOS: a decisão é da IA, vinda dos OBJETIVOS.** O histórico é **referência, não regra**.
  Declarar explicitamente se **REDUZ, MANTÉM ou AUMENTA** volume (exercícios *e* séries) e por quê.
- **CORE é complementar**, não conta para a contagem principal, entra ao final, e não pode ser
  cortado em silêncio.
- Se a série foi **forçada pelo usuário**: projetar como pedido, sem discutir; a fadiga aparece na
  **carga e nas observações**, não como recomendação de trocar de treino.
- Exercício que não bate com o catálogo é **descartado**; aviso se vierem >10.

---

## AGENDA — FEED (v.88 / .90)

### Barra ACRESCENTAR

`ACRESCENTAR [ + TREINO ] [ 🚲 + PEDAL ]` no topo do feed, **inclusive com feed vazio**.

Motivo: registrar só era possível pelos botões do card PRÓXIMO TREINO — um card sobre o que
**vem**. Lançar um pedal de ontem por ali é procurar o passado dentro do futuro.

### Agrupamento por semana e mês

```
AGOSTO 2026
▾ ESTA SEMANA  03/08 – 09/08     2 treinos · 1 pedal · 33 km
▸ 20/07 – 26/07                  2 treinos · 1 pedal · 33 km
```

- **Semana civil** (segunda a domingo), via `getMondayOf`.
- **Só a semana corrente nasce aberta.**
- Cabeçalho de mês pelo mês da segunda-feira.
- **`_semanasAbertas` vive em JS, fora de `state`** — preferência de tela; em `state` viraria dado
  de sync. Custo: perde-se no reload.
- Limite de 120 registros.

### Todo treino registrado fica verde (v.87)

`var completo = true`. A regra `done >= total` era herdada do plano. No modelo contínuo o registro
só existe porque o treino aconteceu.

---

## BIBLIOTECA SEGUE O HISTÓRICO (v.13)

`_sincronizarBiblioteca(exercises)`, chamada em `_aplicarRegistroTreino`.

A Biblioteca guardava a carga de cadastro e nunca mudava — o registro copiava dela e a mão voltava
vazia. Uma polia migrada para pesos ficaria eternamente "22kg", e toda projeção partiria dali.

- **Só exercícios com `status === 'done'` atualizam.** Um pulado herdou o valor exibido sem ter
  sido executado.
- Resolve por nome em **todas as séries**, inclusive a de Core.
- Atualiza `weight`, `sets` e `rest`.

---

## MÓDULO BIKE — SESSÃO 14

### Prompt do odômetro após o ride (v.09)

Após registrar pedal: modal `ATUALIZAR ODÔMETRO?` com total e parcial, antes → depois.

- **Pergunta depois de o ride estar salvo** — recusar não pode desfazer o registro.
- **`rideId` na leitura** impede somar duas vezes.
- **Data da leitura é a DO RIDE**, não a de agora — senão um pedal de ontem insere ponto de hoje
  na série que alimenta a estimativa de km/dia.
- Não aparece: sem odômetro configurado, ride sem distância, ou distância zero.

### Piso em zero na correção do parcial (v.10)

`bikeAtualizarParcialAplicarCorrecao` aceitava qualquer delta: total 5 com delta −30 gravava
**−25 km**, calado. Agora recusa e informa a redução máxima. **Duas defesas** — na tela e dentro
do aplicador, que entra por `onclick`.

**Caminhos de descida testados e funcionando:** parcial menor → 3 opções (DIGITEI ERRADO /
ZERADO NÃO REPORTADO / **LEITURA ANTERIOR ERRADA** → delta negativo, total desce). Correção manual
e soma automática do ride **coexistem sem se anular**.

### Zero drip-wax top-offs (v.11)

Três barreiras: `min="1"`, `v <= 0` na validação, e **cinco leitores com `|| 2`**.

> **`x || padrão` é armadilha em todo campo numérico onde ZERO é escolha legítima.** O valor seria
> salvo, o toast confirmaria, e nada mudaria. Criado `_maxTopoffs()`. O mesmo padrão continua em
> `correnteIntervaloImersaoKm || 400` e `correnteExtensaoTopoffKm || 150`.

### Vida útil da corrente com rodízio (v.12)

**Modelo do usuário:** cada corrente mantém a própria vida útil (uma RED/FORCE pode durar o dobro
de uma RIVAL). Enquanto há rodízio, cada corrente acumula **1/N** do que a bicicleta roda. A
projeção **assume que o rodízio continua** — corrente que acaba é substituída. Só muda se o
rodízio for **aposentado**.

| Função | Papel |
|---|---|
| `_bikeRodizioN()` | Correntes `ativa`+`espera`, ou 1 se `rodizioAtivo === false` |
| `_bikeCorrenteExpectativa(c)` | `c.expectativaKm`, caindo no global só como padrão |
| `_bikeCorrenteDataEstimada(c, kmRestante)` | `dias = kmRestante × N / médiaKmDia` |
| `bikeRodizioTogglePrompt/Aplicar` | Aposentar / reativar |

- **Corrente em espera passou a ter previsão** — `if (status === 'ativa')` a deixava sem data.
- Os 4 sítios de cálculo da corrente migraram para o helper. Os **10 outros componentes**
  (rolamento, freio, cubo, freehub, disco, cassete, coroa, pneu, raios) ficam intactos: não saem
  da bike.
- Testado a 30 km/dia: RIVAL com 3000 km restantes → 200 dias (N=2) contra 100 (N=1).

**PowerLock:** conta **montagens**, não km. Incrementa em cadastro+ativação, ATIVAR, e cada
imersão. Contador por corrente, limite compartilhado (padrão 7).

---

## CORREÇÕES DE DADOS E DE TEMPO

### Duração aceita segundos (v.89)

`_mascaraTempo` corta em 4 dígitos (feita para HORA). Aplicada a duração, `1:15:30` virava os
dígitos `11530` → `1153` → **`11:53`**. Não era perda de segundos: era **corrupção**.

- **`_mascaraDuracao`** nova, até 6 dígitos: 3-4 → `h:mm`, 5-6 → `h:mm:ss`.
- `_normalizaDuracao` preserva segundos.
- **O parser de minutos** casava só `^(\d+):(\d{2})$` — `1:15:30` caía no `_num` e virava
  **1 minuto**. O volume de pedal enviado à IA estava uma ordem de grandeza menor.

**Risco no dado existente:** só registros **editados** desde a v0.9.1.56 (a máscara reformata ao
digitar, então digitar com segundos sempre foi visível; `_normalizaDuracao` rodava na gravação
sobre campos não tocados). O usuário confirmou que os registros estão corretos.

### Dias de calendário, não horas (v.93)

`_ultimoTreino` fazia `Math.floor((Date.now() - t) / 86400000)` — mede **horas decorridas**.
Treino às 22h de ontem, consultado às 10h: 12 h → `floor` 0 → **"hoje"**.

Contaminava `_diasDesde` → `diasSemPernas` → tela **e prompt**. Todo registro noturno contava um
dia a menos, enviesando a avaliação para adiar pernas.

### Pedal derivado do registro (v.08)

`_pedalHoje()` = ride registrado hoje **OU** `state.pedalHoje !== false`. O botão vira
**🔒 SIM** desabilitado. `state.pedalHoje` (intenção) fica intacto; amanhã volta a valer sozinho.

### Calendário nos modais de registro (v.87)

PEDAL e TREINO usavam `input` de texto puro. Agora com `toggleDatepickerInline` /
`datepickerInlineHTML`. **Regra `date-br` do projeto, quebrada na v0.9.1.73.**

---

## BUGS DE INTEGRAÇÃO CORRIGIDOS

| Bug | Versão | Natureza |
|---|---|---|
| Importar backup pré-migração revertia o modelo | .79 | A flag é **dado**; o importador substitui tudo. Aviso explícito com contagens dos dois lados |
| `_moverChatParaAgenda` só sabia ir | .79 | Função que muda a tela por uma flag precisa **desfazer** quando a flag muda. A flag é dado: import ou sync podem alterá-la |
| `render()` não redesenhava a AGENDA | .81 | Migração com a tela montada deixava layout antigo sobre dados novos. Corrigido **na função**, não no chamador |
| `buildPerfilTexto`: `bikeCtx` duplicado e de plano morto | .83 | Entrava **duas vezes** em todo prompt, com dado congelado na migração |
| `get_bike` servindo `diasBike` do plano | .85 | Mesma classe. Migrado passa a responder `_textoBike(120,12)` |
| Prévia de modificações em painel oculto | .86 | `renderModificacoesProposta` escrevia no `plano-resultado`, escondido na .78. Painel inline no chat |
| `JSON.stringify(motivo)` dentro de `onclick="..."` | .99 | `Unexpected end of input`. **Texto livre não trafega por atributo** — vai por variável |
| `abrirRegistroTreino` ignorava a decisão | .92 | Botão dizia REGISTRAR D e lançava a série da rotação |
| Registro listava o catálogo, não a projeção | .03 | 3 funções liam a lista de fontes diferentes. Capturada uma vez em `_registroPendente.exercicios` |
| Core fora do catálogo enviado à IA | .05 | Core vive na série `id:'score'`. **Três rodadas de instrução mandando incluir o que não existia no contexto** |
| `_bikeCorrenteSelecionada()` não existe | .12 | Nome real: `_bikeCorrenteSel()`. `node --check` **não pega** erro de nome |

---

## O PADRÃO QUE MAIS CUSTOU NESTA SESSÃO

> **Quando a IA faz algo sem sentido, a primeira pergunta é: o que exatamente ela recebeu?**

Aconteceu **quatro vezes**:

| Sintoma | Causa real | Rodadas de prompt desperdiçadas |
|---|---|---|
| `get_bike` respondia com semanas de plano | Lia `state.plano.diasBike` | — |
| AVALIAR "não há dados de ciclismo que contraindiquem" | **Não havia mesmo**: `getPLANO_SYSTEM` não tinha km | 3 |
| Core sempre cortado da projeção | Core nunca chegava ao catálogo | 3 |
| 16 exercícios projetados | O prompt mandava "inclua TODOS" | 1 |

**A instrução é a última coisa a mexer, não a primeira.**

### Corolário: constantes minhas disfarçadas de regra do usuário

Três vezes escrevi um número de convenção e o rotulei como se fosse do usuário:

- `"intervalo de 2 a 3 dias"` → ele disse "ex, 2, 3 dias" como **exemplo**
- `"5 a 8 exercícios"` → convenção de manual
- `"mantenha a mesma escala do histórico"` → trocou uma prisão por outra

**Correção padrão:** obrigar a IA a **declarar** o critério que está aplicando e o que nos dados o
sustenta. Critério declarado é discutível; número solto não.

---

## O VARRIMENTO QUE NÃO SE FAZ

**87 funções, 4.996 linhas, 27% do arquivo** leem `state.plano`. **45 não têm guarda.**

**Não remover.** Não é código morto — é o **caminho pré-migração**, correto para qualquer state sem
a flag. Removê-las quebraria o app para esse caso, com ganho estético.

**Mas "não vale remover" ≠ "não vale olhar".** Foi essa confusão que deixou `get_bike` alimentando
a IA com quilometragem indexada por semana de um calendário que não existe.

**Critério certo:** não é *se a função lê `state.plano`*, é *se ela roda no caminho contínuo*.

Auditados e corrigidos: `getPLANO_SYSTEM`, `buildPerfilTexto`, `_textoAderencia`,
`gerarOrientacoesDiasFuturos`, `executarTool/get_bike`, `_textoCobertura` (já estava guardado).

**Ainda vivos, inofensivos hoje:** `enviarMensagemPlano` (grava `planoRascunho` se a IA devolver
JSON de plano) e `renderPlanoMacro` (roda em 5 caminhos, escreve em painel escondido).

---

## `_ajustarTelaAoModelo()` — ponto único de adaptação

Renomeada de `_moverChatParaAgenda` na v.84 — o nome antigo já mentia.

Faz, conforme `_migracaoContinuoV1`, **nos dois sentidos**:
1. Move `#plano-main` entre `#view-ia` e `#view-agenda` (`appendChild`, nunca clone — dois
   `id="plano-input"` fariam `getElementById` escrever no invisível). Na volta, `insertBefore` a
   `.plano-sidebar`, senão o grid inverte.
2. Esconde `qa-novo-ciclo`, `qa-reorganizar`, `qa-orientacoes` (`display = continuo ? 'none' : ''`).
3. Zera e esconde `plano-resultado` e `agenda-hoje`.
4. Esconde `mm-migracao`, `mm-limpar-passados`, `mm-limpar-semanas`.

Chamada no boot, ao fim da migração, e em `_aplicarImportacao`.
CSS: `.plano-main.na-agenda` com `max-height:55vh` no chat.

**Espalhar essas decisões foi o que produziu a aba PLANO vazia com o chat pendurado na agenda:
cada trecho sabia ir, nenhum sabia voltar.**

---

## CABEÇALHO (v.07)

`.header-meta` agrupa versão + `#dbStamp`. Abaixo de 480px `.header-brand` vira coluna:

```
TREINO
v0.9.2.07  ⟳ 05/08 21:14
```

Fecha a **pendência do carimbo a 411px** (aberta desde a v0.9.1.43): a causa era competição por
largura, não tamanho de fonte.

---

## MÉTODO DE TESTE (Sessão 14)

A suíte de 439 testes **não sobreviveu** — vivia em `/home/claude`, recriado a cada sessão.

Método usado, que pegou vários bugs:

```python
# extrai funções do index.html por nome
i = s.index('\nfunction NOME('); j = s.index('\n}\n', i) + 3
```

Depois: `eval()` em Node com stubs mínimos (`state`, `escHtml`, `pushUndo`, `saveState`, `toast`),
e jsdom quando há DOM. Serve para funções puras e para render que só escreve `innerHTML`.

**Validação obrigatória em toda entrega:**
```bash
# sintaxe dos 3 blocos <script>
python3 -c "import re; s=open('index.html').read(); b=re.findall(r'<script[^>]*>(.*?)</script>', s, re.S); open('check.js','w').write(';\n'.join(b))" && node --check check.js
node --check sw.js
grep -oE "^function [A-Za-z_]+" index.html | sort | uniq -c | sort -rn | awk '$1>1'
```

**Acrescentado nesta sessão:** conferir se toda função **referenciada existe**. `node --check` não
pega `_bikeCorrenteSelecionada()` quando o nome real é `_bikeCorrenteSel()`.

---

## APRENDIZADOS DE PROCESSO (Sessão 14)

1. **Dado antes de instrução** — ver "O PADRÃO QUE MAIS CUSTOU".
2. **Não inventar constantes e atribuí-las ao usuário.** Exemplo dele vira exemplo, não regra.
3. **Não inventar cenários.** "alternar correntes toda semana" — ninguém disse isso.
4. **`node --check` não valida nomes.** Conferir referências.
5. **Texto livre nunca em atributo HTML.** Variável de módulo, como `_pendingMod`.
6. **`x || padrão` quebra quando zero é legítimo.**
7. **Função que adapta a tela a uma flag precisa saber desfazer** — flags que são dado mudam por
   import e por sync.
8. **Corrigir na função, não no chamador.** `render()` que não desenha a agenda é `render()`
   incompleto, não chamador esquecido.
9. **Ler o modal inteiro antes de afirmar o que ele faz.** Afirmei que o card não permitia editar
   quando permitia.
10. **Verificar antes de alarmar.** Mandei conferir um mês de registros por um risco que era bem
    mais estreito.
11. **Reaproveitar antes de reescrever.** O card de dia do plano tinha reordenação, chat e
    descanso; escrevi um painel de leitura do zero e chamei de pronto.

---

## PENDÊNCIAS — FIM DA SESSÃO 14

### Nunca testado no aparelho
1. **Tudo da faixa .74 → .14** exceto o que o usuário verificou: layout da agenda (.81), pedal de
   ontem, notações de carga, projeção.
2. **Rodízio de correntes** — lógica testada em Node, nunca com duas correntes reais.
3. BPM, EDITAR RIDE, máscara de tempo, registro contínuo (herdado da Sessão 13).
4. Migração no celular.

### Decisão de arquitetura em aberto
5. **Derivar o modelo do dado em vez da flag.** Se `state.ciclos` não existe, é contínuo. Surgiu
   quando o usuário reclamou — com razão — de o JSON mudar o layout do app. É o mesmo princípio da
   rotação derivada do histórico.

### Comportamento em aberto
6. **A série adiada perde a vez.** Fila linear: pular D custa **uma volta inteira**. Só valeria a
   propriedade "fica na frente" se D fosse **intercalada** (contador). Três caminhos: (a) D vira
   intercalada, (b) guardar a pendência em `state`, (c) derivar do histórico. Atenuado pelo card em
   aberto + ESCOLHER SÉRIE, mas o mecanismo não mudou.
7. **Chat da projeção sem memória** — cada pedido é isolado.
8. `enviarMensagemPlano` / `renderPlanoMacro` ainda alcançáveis (inofensivos).

### Antigas
9. Câmara alternativa — escopo nunca especificado.
10. Conflito multi-aparelho offline — nunca exercitado com dois aparelhos.
11. GitHub Pages desatualizado — o app roda offline, só sobe quando o modelo estiver certo.
12. Suíte de testes a reconstruir.

---

## ARQUIVOS DE TRABALHO (fim da Sessão 14)

- `index.html` — **v0.9.2.14**
- `sw.js` — **treino-v581**
- `CONTEXTO_PROJETO_12.md` — este documento

## REGRA PARA NOVA SESSÃO

Anexar `index.html`, `sw.js` e `CONTEXTO_PROJETO_12.md`.
Nunca trocar de janela no meio de uma conversa — causa perda de contexto.

