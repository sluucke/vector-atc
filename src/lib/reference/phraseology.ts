/**
 * Standard radiotelephony, phase by phase, in both languages a Brazilian
 * position works in.
 *
 * Portuguese follows the DECEA phraseology manual (MCA 100-16); English follows
 * ICAO Doc 9432 / Doc 4444. These are the standard calls, written as a short
 * example exchange — a memory aid on frequency, not a replacement for either
 * manual.
 *
 * Placeholders in braces are filled from the aerodrome on screen, so the
 * examples read with its own runway, frequencies and pressure.
 */

export type Speaker = "atc" | "pil";

export interface Exchange {
  who: Speaker;
  pt: string;
  en: string;
}

export interface PhraseologyPhase {
  id: string;
  label: { pt: string; en: string };
  /** One line on when this phase applies. */
  hint: { pt: string; en: string };
  exchanges: Exchange[];
}

export const PHRASEOLOGY: PhraseologyPhase[] = [
  {
    id: "contato",
    label: { pt: "Contato inicial", en: "Initial call" },
    hint: {
      pt: "Identifique a estação chamada e a sua, e espere o convite para prosseguir.",
      en: "Name the station you are calling and your own, then wait to be invited to go ahead.",
    },
    exchanges: [
      {
        who: "pil",
        pt: "{AD} Solo, {CS}, bom dia.",
        en: "{AD} Ground, {CS}, good day.",
      },
      {
        who: "atc",
        pt: "{CS}, {AD} Solo, prossiga.",
        en: "{CS}, {AD} Ground, go ahead.",
      },
      {
        who: "atc",
        pt: "{CS}, aguarde, chamo de volta.",
        en: "{CS}, stand by, I will call you back.",
      },
    ],
  },
  {
    id: "ifr",
    label: { pt: "Plano de voo IFR", en: "IFR flight plan" },
    hint: {
      pt: "A autorização de plano de voo é sempre cotejada por inteiro.",
      en: "An en-route clearance is always read back in full.",
    },
    exchanges: [
      {
        who: "pil",
        pt: "{AD} Solo, {CS}, posição 12, com a informação Alfa, solicito autorização de plano de voo IFR para SBGR.",
        en: "{AD} Delivery, {CS}, stand 12, information Alpha, request IFR clearance to SBGR.",
      },
      {
        who: "atc",
        pt: "{CS}, autorizado para SBGR via saída padrão {SID}, pista {RWY}, subida inicial 5000 pés, código transponder 4501.",
        en: "{CS}, cleared to SBGR via {SID} departure, runway {RWY}, climb initially 5000 feet, squawk 4501.",
      },
      {
        who: "pil",
        pt: "Autorizado para SBGR via {SID}, pista {RWY}, subida inicial 5000 pés, transponder 4501, {CS}.",
        en: "Cleared to SBGR via {SID} departure, runway {RWY}, climb initially 5000 feet, squawk 4501, {CS}.",
      },
      {
        who: "atc",
        pt: "{CS}, cotejo correto, notifique pronto para o reboque.",
        en: "{CS}, readback correct, report ready for push.",
      },
    ],
  },
  {
    id: "vfr",
    label: { pt: "Plano de voo VFR", en: "VFR flight plan" },
    hint: {
      pt: "O VFR é autorizado a sair da área de controle por um ponto e mantém VFR por conta própria.",
      en: "A VFR flight is cleared out of the control zone via a point and stays VFR on its own.",
    },
    exchanges: [
      {
        who: "pil",
        pt: "{AD} Torre, {CS_VFR}, no pátio de aviação geral, com a informação Alfa, solicito autorização de plano de voo VFR para SBJV, saída pelo setor norte.",
        en: "{AD} Tower, {CS_VFR}, general aviation apron, information Alpha, request VFR clearance to SBJV, departure to the north.",
      },
      {
        who: "atc",
        pt: "{CS_VFR}, autorizado a sair da zona de controle pelo setor norte, manter VFR, altitude 2500 pés, QNH {QNH}, código transponder 4571.",
        en: "{CS_VFR}, cleared out of the control zone to the north, maintain VFR, altitude 2500 feet, QNH {QNH}, squawk 4571.",
      },
      {
        who: "pil",
        pt: "Autorizado a sair pelo setor norte, VFR, 2500 pés, QNH {QNH}, transponder 4571, {CS_VFR}.",
        en: "Cleared out to the north, VFR, 2500 feet, QNH {QNH}, squawk 4571, {CS_VFR}.",
      },
    ],
  },
  {
    id: "pushback",
    label: { pt: "Reboque (pushback)", en: "Pushback" },
    hint: {
      pt: "Informe a posição no pátio; a autorização diz para onde a cauda deve ficar.",
      en: "State the stand; the clearance says which way the aircraft should end up facing.",
    },
    exchanges: [
      {
        who: "pil",
        pt: "{AD} Solo, {CS}, posição 12, solicito reboque e partida dos motores.",
        en: "{AD} Ground, {CS}, stand 12, request push and start.",
      },
      {
        who: "atc",
        pt: "{CS}, reboque e partida aprovados, cauda para o norte.",
        en: "{CS}, push and start approved, face north.",
      },
      {
        who: "pil",
        pt: "Reboque e partida aprovados, cauda para o norte, {CS}.",
        en: "Push and start approved, facing north, {CS}.",
      },
      {
        who: "atc",
        pt: "{CS}, aguarde o reboque, tráfego taxiando por trás.",
        en: "{CS}, stand by for push, traffic taxiing behind you.",
      },
    ],
  },
  {
    id: "taxi",
    label: { pt: "Táxi", en: "Taxi" },
    hint: {
      pt: "A autorização de táxi traz o ponto de espera, o caminho e o QNH.",
      en: "A taxi clearance carries the holding point, the route and the QNH.",
    },
    exchanges: [
      {
        who: "pil",
        pt: "{AD} Solo, {CS}, pronto para taxiar.",
        en: "{AD} Ground, {CS}, request taxi.",
      },
      {
        who: "atc",
        pt: "{CS}, taxie para o ponto de espera da pista {RWY} via taxiway Alfa e Bravo, QNH {QNH}.",
        en: "{CS}, taxi to holding point runway {RWY} via taxiway Alpha and Bravo, QNH {QNH}.",
      },
      {
        who: "pil",
        pt: "Ponto de espera da pista {RWY} via Alfa e Bravo, QNH {QNH}, {CS}.",
        en: "Holding point runway {RWY} via Alpha and Bravo, QNH {QNH}, {CS}.",
      },
      {
        who: "atc",
        pt: "{CS}, mantenha posição, dê passagem ao tráfego pela direita.",
        en: "{CS}, hold position, give way to the traffic from your right.",
      },
      {
        who: "atc",
        pt: "{CS}, cruze a pista {RWY}, notifique livre.",
        en: "{CS}, cross runway {RWY}, report vacated.",
      },
    ],
  },
  {
    id: "decolagem",
    label: { pt: "Decolagem", en: "Take-off" },
    hint: {
      pt: "Só a Torre autoriza a entrar na pista, e a autorização de decolar é cotejada.",
      en: "Only the Tower clears an aircraft onto the runway, and a take-off clearance is read back.",
    },
    exchanges: [
      {
        who: "pil",
        pt: "{AD} Torre, {CS}, no ponto de espera da pista {RWY}, pronto para decolagem.",
        en: "{AD} Tower, {CS}, holding point runway {RWY}, ready for departure.",
      },
      {
        who: "atc",
        pt: "{CS}, alinhe e aguarde, pista {RWY}.",
        en: "{CS}, line up and wait, runway {RWY}.",
      },
      {
        who: "atc",
        pt: "{CS}, vento {WIND}, pista {RWY} autorizado decolar.",
        en: "{CS}, wind {WIND_EN}, runway {RWY} cleared for take-off.",
      },
      {
        who: "pil",
        pt: "Pista {RWY} autorizado decolar, {CS}.",
        en: "Runway {RWY} cleared for take-off, {CS}.",
      },
      {
        who: "atc",
        pt: "{CS}, decolagem cancelada, repito, decolagem cancelada, mantenha posição.",
        en: "{CS}, hold position, cancel take-off, I say again cancel take-off.",
      },
    ],
  },
  {
    id: "saida",
    label: { pt: "Saída e subida", en: "Departure and climb" },
    hint: {
      pt: "A Torre transfere para o Controle; a subida vem em altitude até a TA e em nível acima dela.",
      en: "The Tower hands over to Approach; climb is an altitude up to the TA and a level above it.",
    },
    exchanges: [
      {
        who: "atc",
        pt: "{CS}, contate {AD} Controle {APP}.",
        en: "{CS}, contact {AD} Approach {APP}.",
      },
      {
        who: "pil",
        pt: "{AD} Controle, {CS}, passando 3000 pés, subindo para 5000.",
        en: "{AD} Approach, {CS}, passing 3000 feet, climbing to 5000.",
      },
      {
        who: "atc",
        pt: "{CS}, radar identificado, suba e mantenha nível de voo 150.",
        en: "{CS}, radar identified, climb to flight level 150.",
      },
      {
        who: "atc",
        pt: "{CS}, autorizado direto para {FIX}, notifique estabilizado na rota.",
        en: "{CS}, cleared direct {FIX}, report established on route.",
      },
    ],
  },
  {
    id: "circuito",
    label: { pt: "Circuito de tráfego", en: "Traffic circuit" },
    hint: {
      pt: "O ingresso diz a perna, o lado do circuito e a altitude; o piloto notifica cada perna pedida.",
      en: "The joining instruction gives the leg, the circuit direction and the altitude; the pilot reports each leg asked for.",
    },
    exchanges: [
      {
        who: "pil",
        pt: "{AD} Torre, {CS_VFR}, solicito ingressar no circuito de tráfego para toque e arremetida.",
        en: "{AD} Tower, {CS_VFR}, request to join the circuit for touch and go.",
      },
      {
        who: "atc",
        pt: "{CS_VFR}, ingresse na perna do vento da pista {RWY}, circuito à esquerda, altitude do circuito 1500 pés, QNH {QNH}, notifique perna base.",
        en: "{CS_VFR}, join downwind runway {RWY}, left hand circuit, circuit altitude 1500 feet, QNH {QNH}, report base.",
      },
      {
        who: "pil",
        pt: "{CS_VFR}, perna base.",
        en: "{CS_VFR}, base.",
      },
      {
        who: "atc",
        pt: "{CS_VFR}, número dois, siga o tráfego na final, notifique tráfego à vista.",
        en: "{CS_VFR}, number two, follow the traffic on final, report traffic in sight.",
      },
      {
        who: "atc",
        pt: "{CS_VFR}, vento {WIND}, pista {RWY} autorizado toque e arremetida.",
        en: "{CS_VFR}, wind {WIND_EN}, runway {RWY} cleared touch and go.",
      },
      {
        who: "atc",
        pt: "{CS_VFR}, estenda a perna do vento, notifique final, número três.",
        en: "{CS_VFR}, extend downwind, report final, number three.",
      },
    ],
  },
  {
    id: "chegada",
    label: { pt: "Chegada e aproximação", en: "Arrival and approach" },
    hint: {
      pt: "A descida traz o QNH e o nível de transição; a aproximação, o tipo e a pista.",
      en: "The descent carries the QNH and the transition level; the approach clearance, the type and the runway.",
    },
    exchanges: [
      {
        who: "pil",
        pt: "{AD} Controle, {CS}, nível de voo 150, com a informação Alfa.",
        en: "{AD} Approach, {CS}, flight level 150, information Alpha.",
      },
      {
        who: "atc",
        pt: "{CS}, desça e mantenha altitude 6000 pés, QNH {QNH}, nível de transição {TL}, espere aproximação RNP para a pista {RWY}.",
        en: "{CS}, descend to altitude 6000 feet, QNH {QNH}, transition level {TL}, expect RNP approach runway {RWY}.",
      },
      {
        who: "atc",
        pt: "{CS}, curve à esquerda proa 340, vetoração radar para a perna base da pista {RWY}.",
        en: "{CS}, turn left heading 340, radar vectoring for base leg runway {RWY}.",
      },
      {
        who: "atc",
        pt: "{CS}, autorizado aproximação RNP pista {RWY}, contate {AD} Torre {TWR}.",
        en: "{CS}, cleared RNP approach runway {RWY}, contact {AD} Tower {TWR}.",
      },
      {
        who: "atc",
        pt: "{CS}, entre no circuito de espera sobre {FIX}, nível de voo 120, espere aproximação às 15.",
        en: "{CS}, hold over {FIX}, flight level 120, expect approach at 15.",
      },
    ],
  },
  {
    id: "pouso",
    label: { pt: "Pouso", en: "Landing" },
    hint: {
      pt: "A autorização de pousar traz o vento e é cotejada com a pista.",
      en: "A landing clearance carries the wind and is read back with the runway.",
    },
    exchanges: [
      {
        who: "pil",
        pt: "{AD} Torre, {CS}, na final da pista {RWY}.",
        en: "{AD} Tower, {CS}, final runway {RWY}.",
      },
      {
        who: "atc",
        pt: "{CS}, vento {WIND}, pista {RWY} autorizado pousar.",
        en: "{CS}, wind {WIND_EN}, runway {RWY} cleared to land.",
      },
      {
        who: "pil",
        pt: "Pista {RWY} autorizado pousar, {CS}.",
        en: "Runway {RWY} cleared to land, {CS}.",
      },
      {
        who: "atc",
        pt: "{CS}, continue a aproximação, autorização de pouso a seguir.",
        en: "{CS}, continue approach, expect late landing clearance.",
      },
      {
        who: "atc",
        pt: "{CS}, arremeta, repito, arremeta, tráfego na pista.",
        en: "{CS}, go around, I say again, go around, traffic on the runway.",
      },
    ],
  },
  {
    id: "taxi-chegada",
    label: { pt: "Livrar a pista e estacionar", en: "Vacating and parking" },
    hint: {
      pt: "Livrar a pista é notificado, e só então a Torre transfere para o Solo.",
      en: "Vacating is reported, and only then does the Tower hand over to Ground.",
    },
    exchanges: [
      {
        who: "atc",
        pt: "{CS}, livre a pista pela taxiway Charlie, notifique livre.",
        en: "{CS}, vacate via taxiway Charlie, report vacated.",
      },
      {
        who: "pil",
        pt: "{CS}, livre da pista.",
        en: "{CS}, runway vacated.",
      },
      {
        who: "atc",
        pt: "{CS}, contate {AD} Solo.",
        en: "{CS}, contact {AD} Ground.",
      },
      {
        who: "atc",
        pt: "{CS}, taxie para a posição 12 via taxiway Charlie e Alfa.",
        en: "{CS}, taxi to stand 12 via taxiway Charlie and Alpha.",
      },
    ],
  },
  {
    id: "altimetria",
    label: { pt: "Altimetria", en: "Altimetry" },
    hint: {
      pt: "Abaixo da altitude de transição fala-se altitude com QNH; acima do nível de transição, nível de voo com 1013.",
      en: "Below the transition altitude it is an altitude on QNH; above the transition level, a flight level on 1013.",
    },
    exchanges: [
      {
        who: "atc",
        pt: "{CS}, QNH {QNH}, altitude de transição {TA}.",
        en: "{CS}, QNH {QNH}, transition altitude {TA}.",
      },
      {
        who: "atc",
        pt: "{CS}, nível de transição {TL}, notifique passando.",
        en: "{CS}, transition level {TL}, report passing.",
      },
      {
        who: "atc",
        pt: "{CS}, suba e mantenha nível de voo 150, ajuste altímetro padrão.",
        en: "{CS}, climb to flight level 150, set standard.",
      },
    ],
  },
  {
    id: "emergencia",
    label: { pt: "Emergência e falha de rádio", en: "Emergency and radio failure" },
    hint: {
      pt: "A emergência tem prioridade absoluta; o ATC apenas confirma e desimpede.",
      en: "An emergency has absolute priority; the controller acknowledges and clears the way.",
    },
    exchanges: [
      {
        who: "pil",
        pt: "Mayday, mayday, mayday, {AD} Torre, {CS}, falha de motor, retornando para pouso na pista {RWY}, 120 pessoas a bordo, autonomia de 2 horas.",
        en: "Mayday, mayday, mayday, {AD} Tower, {CS}, engine failure, returning for landing runway {RWY}, 120 persons on board, endurance 2 hours.",
      },
      {
        who: "atc",
        pt: "{CS}, mayday recebido, pista {RWY} livre, vento {WIND}, autorizado pousar, serviço de emergência acionado.",
        en: "{CS}, mayday acknowledged, runway {RWY} is clear, wind {WIND_EN}, cleared to land, emergency services alerted.",
      },
      {
        who: "pil",
        pt: "Pan pan, pan pan, pan pan, {AD} Controle, {CS}, passageiro passando mal, solicito prioridade para o pouso.",
        en: "Pan pan, pan pan, pan pan, {AD} Approach, {CS}, passenger taken ill, request priority for landing.",
      },
      {
        who: "atc",
        pt: "{CS}, se me escuta, transponder ident.",
        en: "{CS}, if you read me, squawk ident.",
      },
      {
        who: "atc",
        pt: "{CS}, transmitindo às cegas, siga o procedimento de falha de comunicação publicado, transponder 7600.",
        en: "{CS}, transmitting blind, follow the published communication failure procedure, squawk 7600.",
      },
    ],
  },
];
