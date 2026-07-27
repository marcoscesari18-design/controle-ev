/* ================================================================
   Controle EV — versão Web/PWA
   Todos os dados ficam no IndexedDB do aparelho (localStorage é lido
   apenas para migrar versões antigas). Backup opcional criptografado
   na nuvem (Gist secreto do GitHub).
   ================================================================ */
'use strict';

/* ---------------- armazenamento (IndexedDB) ----------------
   IndexedDB suporta centenas de MB (fotos à vontade) e resiste
   melhor a limpezas automáticas do que o localStorage antigo.
   Dados de versões anteriores (localStorage) são migrados
   automaticamente na primeira abertura. */
const IDB = {
  db: null,
  abrir() {
    return new Promise((res, rej) => {
      const req = indexedDB.open('controle-ev', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => { IDB.db = req.result; res(); };
      req.onerror = () => rej(req.error);
    });
  },
  get(chave) {
    return new Promise((res) => {
      const tx = IDB.db.transaction('kv', 'readonly').objectStore('kv').get(chave);
      tx.onsuccess = () => res(tx.result === undefined ? null : tx.result);
      tx.onerror = () => res(null);
    });
  },
  set(chave, valor) {
    return new Promise((res, rej) => {
      const tx = IDB.db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(valor, chave);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  },
};

// Leitura do formato antigo (localStorage) — usada só na migração
function lsAntigo(chave) {
  try { const v = localStorage.getItem('cev_' + chave); return v === null ? null : JSON.parse(v); }
  catch (e) { return null; }
}

let meses = null;      // [{id, ano, mes, km, odoIni, odoFim, obs}]
let despesas = null;   // [{id, data, categoria, valor, descricao, local, kwh, reembolso, foto}]
let config = null;
let relatorios = [];   // [{id, tipo, ini, fim, nome, em}]
let rdv = [];          // [{id, data, categoria, valor, descricao, obs, forma, foto}]
let nuvem = null;      // config do backup na nuvem (NUNCA entra no backup exportado)
let ultimoBackupEm = null; // timestamp da última cópia de segurança (manual ou nuvem)

const CONFIG_PADRAO = {
  tarifa_km: 0.76, nome_veiculo: '', placa: '', meta_km_mes: 0,
  custo_energia_casa_kwh: 0, padrao_reembolso: 'pago', tema: 'sistema',
  nome_colaborador: '', // aparece no cabeçalho do relatório RDV
  formas_pagamento: ['Dinheiro', 'Pix', 'Cartão de crédito'],
};

// Categorias específicas do RDV (reembolso pela distribuidora)
const CATEGORIAS_RDV = [
  { id: 'refeicao',       label: 'Refeição',       ico: '🍽️', cor: '#E53935' },
  { id: 'combustivel',    label: 'Combustível',    ico: '⛽', cor: '#FB8C00' },
  { id: 'hospedagem',     label: 'Hospedagem',     ico: '🏨', cor: '#8E24AA' },
  { id: 'pedagio',        label: 'Pedágio',        ico: '🛣️', cor: '#1E88E5' },
  { id: 'estacionamento', label: 'Estacionamento', ico: '🅿️', cor: '#00ACC1' },
  { id: 'outros',         label: 'Outros',         ico: '🏷️', cor: '#546E7A' },
];
const catRdv = (id) => CATEGORIAS_RDV.find((c) => c.id === id) || CATEGORIAS_RDV[5];

const CATEGORIAS = [
  { id:'recarga_fora',  label:'Recarga fora',    ico:'⚡', cor:'#1E88E5' },
  { id:'recarga_casa',  label:'Recarga em casa', ico:'🏠', cor:'#43A047' },
  { id:'revisao',       label:'Revisão',         ico:'🔧', cor:'#FB8C00' },
  { id:'pneus',         label:'Pneus',           ico:'🛞', cor:'#6D4C41' },
  { id:'ipva',          label:'IPVA',            ico:'📋', cor:'#8E24AA' },
  { id:'seguro',        label:'Seguro',          ico:'🛡️', cor:'#00ACC1' },
  { id:'outros',        label:'Outros',          ico:'🏷️', cor:'#546E7A' },
];
const MESES_LABEL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const cat = (id) => CATEGORIAS.find(c => c.id === id) || CATEGORIAS[6];

/* ---------------- utilitários ---------------- */
function fmtMoeda(v) {
  if (v === null || v === undefined || isNaN(v)) return 'R$ 0,00';
  const neg = v < 0; const abs = Math.abs(v);
  const [i, d] = abs.toFixed(2).split('.');
  return (neg ? '-' : '') + 'R$ ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d;
}
function fmtNum(v, casas = 0) {
  if (v === null || v === undefined || isNaN(v)) return '0';
  const [i, d] = Number(v).toFixed(casas).split('.');
  const mi = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return d ? mi + ',' + d : mi;
}
function parseVal(t) {
  if (t === null || t === undefined) return NaN;
  let s = String(t).trim(); if (s === '') return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s); return isFinite(n) ? n : NaN;
}
function fmtData(iso) { if (!iso) return '—'; const p = iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
function hojeISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function mesRef(dataISO) { return dataISO.slice(0, 7); }
function refDe(ano, mes) { return `${ano}-${String(mes).padStart(2,'0')}`; }
function labelRef(ref) { const [a, m] = ref.split('-').map(Number); return `${MESES_LABEL[m-1]}/${a}`; }
function novoId() { return Date.now() + Math.floor(Math.random() * 1000); }
function corVar(nome) { return getComputedStyle(document.documentElement).getPropertyValue(nome).trim(); }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('mostrar');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('mostrar'), 2400);
}

/* ---------------- primeiro uso: começa vazio ----------------
   O app inicia sem nenhum lançamento — apenas as configurações
   padrão (tarifa R$ 0,76/km). As telas têm estados vazios
   amigáveis orientando o primeiro registro. */
function iniciarVazio() {
  meses = [];
  despesas = [];
  relatorios = [];
  rdv = [];
  config = { ...CONFIG_PADRAO };
  salvarTudo();
}
function salvarTudo() {
  // Grava no IndexedDB; se o backup na nuvem estiver ativo, agenda uma cópia
  Promise.all([
    IDB.set('meses', meses), IDB.set('despesas', despesas),
    IDB.set('config', config), IDB.set('relatorios', relatorios),
    IDB.set('rdv', rdv),
  ]).catch(() => toast('⚠️ Falha ao gravar no armazenamento.'));
  agendarBackupAuto();
}

/* ---------------- tema ---------------- */
function aplicarTema() {
  if (!config) return; // ainda inicializando
  const t = config.tema || 'sistema';
  if (t === 'sistema') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('#cfg-tema button').forEach(b => b.classList.toggle('ativa', b.dataset.v === t));
  // Redesenha os gráficos com as novas cores (somente após o app iniciar)
  if (window.appPronto && document.getElementById('tela-inicio').classList.contains('ativa')) renderPainel();
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema);

/* ---------------- navegação entre telas ---------------- */
function irPara(tela) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById('tela-' + tela).classList.add('ativa');
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('ativa', b.dataset.tela === tela));
  window.scrollTo(0, 0);
  if (tela === 'inicio') renderPainel();
  if (tela === 'rdv') renderRdv();
  if (tela === 'historico') renderHistorico();
  if (tela === 'relatorios') renderRelatorios();
  if (tela === 'config') renderConfig();
  if (tela === 'lancar') prepararLancar();
}
document.querySelectorAll('#nav button').forEach(b => b.onclick = () => irPara(b.dataset.tela));

/* ---------------- consultas ---------------- */
function anosDisponiveis() {
  const s = new Set([new Date().getFullYear()]);
  meses.forEach(m => s.add(m.ano));
  despesas.forEach(d => s.add(Number(d.data.slice(0, 4))));
  return [...s].sort((a, b) => b - a);
}
function kmDoMes(ano, mes) { const r = meses.find(m => m.ano === ano && m.mes === mes); return r ? r.km : 0; }
function despesasDoRef(ref) { return despesas.filter(d => mesRef(d.data) === ref); }

/* ---------------- chips genéricos ---------------- */
function renderChips(el, opcoes, valorAtual, onSel) {
  el.innerHTML = '';
  opcoes.forEach(op => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (op.id === valorAtual ? ' ativa' : '');
    b.textContent = (op.ico ? op.ico + ' ' : '') + op.label;
    b.onclick = () => onSel(op.id);
    el.appendChild(b);
  });
  // Mantém o chip selecionado visível (rolagem apenas horizontal)
  const ativo = el.querySelector('.ativa');
  if (ativo) el.scrollLeft = Math.max(0, ativo.offsetLeft - el.clientWidth / 2 + ativo.clientWidth / 2);
}
function chipsAnos(el, atual, onSel) { renderChips(el, anosDisponiveis().map(a => ({ id: a, label: String(a) })), atual, onSel); }
function chipsMeses(el, atual, onSel, comTodos, rotuloTodos) {
  const ops = MESES_ABREV.map((m, i) => ({ id: i + 1, label: m }));
  if (comTodos) ops.unshift({ id: null, label: rotuloTodos || 'Todos' });
  renderChips(el, ops, atual, onSel);
}
function ligarSeg(idSeg, onSel) {
  const seg = document.getElementById(idSeg);
  seg.querySelectorAll('button').forEach(b => b.onclick = () => {
    seg.querySelectorAll('button').forEach(x => x.classList.remove('ativa'));
    b.classList.add('ativa'); onSel(b.dataset.v);
  });
}
function valorSeg(idSeg) { return document.getElementById(idSeg).querySelector('button.ativa').dataset.v; }
function setSeg(idSeg, v) {
  document.querySelectorAll('#' + idSeg + ' button').forEach(b => b.classList.toggle('ativa', b.dataset.v === v));
}

/* ================================================================
   PAINEL (Início)
   ================================================================ */
const hoje = new Date();
let pAno = hoje.getFullYear(), pMes = hoje.getMonth() + 1;

function indicadores(ano, mes) {
  const ref = refDe(ano, mes);
  const km = kmDoMes(ano, mes);
  const dm = despesasDoRef(ref);
  const total = dm.reduce((s, d) => s + d.valor, 0);
  const reemb = dm.filter(d => d.reembolso === 'reembolsado').reduce((s, d) => s + d.valor, 0);
  const porCat = {};
  dm.forEach(d => porCat[d.categoria] = (porCat[d.categoria] || 0) + d.valor);
  // Últimos 12 meses de recarga fora
  const serie12 = [];
  let a = ano, m = mes;
  for (let i = 0; i < 12; i++) { serie12.unshift({ ano: a, mes: m, ref: refDe(a, m) }); m--; if (m === 0) { m = 12; a--; } }
  serie12.forEach(x => {
    x.total = despesas.filter(d => d.categoria === 'recarga_fora' && mesRef(d.data) === x.ref)
      .reduce((s, d) => s + d.valor, 0);
  });
  return {
    km, reembolsoKm: km * config.tarifa_km, total, reemb, pago: total - reemb,
    custoPorKm: km > 0 ? total / km : null, // NUNCA divide por zero
    porCat, serie12,
  };
}

function renderPainel() {
  renderAvisoBackup();
  document.getElementById('painel-veiculo').textContent =
    config.nome_veiculo ? `${config.nome_veiculo}${config.placa ? ' · ' + config.placa : ''}` : 'Seu veículo elétrico';
  chipsAnos(document.getElementById('painel-anos'), pAno, a => { pAno = a; renderPainel(); });
  chipsMeses(document.getElementById('painel-meses'), pMes, m => { pMes = m; renderPainel(); });

  const ind = indicadores(pAno, pMes);
  const kpis = [
    ['KM rodados', fmtNum(ind.km) + ' km'],
    ['Reembolso de KM', fmtMoeda(ind.reembolsoKm)],
    ['Total de despesas', fmtMoeda(ind.total)],
    ['Total reembolsável', fmtMoeda(ind.reemb)],
    ['Pago por mim', fmtMoeda(ind.pago)],
    ['Custo por KM', ind.custoPorKm === null ? '—' : fmtMoeda(ind.custoPorKm)],
  ];
  document.getElementById('painel-kpis').innerHTML =
    kpis.map(k => `<div class="kpi"><div class="r">${k[0]}</div><div class="v">${k[1]}</div></div>`).join('');

  // Meta mensal
  const elMeta = document.getElementById('painel-meta');
  if (config.meta_km_mes > 0) {
    const pct = Math.min(100, ind.km / config.meta_km_mes * 100);
    elMeta.style.display = 'block';
    elMeta.innerHTML = `<div style="font-size:12px;color:var(--text2)">Meta do mês: ${fmtNum(config.meta_km_mes)} km</div>
      <div class="meta-barra"><div style="width:${pct}%"></div></div>
      <div style="font-size:11px;color:var(--text2);margin-top:4px">${fmtNum(pct)}% da meta</div>`;
  } else elMeta.style.display = 'none';

  // Gráficos
  desenharBarras12(ind.serie12);
  desenharPizza(ind);
  desenharComparativo(ind);
  desenharRdvPorCategoria();

  // Últimos lançamentos do mês
  const ult = despesasDoRef(refDe(pAno, pMes)).sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id).slice(0, 8);
  document.getElementById('painel-ultimos').innerHTML = ult.length
    ? ult.map(d => htmlItemDespesa(d, false)).join('')
    : `<div class="card"><div class="vazio"><span class="ico">🧾</span><b>Nenhum lançamento neste mês</b><span>Toque em Lançar para registrar despesas ou quilometragem.</span></div></div>`;
  ligarAcoesDespesa(document.getElementById('painel-ultimos'), () => renderPainel());
  setTimeout(reencaixarRolagem, 0);
}

/* ---------------- gráficos em canvas (sem bibliotecas) ---------------- */
function prepararCanvas(cv, altura) {
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || cv.parentElement.clientWidth;
  const h = altura || cv.clientHeight || 180;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function desenharBarras12(serie) {
  const wrap = document.getElementById('wrap-graf-barras');
  const temDados = serie.some(s => s.total > 0);
  if (!temDados) {
    wrap.innerHTML = `<div class="vazio"><span class="ico">⚡</span><b>Sem recargas fora de casa</b><span>Nenhum gasto nos últimos 12 meses.</span></div>`;
    return;
  }
  if (!wrap.querySelector('canvas')) wrap.innerHTML = '<canvas class="grafico" id="graf-barras"></canvas>';
  const { ctx, w, h } = prepararCanvas(document.getElementById('graf-barras'), 180);
  const max = Math.max(...serie.map(s => s.total)) * 1.15;
  const mEsq = 8, mBaixo = 22, mTopo = 14;
  const areaW = w - mEsq * 2, areaH = h - mBaixo - mTopo;
  const bw = areaW / serie.length * 0.55;
  ctx.font = '9px sans-serif';
  serie.forEach((s, i) => {
    const x = mEsq + areaW / serie.length * (i + 0.5);
    const bh = max > 0 ? s.total / max * areaH : 0;
    const atual = s.ano === pAno && s.mes === pMes;
    ctx.fillStyle = corVar('--primary') + (atual ? '' : '88');
    const y = mTopo + areaH - bh;
    ctx.beginPath(); ctx.roundRect(x - bw / 2, y, bw, bh, 3); ctx.fill();
    ctx.fillStyle = corVar('--text2');
    ctx.textAlign = 'center';
    ctx.fillText(MESES_ABREV[s.mes - 1], x, h - 8);
    if (s.total > 0) {
      ctx.font = '8px sans-serif';
      ctx.fillText(Math.round(s.total), x, y - 3);
      ctx.font = '9px sans-serif';
    }
  });
}

function desenharPizza(ind) {
  document.getElementById('titulo-pizza').textContent = `Despesas de ${MESES_LABEL[pMes - 1]} por categoria`;
  const wrap = document.getElementById('wrap-graf-pizza');
  const entradas = Object.entries(ind.porCat).sort((a, b) => b[1] - a[1]);
  if (!entradas.length) {
    wrap.innerHTML = `<div class="vazio" style="width:100%"><span class="ico">🥧</span><b>Sem despesas neste mês</b><span>Use a aba Lançar para registrar a primeira despesa.</span></div>`;
    return;
  }
  if (!wrap.querySelector('canvas')) {
    wrap.innerHTML = `<canvas id="graf-pizza" style="width:150px;height:150px;flex-shrink:0"></canvas><div class="legenda" id="legenda-pizza" style="flex:1"></div>`;
  }
  const cv = document.getElementById('graf-pizza');
  const dpr = window.devicePixelRatio || 1;
  cv.width = 150 * dpr; cv.height = 150 * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, 150, 150);
  const cx = 75, cy = 75, R = 70, r = 42;
  let ang = -Math.PI / 2;
  entradas.forEach(([id, v]) => {
    const frac = v / ind.total;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, ang, ang + frac * Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = cat(id).cor;
    ctx.fill();
    ang += frac * Math.PI * 2;
  });
  // Furo central (rosquinha)
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = corVar('--text2');
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(fmtMoeda(ind.total), cx, cy + 4);

  document.getElementById('legenda-pizza').innerHTML = entradas.map(([id, v]) =>
    `<div><i style="background:${cat(id).cor}"></i><span>${cat(id).label}</span><b>${fmtMoeda(v)}</b></div>`
  ).join('');
}

function desenharComparativo(ind) {
  const wrap = document.getElementById('wrap-graf-comp');
  if (ind.total <= 0) {
    wrap.innerHTML = `<div class="vazio"><span class="ico">↔️</span><b>Nada a comparar</b><span>Registre despesas para ver a comparação.</span></div>`;
    return;
  }
  if (!wrap.querySelector('canvas')) wrap.innerHTML = '<canvas class="grafico" id="graf-comp"></canvas>';
  const { ctx, w, h } = prepararCanvas(document.getElementById('graf-comp'), 150);
  const dados = [
    { label: 'Reembolsado', v: ind.reemb, cor: corVar('--primary') },
    { label: 'Pago por mim', v: ind.pago, cor: corVar('--laranja') },
  ];
  const max = Math.max(...dados.map(d => d.v)) * 1.2 || 1;
  const mBaixo = 24, mTopo = 18;
  const areaH = h - mBaixo - mTopo;
  const bw = Math.min(80, w / 4);
  dados.forEach((d, i) => {
    const x = w / 2 + (i === 0 ? -1 : 1) * (bw * 0.9);
    const bh = d.v / max * areaH;
    ctx.fillStyle = d.cor;
    ctx.beginPath(); ctx.roundRect(x - bw / 2, mTopo + areaH - bh, bw, Math.max(bh, 2), 5); ctx.fill();
    ctx.fillStyle = corVar('--text');
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(fmtMoeda(d.v), x, mTopo + areaH - bh - 5);
    ctx.fillStyle = corVar('--text2');
    ctx.font = '11px sans-serif';
    ctx.fillText(d.label, x, h - 7);
  });
}

/**
 * Gráfico do painel: despesas RDV do mês selecionado, por categoria.
 * Inclui as despesas do veículo reembolsadas (fatia "Veículo").
 */
function desenharRdvPorCategoria() {
  document.getElementById('titulo-rdv-graf').textContent =
    `🧾 RDV de ${MESES_LABEL[pMes - 1]} por categoria`;
  const wrap = document.getElementById('wrap-graf-rdv');
  const itens = itensRdvDoMes(refDe(pAno, pMes));

  if (!itens.length) {
    wrap.innerHTML = `<div class="vazio" style="width:100%"><span class="ico">🧾</span><b>Sem despesas RDV neste mês</b><span>Lance na aba RDV ou marque despesas do veículo como reembolsadas.</span></div>`;
    return;
  }
  if (!wrap.querySelector('canvas')) {
    wrap.innerHTML = `<canvas id="graf-rdv" style="width:150px;height:150px;flex-shrink:0"></canvas><div class="legenda" id="legenda-rdv" style="flex:1"></div>`;
  }

  // Agrupa por categoria (despesas do veículo viram a fatia "Veículo")
  const grupos = new Map();
  for (const i of itens) {
    const chave = i.origem === 'veiculo' ? '__veiculo' : i.categoria;
    grupos.set(chave, (grupos.get(chave) || 0) + i.valor);
  }
  const total = itens.reduce((s, i) => s + i.valor, 0);
  const entradas = [...grupos.entries()]
    .map(([id, v]) => id === '__veiculo'
      ? { label: 'Veículo', cor: '#43A047', valor: v }
      : { label: catRdv(id).label, cor: catRdv(id).cor, valor: v })
    .sort((a, b) => b.valor - a.valor);

  // Rosquinha (mesmo estilo do gráfico de despesas)
  const cv = document.getElementById('graf-rdv');
  const dpr = window.devicePixelRatio || 1;
  cv.width = 150 * dpr; cv.height = 150 * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, 150, 150);
  const cx = 75, cy = 75, R = 70, r = 42;
  let ang = -Math.PI / 2;
  for (const e of entradas) {
    const frac = e.valor / total;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, ang, ang + frac * Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = e.cor;
    ctx.fill();
    ang += frac * Math.PI * 2;
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = corVar('--text2');
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(fmtMoeda(total), cx, cy + 4);

  document.getElementById('legenda-rdv').innerHTML = entradas.map((e) =>
    `<div><i style="background:${e.cor}"></i><span>${escapar(e.label)}</span><b>${fmtMoeda(e.valor)}</b></div>`
  ).join('');
}

/* ---------------- item de despesa (HTML) ---------------- */
function htmlItemDespesa(d, comDuplicar) {
  const c = cat(d.categoria);
  const extra = [fmtData(d.data), c.label, d.local, d.kwh ? d.kwh + ' kWh' : null].filter(Boolean).join(' · ');
  return `<div class="item" data-id="${d.id}">
    <div class="linha1">
      <div class="ico-cat" style="background:${c.cor}22">${c.ico}</div>
      <div class="meio">
        <div class="titulo">${escapar(d.descricao || c.label)}</div>
        <div class="detalhe">${escapar(extra)}</div>
      </div>
      <div>
        <div class="valor">${fmtMoeda(d.valor)}</div>
        <span class="badge ${d.reembolso === 'reembolsado' ? 'reemb' : 'pago'}">
          ${d.reembolso === 'reembolsado' ? 'Reembolsada' : 'Paga por mim'}</span>
      </div>
    </div>
    <div class="acoes">
      ${d.foto ? `<button data-acao="foto">📷 Foto</button>` : ''}
      <button data-acao="editar">✏️ Editar</button>
      ${comDuplicar ? '<button data-acao="duplicar">📑 Duplicar</button>' : ''}
      <button data-acao="excluir" class="perigo">🗑 Excluir</button>
    </div>
  </div>`;
}
/**
 * Escapa texto para uso seguro em HTML — inclusive DENTRO de atributos
 * (aspas também são escapadas). Protege contra injeção de código vinda
 * de textos maliciosos, por exemplo em um backup importado de terceiros.
 */
function escapar(t) {
  return String(t ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Abre uma foto anexada com validação: só aceita imagens data:
 * geradas pelo próprio app. Nada de HTML interpolado.
 */
function abrirFoto(foto) {
  if (typeof foto !== 'string' || !/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(foto)) {
    alert('Anexo inválido ou corrompido.');
    return;
  }
  const w = window.open('', '_blank');
  if (!w) return;
  const img = w.document.createElement('img');
  img.src = foto;
  img.style.maxWidth = '100%';
  w.document.body.style.margin = '0';
  w.document.body.style.background = '#111';
  w.document.body.appendChild(img);
}

/** Remove anexos que não sejam imagens data: legítimas (saneamento de importação) */
function sanearFotos(lista) {
  const ok = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;
  for (const item of lista || []) {
    if (item.foto != null && (typeof item.foto !== 'string' || !ok.test(item.foto))) item.foto = null;
  }
}

function ligarAcoesDespesa(container, aoMudar) {
  container.querySelectorAll('.item').forEach(el => {
    const id = Number(el.dataset.id);
    el.querySelectorAll('button[data-acao]').forEach(b => {
      b.onclick = () => {
        const d = despesas.find(x => x.id === id);
        if (!d) return;
        if (b.dataset.acao === 'editar') abrirEdicaoDespesa(d, aoMudar);
        if (b.dataset.acao === 'foto') abrirFoto(d.foto);
        if (b.dataset.acao === 'duplicar') {
          despesas.push({ ...d, id: novoId(), foto: null });
          salvarTudo(); toast('📑 Despesa duplicada!'); aoMudar();
        }
        if (b.dataset.acao === 'excluir') {
          if (confirm('Deseja realmente excluir este lançamento?')) {
            despesas = despesas.filter(x => x.id !== id);
            salvarTudo(); toast('🗑 Despesa excluída.'); aoMudar();
          }
        }
      };
    });
  });
}

/* ================================================================
   LANÇAR
   ================================================================ */
let lancCategoria = 'recarga_fora';
let lancFoto = null;
let kmAno = hoje.getFullYear(), kmMes = hoje.getMonth() + 1;

function prepararLancar() {
  renderChips(document.getElementById('desp-categorias'),
    CATEGORIAS.map(c => ({ id: c.id, label: c.label, ico: c.ico })), lancCategoria,
    id => { lancCategoria = id; prepararLancar(); });
  // Regra: recarga_casa NUNCA mostra kWh nem local; só recarga_fora mostra
  document.getElementById('desp-extra-fora').style.display = lancCategoria === 'recarga_fora' ? 'block' : 'none';
  if (!document.getElementById('desp-data').value) document.getElementById('desp-data').value = hojeISO();
  setSeg('desp-situacao', document.getElementById('desp-situacao').dataset.tocado ? valorSeg('desp-situacao') : config.padrao_reembolso);
  chipsAnos(document.getElementById('km-anos'), kmAno, a => { kmAno = a; prepararLancar(); });
  chipsMeses(document.getElementById('km-meses'), kmMes, m => { kmMes = m; prepararLancar(); });
}

ligarSeg('lancar-tipo', v => {
  document.getElementById('form-despesa').style.display = v === 'despesa' ? 'block' : 'none';
  document.getElementById('form-km').style.display = v === 'km' ? 'block' : 'none';
});
ligarSeg('desp-situacao', () => { document.getElementById('desp-situacao').dataset.tocado = '1'; });
ligarSeg('km-metodo', v => {
  document.getElementById('km-bloco-direto').style.display = v === 'direto' ? 'block' : 'none';
  document.getElementById('km-bloco-odo').style.display = v === 'odometro' ? 'block' : 'none';
});

// Prévia do cálculo pelo odômetro
['km-odo-ini', 'km-odo-fim'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    const i = parseVal(document.getElementById('km-odo-ini').value);
    const f = parseVal(document.getElementById('km-odo-fim').value);
    const el = document.getElementById('km-preview');
    if (isNaN(i) || isNaN(f)) { el.textContent = ''; return; }
    if (f < i) { el.textContent = '⚠️ O odômetro final é menor que o inicial.'; el.style.color = 'var(--danger)'; }
    else { el.textContent = `KM calculados: ${fmtNum(f - i)} km`; el.style.color = 'var(--primary)'; }
  });
});

// Botão que abre o seletor de foto (listener em vez de onclick inline — CSP)
document.getElementById('desp-foto-botao').onclick =
  () => document.getElementById('desp-foto-input').click();

// Fechar modais pelos botões "✕" (data-fechar em vez de onclick inline — CSP)
document.querySelectorAll('button[data-fechar]').forEach((b) => {
  b.onclick = () => fecharModal(b.dataset.fechar);
});

// Foto do comprovante (redimensionada para caber no armazenamento)
document.getElementById('desp-foto-input').addEventListener('change', async (e) => {
  const arq = e.target.files[0]; if (!arq) return;
  try {
    lancFoto = await redimensionarFoto(arq);
    const img = document.getElementById('desp-foto-prev');
    img.src = lancFoto; img.style.display = 'block';
    document.getElementById('desp-foto-remover').style.display = 'inline-block';
  } catch (err) { alert('Não foi possível anexar a foto.'); }
});
document.getElementById('desp-foto-remover').onclick = () => {
  lancFoto = null;
  document.getElementById('desp-foto-prev').style.display = 'none';
  document.getElementById('desp-foto-remover').style.display = 'none';
  document.getElementById('desp-foto-input').value = '';
};
function redimensionarFoto(arquivo) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      const esc = Math.min(1, MAX / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = img.width * esc; cv.height = img.height * esc;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(arquivo);
  });
}

// Validação e gravação da despesa
function validarDespesa(valorTxt, dataISO) {
  const v = parseVal(valorTxt);
  let erroV = '', erroD = '';
  if (String(valorTxt).trim() === '') erroV = 'Informe o valor.';
  else if (isNaN(v)) erroV = 'Valor inválido.';
  else if (v < 0) erroV = 'O valor não pode ser negativo.';
  else if (v === 0) erroV = 'O valor não pode ser zero.';
  if (!dataISO || !/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) erroD = 'Informe uma data válida.';
  return { v, erroV, erroD };
}

document.getElementById('form-despesa').addEventListener('submit', (e) => {
  e.preventDefault();
  const { v, erroV, erroD } = validarDespesa(
    document.getElementById('desp-valor').value,
    document.getElementById('desp-data').value
  );
  document.getElementById('erro-valor').textContent = erroV;
  document.getElementById('erro-data').textContent = erroD;
  if (erroV || erroD) return;

  const ehFora = lancCategoria === 'recarga_fora';
  let kwh = null;
  if (ehFora && document.getElementById('desp-kwh').value.trim() !== '') {
    kwh = parseVal(document.getElementById('desp-kwh').value);
    if (isNaN(kwh) || kwh < 0) kwh = null; // opcional: inválido é descartado
  }
  despesas.push({
    id: novoId(),
    data: document.getElementById('desp-data').value,
    categoria: lancCategoria,
    valor: v,
    descricao: document.getElementById('desp-descricao').value.trim() || null,
    local: ehFora ? (document.getElementById('desp-local').value.trim() || null) : null,
    kwh: ehFora ? kwh : null, // recarga_casa NUNCA grava kWh
    reembolso: valorSeg('desp-situacao'),
    foto: lancFoto,
  });
  salvarTudo();
  // Limpa o formulário para o próximo lançamento
  document.getElementById('desp-valor').value = '';
  document.getElementById('desp-descricao').value = '';
  document.getElementById('desp-local').value = '';
  document.getElementById('desp-kwh').value = '';
  document.getElementById('desp-foto-remover').onclick();
  toast('✅ Despesa salva!');
});

// Validação e gravação da quilometragem (ano+mês único)
document.getElementById('form-km').addEventListener('submit', (e) => {
  e.preventDefault();
  const elErro = document.getElementById('erro-km');
  elErro.textContent = '';
  let km, odoIni = null, odoFim = null;
  if (valorSeg('km-metodo') === 'direto') {
    km = parseVal(document.getElementById('km-direto').value);
    if (isNaN(km)) return elErro.textContent = 'Informe os KM rodados.';
    if (km < 0) return elErro.textContent = 'Os quilômetros não podem ser negativos.';
  } else {
    odoIni = parseVal(document.getElementById('km-odo-ini').value);
    odoFim = parseVal(document.getElementById('km-odo-fim').value);
    if (isNaN(odoIni) || isNaN(odoFim)) return elErro.textContent = 'Informe o odômetro inicial e o final.';
    if (odoIni < 0 || odoFim < 0) return elErro.textContent = 'O odômetro não pode ser negativo.';
    if (odoFim < odoIni) return elErro.textContent = 'O odômetro final deve ser maior ou igual ao inicial.';
    km = odoFim - odoIni;
  }
  const obs = document.getElementById('km-obs').value.trim() || null;
  const existente = meses.find(m => m.ano === kmAno && m.mes === kmMes);
  if (existente) Object.assign(existente, { km, odoIni, odoFim, obs });
  else meses.push({ id: novoId(), ano: kmAno, mes: kmMes, km, odoIni, odoFim, obs });
  salvarTudo();
  document.getElementById('km-direto').value = '';
  document.getElementById('km-odo-ini').value = '';
  document.getElementById('km-odo-fim').value = '';
  document.getElementById('km-obs').value = '';
  document.getElementById('km-preview').textContent = '';
  toast(`✅ ${fmtNum(km)} km salvos em ${MESES_ABREV[kmMes - 1]}/${kmAno}!`);
});

/* ================================================================
   MODAL: edição de despesa
   ================================================================ */
function abrirEdicaoDespesa(d, aoMudar) {
  const corpo = document.getElementById('modal-despesa-corpo');
  const ehFora = () => corpo.dataset.cat === 'recarga_fora';
  corpo.dataset.cat = d.categoria;
  corpo.innerHTML = `
    <label class="rotulo">Categoria</label><div class="chips" id="ed-cats"></div>
    <label class="rotulo">Valor (R$) *</label>
    <input id="ed-valor" inputmode="decimal" value="${String(d.valor).replace('.', ',')}">
    <div class="erro-campo" id="ed-erro"></div>
    <label class="rotulo">Data *</label>
    <input id="ed-data" type="date" value="${d.data}">
    <div id="ed-extra" style="display:${d.categoria === 'recarga_fora' ? 'block' : 'none'}">
      <label class="rotulo">Energia (kWh) — opcional</label>
      <input id="ed-kwh" inputmode="decimal" value="${d.kwh ?? ''}">
      <label class="rotulo">Local — opcional</label>
      <input id="ed-local" value="${escapar(d.local || '')}">
    </div>
    <label class="rotulo">Descrição</label>
    <input id="ed-desc" value="${escapar(d.descricao || '')}">
    <label class="rotulo">Situação *</label>
    <div class="seg" id="ed-sit">
      <button type="button" data-v="pago" class="${d.reembolso === 'pago' ? 'ativa' : ''}">Paga por mim</button>
      <button type="button" data-v="reembolsado" class="${d.reembolso === 'reembolsado' ? 'ativa' : ''}">Reembolsada</button>
    </div>
    <button class="botao" id="ed-salvar">✓ Salvar alterações</button>`;

  renderChips(corpo.querySelector('#ed-cats'),
    CATEGORIAS.map(c => ({ id: c.id, label: c.label, ico: c.ico })), d.categoria,
    id => {
      corpo.dataset.cat = id;
      renderChips(corpo.querySelector('#ed-cats'),
        CATEGORIAS.map(c => ({ id: c.id, label: c.label, ico: c.ico })), id, () => {});
      // Reaproveita o mesmo handler reabrindo a edição com a nova categoria
      abrirEdicaoDespesa({ ...coletar(), id: d.id, foto: d.foto, categoria: id }, aoMudar);
    });
  ligarSeg('ed-sit', () => {});

  function coletar() {
    return {
      data: corpo.querySelector('#ed-data').value,
      categoria: corpo.dataset.cat,
      valor: parseVal(corpo.querySelector('#ed-valor').value),
      descricao: corpo.querySelector('#ed-desc').value.trim() || null,
      local: ehFora() ? (corpo.querySelector('#ed-local')?.value.trim() || null) : null,
      kwh: ehFora() ? (parseVal(corpo.querySelector('#ed-kwh')?.value) || null) : null,
      reembolso: corpo.querySelector('#ed-sit button.ativa').dataset.v,
    };
  }

  corpo.querySelector('#ed-salvar').onclick = () => {
    const novo = coletar();
    const { erroV, erroD } = validarDespesa(corpo.querySelector('#ed-valor').value, novo.data);
    if (erroV || erroD) { corpo.querySelector('#ed-erro').textContent = erroV || erroD; return; }
    if (novo.kwh !== null && (isNaN(novo.kwh) || novo.kwh < 0)) novo.kwh = null;
    const alvo = despesas.find(x => x.id === d.id);
    Object.assign(alvo, novo);
    salvarTudo(); fecharModal('modal-despesa'); toast('✅ Despesa atualizada!'); aoMudar();
  };
  document.getElementById('modal-despesa').showModal();
}
function fecharModal(id) { document.getElementById(id).close(); }

/* ================================================================
   HISTÓRICO
   ================================================================ */
let hAno = hoje.getFullYear(), hMes = null, hCat = null;

ligarSeg('hist-aba', v => {
  document.getElementById('hist-bloco-despesas').style.display = v === 'despesas' ? 'block' : 'none';
  document.getElementById('hist-bloco-km').style.display = v === 'km' ? 'block' : 'none';
  renderHistorico();
});
document.getElementById('hist-busca').addEventListener('input', () => renderHistorico());

function renderHistorico() {
  chipsAnos(document.getElementById('hist-anos'), hAno, a => { hAno = a; renderHistorico(); });
  chipsMeses(document.getElementById('hist-meses'), hMes, m => { hMes = m; renderHistorico(); }, true, 'Ano todo');
  renderChips(document.getElementById('hist-categorias'),
    [{ id: null, label: 'Todas' }, ...CATEGORIAS.map(c => ({ id: c.id, label: c.label, ico: c.ico }))],
    hCat, id => { hCat = id; renderHistorico(); });

  // Despesas filtradas, mais recentes primeiro
  const busca = document.getElementById('hist-busca').value.trim().toLowerCase();
  let lista = despesas.filter(d => {
    const [a, m] = d.data.split('-').map(Number);
    if (a !== hAno) return false;
    if (hMes && m !== hMes) return false;
    if (hCat && d.categoria !== hCat) return false;
    if (busca && !((d.descricao || '').toLowerCase().includes(busca) || (d.local || '').toLowerCase().includes(busca))) return false;
    return true;
  }).sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);

  document.getElementById('hist-lista').innerHTML = lista.length
    ? lista.map(d => htmlItemDespesa(d, true)).join('')
    : `<div class="card"><div class="vazio"><span class="ico">🔍</span><b>Nenhuma despesa encontrada</b><span>Ajuste os filtros ou registre uma nova despesa.</span></div></div>`;
  ligarAcoesDespesa(document.getElementById('hist-lista'), renderHistorico);

  // Quilometragem
  const ms = [...meses].sort((a, b) => (b.ano - a.ano) || (b.mes - a.mes));
  document.getElementById('hist-bloco-km').innerHTML = ms.length
    ? ms.map(m => `<div class="item" data-kmid="${m.id}">
        <div class="linha1">
          <div class="ico-cat" style="background:var(--primary-cont)">🚗</div>
          <div class="meio">
            <div class="titulo">${MESES_LABEL[m.mes - 1]}/${m.ano}</div>
            <div class="detalhe">${m.odoIni != null ? `Odômetro: ${fmtNum(m.odoIni)} → ${fmtNum(m.odoFim)}` : 'KM digitados manualmente'}${m.obs ? ' · ' + escapar(m.obs) : ''}</div>
          </div>
          <div class="valor" style="color:var(--primary)">${fmtNum(m.km)} km</div>
        </div>
        <div class="acoes">
          <button data-acao="editar">✏️ Editar</button>
          <button data-acao="excluir" class="perigo">🗑 Excluir</button>
        </div>
      </div>`).join('')
    : `<div class="card"><div class="vazio"><span class="ico">🚗</span><b>Nenhum mês registrado</b><span>Registre a quilometragem na aba Lançar.</span></div></div>`;

  document.getElementById('hist-bloco-km').querySelectorAll('.item').forEach(el => {
    const id = Number(el.dataset.kmid);
    el.querySelector('[data-acao="editar"]').onclick = () => abrirEdicaoKm(meses.find(m => m.id === id));
    el.querySelector('[data-acao="excluir"]').onclick = () => {
      const m = meses.find(x => x.id === id);
      if (confirm(`Excluir o registro de ${MESES_LABEL[m.mes - 1]}/${m.ano}?`)) {
        meses = meses.filter(x => x.id !== id);
        salvarTudo(); renderHistorico(); toast('🗑 Registro excluído.');
      }
    };
  });
  setTimeout(reencaixarRolagem, 0);
}

function abrirEdicaoKm(m) {
  const corpo = document.getElementById('modal-km-corpo');
  const usaOdo = m.odoIni != null;
  corpo.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px">${MESES_LABEL[m.mes - 1]}/${m.ano}</div>
    <div class="seg" id="edk-metodo">
      <button type="button" data-v="direto" class="${usaOdo ? '' : 'ativa'}">Digitar KM</button>
      <button type="button" data-v="odometro" class="${usaOdo ? 'ativa' : ''}">Odômetro início/fim</button>
    </div>
    <div id="edk-direto" style="display:${usaOdo ? 'none' : 'block'}">
      <label class="rotulo">KM rodados no mês *</label>
      <input id="edk-km" inputmode="decimal" value="${usaOdo ? '' : String(m.km).replace('.', ',')}">
    </div>
    <div id="edk-odo" style="display:${usaOdo ? 'block' : 'none'}">
      <label class="rotulo">Odômetro no início *</label>
      <input id="edk-ini" inputmode="decimal" value="${m.odoIni ?? ''}">
      <label class="rotulo">Odômetro no fim *</label>
      <input id="edk-fim" inputmode="decimal" value="${m.odoFim ?? ''}">
    </div>
    <label class="rotulo">Observação</label>
    <input id="edk-obs" value="${escapar(m.obs || '')}">
    <div class="erro-campo" id="edk-erro"></div>
    <button class="botao" id="edk-salvar">✓ Salvar</button>`;
  ligarSeg('edk-metodo', v => {
    corpo.querySelector('#edk-direto').style.display = v === 'direto' ? 'block' : 'none';
    corpo.querySelector('#edk-odo').style.display = v === 'odometro' ? 'block' : 'none';
  });
  corpo.querySelector('#edk-salvar').onclick = () => {
    const erro = corpo.querySelector('#edk-erro');
    erro.textContent = '';
    if (corpo.querySelector('#edk-metodo button.ativa').dataset.v === 'direto') {
      const km = parseVal(corpo.querySelector('#edk-km').value);
      if (isNaN(km)) return erro.textContent = 'Informe os KM rodados.';
      if (km < 0) return erro.textContent = 'Os quilômetros não podem ser negativos.';
      Object.assign(m, { km, odoIni: null, odoFim: null });
    } else {
      const i = parseVal(corpo.querySelector('#edk-ini').value);
      const f = parseVal(corpo.querySelector('#edk-fim').value);
      if (isNaN(i) || isNaN(f)) return erro.textContent = 'Informe o odômetro inicial e o final.';
      if (i < 0 || f < 0) return erro.textContent = 'O odômetro não pode ser negativo.';
      if (f < i) return erro.textContent = 'O odômetro final deve ser maior ou igual ao inicial.';
      Object.assign(m, { km: f - i, odoIni: i, odoFim: f });
    }
    m.obs = corpo.querySelector('#edk-obs').value.trim() || null;
    salvarTudo(); fecharModal('modal-km'); renderHistorico(); toast('✅ Quilometragem atualizada!');
  };
  document.getElementById('modal-km').showModal();
}

/* ================================================================
   RELATÓRIOS (jsPDF — 100% no aparelho)
   ================================================================ */
let rAnoIni = hoje.getFullYear(), rMesIni = hoje.getMonth() + 1;
let rAnoFim = hoje.getFullYear(), rMesFim = hoje.getMonth() + 1;

ligarSeg('rel-tipo', () => {});
ligarSeg('rel-modo', v => {
  document.getElementById('rel-bloco-fim').style.display = v === 'intervalo' ? 'block' : 'none';
  document.getElementById('rel-rotulo-ini').textContent = v === 'intervalo' ? 'Mês inicial' : 'Mês do relatório';
});

function renderRelatorios() {
  chipsAnos(document.getElementById('rel-anos-ini'), rAnoIni, a => { rAnoIni = a; renderRelatorios(); });
  chipsMeses(document.getElementById('rel-meses-ini'), rMesIni, m => { rMesIni = m; renderRelatorios(); });
  chipsAnos(document.getElementById('rel-anos-fim'), rAnoFim, a => { rAnoFim = a; renderRelatorios(); });
  chipsMeses(document.getElementById('rel-meses-fim'), rMesFim, m => { rMesFim = m; renderRelatorios(); });

  const hist = [...relatorios].sort((a, b) => b.id - a.id);
  document.getElementById('rel-historico').innerHTML = hist.length
    ? hist.map(r => `<div class="item" data-relid="${r.id}">
        <div class="linha1">
          <div class="ico-cat" style="background:var(--primary-cont)">${({km:'🚗', completo:'🧾', rdv:'💼'})[r.tipo] || '📄'}</div>
          <div class="meio">
            <div class="titulo">${({km:'Relatório de KM', completo:'KM + Despesas', rdv:'RDV'})[r.tipo] || r.tipo} · ${r.ini === r.fim ? labelRef(r.ini) : labelRef(r.ini) + ' a ' + labelRef(r.fim)}</div>
            <div class="detalhe">${escapar(r.nome)} · gerado em ${fmtData(r.em)}</div>
          </div>
        </div>
        <div class="acoes">
          <button data-acao="gerar">📄 Gerar novamente</button>
          <button data-acao="excluir" class="perigo">🗑 Excluir</button>
        </div>
      </div>`).join('')
    : `<div class="card"><div class="vazio"><span class="ico">📄</span><b>Nenhum relatório gerado</b><span>Os relatórios gerados aparecem aqui e podem ser recriados a qualquer momento.</span></div></div>`;

  document.getElementById('rel-historico').querySelectorAll('.item').forEach(el => {
    const id = Number(el.dataset.relid);
    const r = relatorios.find(x => x.id === id);
    el.querySelector('[data-acao="gerar"]').onclick = () => {
      if (r.tipo === 'rdv') {
        const [a, m] = r.ini.split('-').map(Number);
        gerarRelatorioRdv(a, m, false);
      } else {
        gerarPdf(r.tipo, r.ini, r.fim, false);
      }
    };
    el.querySelector('[data-acao="excluir"]').onclick = () => {
      if (confirm('Remover este relatório do histórico? O PDF pode ser recriado depois.')) {
        relatorios = relatorios.filter(x => x.id !== id);
        salvarTudo(); renderRelatorios();
      }
    };
  });
}

document.getElementById('rel-gerar').onclick = () => {
  const ini = refDe(rAnoIni, rMesIni);
  const fim = valorSeg('rel-modo') === 'mes' ? ini : refDe(rAnoFim, rMesFim);
  if (ini > fim) { alert('O mês inicial deve ser anterior ao mês final.'); return; }
  gerarPdf(valorSeg('rel-tipo'), ini, fim, true);
};

function mesesDoPeriodo(ini, fim) {
  return meses.filter(m => { const r = refDe(m.ano, m.mes); return r >= ini && r <= fim; })
    .sort((a, b) => (a.ano - b.ano) || (a.mes - b.mes));
}
function despesasDoPeriodo(ini, fim) {
  return despesas.filter(d => { const r = mesRef(d.data); return r >= ini && r <= fim; })
    .sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id);
}

async function gerarPdf(tipo, ini, fim, registrar) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const VERDE = [27, 127, 76];
  const agora = new Date();
  const emitido = `${fmtData(hojeISO())} ${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;
  const periodo = ini === fim ? labelRef(ini) : `${labelRef(ini)} a ${labelRef(fim)}`;

  // Cabeçalho
  doc.setFontSize(16); doc.setTextColor(...VERDE); doc.setFont(undefined, 'bold');
  doc.text(tipo === 'km' ? 'Relatório de Quilometragem' : 'Relatório de Quilometragem e Despesas', 14, 18);
  doc.setFontSize(9); doc.setTextColor(80); doc.setFont(undefined, 'normal');
  doc.text(`Veículo: ${config.nome_veiculo || '—'}    Placa: ${config.placa || '—'}`, 14, 25);
  doc.text(`Período: ${periodo}    Emitido em: ${emitido}`, 14, 30);
  doc.setDrawColor(...VERDE); doc.setLineWidth(0.6); doc.line(14, 33, 196, 33);

  const ms = mesesDoPeriodo(ini, fim);
  let yFinal = 40;

  if (tipo === 'km') {
    // ---------- Modelo 1: Relatório de KM ----------
    const linhas = ms.map(m => [
      `${MESES_LABEL[m.mes - 1]}/${m.ano}`, fmtNum(m.km) + ' km',
      fmtMoeda(config.tarifa_km), fmtMoeda(m.km * config.tarifa_km),
    ]);
    const totKm = ms.reduce((s, m) => s + m.km, 0);
    linhas.push(['Total do período', fmtNum(totKm) + ' km', '', fmtMoeda(totKm * config.tarifa_km)]);
    doc.autoTable({
      startY: 40,
      head: [['Mês', 'KM Rodados', 'Tarifa por KM', 'Total']],
      body: linhas.length > 1 ? linhas : [['Nenhuma quilometragem registrada no período.', '', '', '']],
      theme: 'grid', headStyles: { fillColor: VERDE }, styles: { fontSize: 9 },
      didParseCell: (d) => { if (d.row.index === linhas.length - 1 && linhas.length > 1) d.cell.styles.fontStyle = 'bold'; },
    });
    yFinal = doc.lastAutoTable.finalY;
  } else {
    // ---------- Modelo 2: KM + Despesas ----------
    const dp = despesasDoPeriodo(ini, fim);
    const totKm = ms.reduce((s, m) => s + m.km, 0);
    const totGeral = dp.reduce((s, d) => s + d.valor, 0);
    const totReemb = dp.filter(d => d.reembolso === 'reembolsado').reduce((s, d) => s + d.valor, 0);
    const custoPorKm = totKm > 0 ? totGeral / totKm : null; // nunca divide por zero

    // Bloco inicial: resumo da quilometragem
    doc.setFontSize(10); doc.setTextColor(...VERDE); doc.setFont(undefined, 'bold');
    doc.text('Resumo da Quilometragem', 14, 41);
    doc.setFontSize(9); doc.setTextColor(40); doc.setFont(undefined, 'normal');
    doc.text(`KM rodados: ${fmtNum(totKm)} km    Tarifa: ${fmtMoeda(config.tarifa_km)}    Reembolso de KM: ${fmtMoeda(totKm * config.tarifa_km)}`, 14, 47);

    // Tabela de despesas com subtotais por categoria
    const corpo = [];
    const grupos = {};
    dp.forEach(d => { (grupos[d.categoria] = grupos[d.categoria] || []).push(d); });
    Object.entries(grupos).forEach(([cid, itens]) => {
      let sub = 0;
      itens.forEach(d => {
        sub += d.valor;
        corpo.push([fmtData(d.data), cat(cid).label, d.descricao || '—', fmtMoeda(d.valor),
          d.reembolso === 'reembolsado' ? 'Reembolsada' : 'Paga por mim']);
      });
      corpo.push([{ content: `Subtotal — ${cat(cid).label}`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [245, 248, 245] } },
        { content: fmtMoeda(sub), styles: { fontStyle: 'bold', fillColor: [245, 248, 245] } },
        { content: '', styles: { fillColor: [245, 248, 245] } }]);
    });
    doc.autoTable({
      startY: 52,
      head: [['Data', 'Categoria', 'Descrição', 'Valor', 'Situação']],
      body: corpo.length ? corpo : [['Nenhuma despesa registrada no período.', '', '', '', '']],
      theme: 'grid', headStyles: { fillColor: VERDE }, styles: { fontSize: 8 },
    });
    let y = doc.lastAutoTable.finalY + 8;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setTextColor(...VERDE); doc.setFont(undefined, 'bold');
    doc.text('Totais do Período', 14, y);
    doc.setFontSize(9); doc.setTextColor(40); doc.setFont(undefined, 'normal');
    const totais = [
      `Total geral de despesas: ${fmtMoeda(totGeral)}`,
      `Total reembolsável: ${fmtMoeda(totReemb)}`,
      `Total pago por mim: ${fmtMoeda(totGeral - totReemb)}`,
      `Reembolso por KM: ${fmtMoeda(totKm * config.tarifa_km)}`,
      `Custo total: ${fmtMoeda(totGeral)}`,
      `Custo por KM: ${custoPorKm === null ? '—' : fmtMoeda(custoPorKm)}`,
    ];
    totais.forEach((t, i) => doc.text(t, 14 + (i % 2) * 95, y + 7 + Math.floor(i / 2) * 6));
    yFinal = y + 7 + 18;
  }

  // Linha de assinatura
  let yAss = yFinal + 30;
  if (yAss > 270) { doc.addPage(); yAss = 40; }
  doc.setDrawColor(60); doc.setLineWidth(0.3);
  doc.line(70, yAss, 140, yAss);
  doc.setFontSize(8); doc.setTextColor(90);
  doc.text('Assinatura', 105, yAss + 5, { align: 'center' });
  doc.setFontSize(7); doc.setTextColor(150);
  doc.text('Documento gerado localmente pelo aplicativo Controle EV — os dados permanecem no aparelho.', 105, 290, { align: 'center' });

  // Nome do arquivo e entrega (compartilhar quando possível, senão baixar)
  const base = ini === fim ? ini : `${ini}-a-${fim}`;
  const nome = `relatorio-${tipo === 'km' ? 'km' : 'completo'}-${base}.pdf`;
  const blob = doc.output('blob');
  const arquivo = new (window.File || Blob)([blob], nome, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: nome }); }
    catch (e) { if (e.name !== 'AbortError') doc.save(nome); }
  } else {
    doc.save(nome);
  }

  if (registrar) {
    relatorios.push({ id: novoId(), tipo, ini, fim, nome, em: hojeISO() });
    salvarTudo(); renderRelatorios();
  }
  toast('📄 PDF gerado!');
}

/* ================================================================
   CONFIGURAÇÕES
   ================================================================ */
function renderConfig() {
  document.getElementById('cfg-tarifa').value = String(config.tarifa_km).replace('.', ',');
  document.getElementById('cfg-veiculo').value = config.nome_veiculo;
  document.getElementById('cfg-placa').value = config.placa;
  document.getElementById('cfg-meta').value = config.meta_km_mes ? String(config.meta_km_mes).replace('.', ',') : '';
  document.getElementById('cfg-kwh-casa').value = config.custo_energia_casa_kwh ? String(config.custo_energia_casa_kwh).replace('.', ',') : '';
  setSeg('cfg-padrao', config.padrao_reembolso);
  setSeg('cfg-tema', config.tema);
  document.getElementById('cfg-colaborador').value = config.nome_colaborador || '';
  renderFormasPagamento();
  renderNuvemStatus();
}

/* ---- gestão das formas de pagamento (RDV) ---- */
function renderFormasPagamento() {
  const el = document.getElementById('cfg-formas-lista');
  const formas = config.formas_pagamento || [];
  el.innerHTML = formas.length
    ? formas.map((f, i) =>
        `<span class="chip" style="cursor:default">${escapar(f)}
           <b data-remover="${i}" style="cursor:pointer;margin-left:6px;color:var(--danger)">✕</b></span>`).join('')
    : '<span style="font-size:12px;color:var(--text2)">Nenhuma forma cadastrada.</span>';
  el.querySelectorAll('[data-remover]').forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.remover);
      if (!confirm(`Remover a forma de pagamento "${formas[i]}"? Lançamentos antigos não são alterados.`)) return;
      config.formas_pagamento.splice(i, 1);
      salvarTudo(); renderFormasPagamento();
    };
  });
}
document.getElementById('cfg-forma-add').onclick = () => {
  const campo = document.getElementById('cfg-forma-nova');
  const nome = campo.value.trim();
  if (!nome) return;
  config.formas_pagamento = config.formas_pagamento || [];
  if (config.formas_pagamento.some((f) => f.toLowerCase() === nome.toLowerCase())) {
    return alert('Essa forma de pagamento já está cadastrada.');
  }
  config.formas_pagamento.push(nome);
  campo.value = '';
  salvarTudo(); renderFormasPagamento();
  toast('✅ Forma de pagamento adicionada!');
};

// Botões do backup na nuvem
document.getElementById('nuvem-ativar').onclick = () => ativarNuvem();
document.getElementById('nuvem-desativar').onclick = () => desativarNuvem();
document.getElementById('nuvem-agora').onclick = () => backupNuvem(true);
document.getElementById('nuvem-restaurar').onclick = () => aoRestaurarNuvem();
document.getElementById('nuvem-esquecer').onclick = () => esquecerCredenciaisNuvem();
document.getElementById('nuvem-restaurar-novo').onclick = () => aoRestaurarNuvem();
ligarSeg('cfg-padrao', () => {});
ligarSeg('cfg-tema', v => { config.tema = v; salvarTudo(); aplicarTema(); });

document.getElementById('cfg-salvar').onclick = () => {
  const t = parseVal(document.getElementById('cfg-tarifa').value);
  if (isNaN(t) || t < 0) return alert('Informe uma tarifa por KM válida (ex.: 0,76).');
  const meta = document.getElementById('cfg-meta').value.trim() === '' ? 0 : parseVal(document.getElementById('cfg-meta').value);
  if (isNaN(meta) || meta < 0) return alert('A meta mensal deve ser um número positivo.');
  const kwh = document.getElementById('cfg-kwh-casa').value.trim() === '' ? 0 : parseVal(document.getElementById('cfg-kwh-casa').value);
  if (isNaN(kwh) || kwh < 0) return alert('O custo do kWh deve ser um número positivo.');
  Object.assign(config, {
    tarifa_km: t,
    nome_veiculo: document.getElementById('cfg-veiculo').value.trim(),
    placa: document.getElementById('cfg-placa').value.trim().toUpperCase(),
    meta_km_mes: meta,
    custo_energia_casa_kwh: kwh,
    padrao_reembolso: valorSeg('cfg-padrao'),
    nome_colaborador: document.getElementById('cfg-colaborador').value.trim(),
  });
  salvarTudo(); toast('💾 Preferências salvas!');
};

/* ---------------- backup ---------------- */
document.getElementById('bk-exportar').onclick = async () => {
  const backup = montarBackupObj();
  // Registra a data da cópia (controla o aviso de backup atrasado)
  ultimoBackupEm = new Date().toISOString();
  IDB.set('ultimo_backup', ultimoBackupEm);
  const nome = `backup-controle-ev-${hojeISO()}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const arquivo = new (window.File || Blob)([blob], nome, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: nome }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome; a.click();
  URL.revokeObjectURL(a.href);
};

document.getElementById('bk-importar').onclick = () => document.getElementById('bk-arquivo').click();
document.getElementById('bk-arquivo').addEventListener('change', async (e) => {
  const arq = e.target.files[0]; e.target.value = '';
  if (!arq) return;
  let bk;
  try { bk = JSON.parse(await arq.text()); }
  catch (err) { return alert('O arquivo não é um JSON válido.'); }
  // Validação da estrutura antes de importar
  const erro = validarBackup(bk);
  if (erro) return alert('Importação inválida: ' + erro);
  if (!confirm(`O backup contém ${bk.despesas.length} despesa(s), ${bk.meses.length} mês(es) de quilometragem e ${(bk.rdv || []).length} despesa(s) RDV.\n\nTODOS os dados atuais serão substituídos. Deseja continuar?`)) return;
  meses = bk.meses; despesas = bk.despesas;
  config = { ...CONFIG_PADRAO, ...bk.config };
  relatorios = bk.relatorios || [];
  rdv = bk.rdv || [];
  // Saneamento: anexos precisam ser imagens legítimas; formas, textos simples
  sanearFotos(despesas); sanearFotos(rdv);
  config.formas_pagamento = Array.isArray(config.formas_pagamento)
    ? config.formas_pagamento.filter((f) => typeof f === 'string').slice(0, 30)
    : [...CONFIG_PADRAO.formas_pagamento];
  salvarTudo(); aplicarTema(); renderConfig(); toast('✅ Backup importado com sucesso!');
});

function validarBackup(o) {
  if (!o || typeof o !== 'object') return 'não é um arquivo de backup.';
  if (o.app !== 'controle-ev') return 'este arquivo não é um backup do Controle EV.';
  if (!Array.isArray(o.meses) || !Array.isArray(o.despesas)) return 'estrutura incompleta.';
  for (const m of o.meses) {
    if (typeof m.ano !== 'number' || typeof m.mes !== 'number' || m.mes < 1 || m.mes > 12) return 'registro de mês inválido.';
    if (typeof m.km !== 'number' || m.km < 0) return 'quilometragem inválida.';
  }
  for (const d of o.despesas) {
    if (typeof d.valor !== 'number' || d.valor < 0) return 'despesa com valor inválido.';
    if (!d.data || !/^\d{4}-\d{2}-\d{2}$/.test(d.data)) return 'despesa com data inválida.';
    if (d.reembolso !== 'pago' && d.reembolso !== 'reembolsado') return 'situação de reembolso inválida.';
  }
  // rdv é opcional (backups antigos não têm)
  if (o.rdv !== undefined) {
    if (!Array.isArray(o.rdv)) return 'estrutura RDV inválida.';
    for (const r of o.rdv) {
      if (typeof r.valor !== 'number' || r.valor < 0) return 'despesa RDV com valor inválido.';
      if (!r.data || !/^\d{4}-\d{2}-\d{2}$/.test(r.data)) return 'despesa RDV com data inválida.';
    }
  }
  return null;
}

/* ---------------- apagar tudo (confirmação dupla) ---------------- */
document.getElementById('cfg-apagar').onclick = () => {
  if (!confirm('Isso removerá TODAS as despesas, quilometragens, relatórios e configurações. Esta ação não pode ser desfeita. Continuar?')) return;
  if (!confirm('Tem certeza? Confirme mais uma vez: apagar TODOS os dados do aplicativo?')) return;
  meses = []; despesas = []; relatorios = []; rdv = [];
  config = { ...CONFIG_PADRAO };
  salvarTudo(); renderConfig(); aplicarTema(); toast('🗑 Todos os dados foram apagados.');
};

/* ================================================================
   RDV — Relatório de Despesas de Viagem (reembolso da distribuidora)
   - Lançamentos próprios (refeição, combustível, hospedagem etc.)
     com foto da nota, observação e forma de pagamento.
   - As despesas do veículo marcadas "Reembolsada pela empresa"
     entram AUTOMATICAMENTE no RDV do mês (etiqueta "Veículo"),
     sem duplicar dados.
   - PDF mensal com a tabela de despesas e TODAS as notas anexadas
     ao final (uma por página).
   ================================================================ */
let rdvAno = hoje.getFullYear(), rdvMes = hoje.getMonth() + 1;
let rdvCategoria = 'refeicao';
let rdvForma = null;
let rdvFoto = null;

/** Une os lançamentos RDV e as despesas do veículo reembolsadas do mês */
function itensRdvDoMes(ref) {
  const proprios = rdv
    .filter((r) => mesRef(r.data) === ref)
    .map((r) => ({ ...r, origem: 'rdv', catLabel: catRdv(r.categoria).label, catIco: catRdv(r.categoria).ico }));
  const doVeiculo = despesas
    .filter((d) => d.reembolso === 'reembolsado' && mesRef(d.data) === ref)
    .map((d) => ({
      id: d.id, data: d.data, valor: d.valor,
      descricao: d.descricao, obs: null, forma: null, foto: d.foto,
      origem: 'veiculo', catLabel: 'Veículo — ' + cat(d.categoria).label, catIco: '🚗',
    }));
  return [...proprios, ...doVeiculo].sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id);
}

function renderRdv() {
  chipsAnos(document.getElementById('rdv-anos'), rdvAno, (a) => { rdvAno = a; renderRdv(); });
  chipsMeses(document.getElementById('rdv-meses'), rdvMes, (m) => { rdvMes = m; renderRdv(); });
  renderChips(document.getElementById('rdv-categorias'),
    CATEGORIAS_RDV.map((c) => ({ id: c.id, label: c.label, ico: c.ico })), rdvCategoria,
    (id) => { rdvCategoria = id; renderRdv(); });

  // Formas de pagamento cadastradas nas Configurações
  const formas = config.formas_pagamento || [];
  if (formas.length) {
    if (rdvForma && !formas.includes(rdvForma)) rdvForma = null;
    renderChips(document.getElementById('rdv-formas'),
      formas.map((f) => ({ id: f, label: f })), rdvForma,
      (id) => { rdvForma = id; renderRdv(); });
  } else {
    document.getElementById('rdv-formas').innerHTML =
      '<span style="font-size:12px;color:var(--text2)">Cadastre formas de pagamento em Config. → RDV</span>';
  }

  if (!document.getElementById('rdv-data').value) {
    document.getElementById('rdv-data').value = hojeISO();
  }

  const ref = refDe(rdvAno, rdvMes);
  const itens = itensRdvDoMes(ref);
  const total = itens.reduce((s, i) => s + i.valor, 0);
  const notas = itens.filter((i) => i.foto).length;

  document.getElementById('rdv-resumo').innerHTML = `
    <div style="font-size:12px;color:var(--text2)">Total a reembolsar em ${MESES_LABEL[rdvMes - 1]}</div>
    <div style="font-size:24px;font-weight:800;color:var(--primary);margin-top:2px">${fmtMoeda(total)}</div>
    <div style="font-size:12px;color:var(--text2);margin-top:2px">${itens.length} lançamento(s) · ${notas} nota(s) anexada(s)</div>`;

  document.getElementById('rdv-lista').innerHTML = itens.length
    ? itens.map((i) => `
      <div class="item" data-rdvid="${i.id}" data-origem="${i.origem}">
        <div class="linha1">
          <div class="ico-cat" style="background:var(--primary-cont)">${i.catIco}</div>
          <div class="meio">
            <div class="titulo">${escapar(i.descricao || i.catLabel)}</div>
            <div class="detalhe">${[fmtData(i.data), i.catLabel, i.forma, i.obs].filter(Boolean).map(escapar).join(' · ')}</div>
          </div>
          <div>
            <div class="valor">${fmtMoeda(i.valor)}</div>
            ${i.origem === 'veiculo' ? '<span class="badge reemb">Veículo</span>' : (i.foto ? '<span class="badge pago">📎 Nota</span>' : '')}
          </div>
        </div>
        <div class="acoes">
          ${i.foto ? '<button data-acao="foto">📷 Ver nota</button>' : ''}
          <button data-acao="editar">✏️ Editar</button>
          <button data-acao="excluir" class="perigo">🗑 Excluir</button>
        </div>
      </div>`).join('')
    : `<div class="card"><div class="vazio"><span class="ico">🧾</span><b>Nenhuma despesa RDV neste mês</b><span>Lance acima ou marque despesas do veículo como "Reembolsada pela empresa".</span></div></div>`;

  // Ações da lista
  document.getElementById('rdv-lista').querySelectorAll('.item').forEach((el) => {
    const id = Number(el.dataset.rdvid);
    const origem = el.dataset.origem;
    el.querySelectorAll('button[data-acao]').forEach((b) => {
      b.onclick = () => {
        if (origem === 'veiculo') {
          const d = despesas.find((x) => x.id === id);
          if (!d) return;
          if (b.dataset.acao === 'foto') abrirFoto(d.foto);
          if (b.dataset.acao === 'editar') abrirEdicaoDespesa(d, renderRdv);
          if (b.dataset.acao === 'excluir') {
            if (confirm('Esta despesa pertence ao controle do veículo. Excluir de lá também?')) {
              despesas = despesas.filter((x) => x.id !== id);
              salvarTudo(); renderRdv();
            }
          }
        } else {
          const r = rdv.find((x) => x.id === id);
          if (!r) return;
          if (b.dataset.acao === 'foto') abrirFoto(r.foto);
          if (b.dataset.acao === 'editar') abrirEdicaoRdv(r);
          if (b.dataset.acao === 'excluir') {
            if (confirm('Excluir esta despesa RDV?')) {
              rdv = rdv.filter((x) => x.id !== id);
              salvarTudo(); renderRdv(); toast('🗑 Despesa RDV excluída.');
            }
          }
        }
      };
    });
  });
  setTimeout(reencaixarRolagem, 0);
}

// Botão que abre o seletor da nota (listener em vez de onclick inline — CSP)
document.getElementById('rdv-foto-botao').onclick =
  () => document.getElementById('rdv-foto-input').click();

// Foto da nota (redimensionada)
document.getElementById('rdv-foto-input').addEventListener('change', async (e) => {
  const arq = e.target.files[0]; if (!arq) return;
  try {
    rdvFoto = await redimensionarFoto(arq);
    const img = document.getElementById('rdv-foto-prev');
    img.src = rdvFoto; img.style.display = 'block';
    document.getElementById('rdv-foto-remover').style.display = 'inline-block';
  } catch (err) { alert('Não foi possível anexar a foto.'); }
});
document.getElementById('rdv-foto-remover').onclick = () => {
  rdvFoto = null;
  document.getElementById('rdv-foto-prev').style.display = 'none';
  document.getElementById('rdv-foto-remover').style.display = 'none';
  document.getElementById('rdv-foto-input').value = '';
};

// Salvar lançamento RDV
document.getElementById('form-rdv').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = parseVal(document.getElementById('rdv-valor').value);
  const dataISO = document.getElementById('rdv-data').value;
  let erro = false;
  const eV = document.getElementById('rdv-erro-valor');
  const eD = document.getElementById('rdv-erro-data');
  eV.textContent = ''; eD.textContent = '';
  if (isNaN(v)) { eV.textContent = 'Informe o valor.'; erro = true; }
  else if (v <= 0) { eV.textContent = 'O valor deve ser maior que zero.'; erro = true; }
  if (!dataISO || !/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) { eD.textContent = 'Informe uma data válida.'; erro = true; }
  if (erro) return;

  rdv.push({
    id: novoId(),
    data: dataISO,
    categoria: rdvCategoria,
    valor: v,
    descricao: document.getElementById('rdv-descricao').value.trim() || null,
    obs: document.getElementById('rdv-obs').value.trim() || null,
    forma: rdvForma,
    foto: rdvFoto,
  });
  salvarTudo();
  document.getElementById('rdv-valor').value = '';
  document.getElementById('rdv-descricao').value = '';
  document.getElementById('rdv-obs').value = '';
  document.getElementById('rdv-foto-remover').onclick();
  // Salta o filtro para o mês do lançamento (feedback imediato)
  const [a, m] = dataISO.split('-').map(Number);
  rdvAno = a; rdvMes = m;
  renderRdv();
  toast('✅ Despesa RDV salva!');
});

// Edição de lançamento RDV (modal)
function abrirEdicaoRdv(r) {
  const corpo = document.getElementById('modal-rdv-corpo');
  const formas = config.formas_pagamento || [];
  corpo.innerHTML = `
    <label class="rotulo">Categoria</label><div class="chips" id="edr-cats"></div>
    <label class="rotulo">Valor (R$) *</label>
    <input id="edr-valor" inputmode="decimal" value="${String(r.valor).replace('.', ',')}">
    <div class="erro-campo" id="edr-erro"></div>
    <label class="rotulo">Data *</label>
    <input id="edr-data" type="date" value="${r.data}">
    <label class="rotulo">Descrição da nota</label>
    <input id="edr-desc" value="${escapar(r.descricao || '')}">
    <label class="rotulo">Observação</label>
    <input id="edr-obs" value="${escapar(r.obs || '')}">
    <label class="rotulo">Forma de pagamento</label>
    <div class="chips" id="edr-formas"></div>
    <button class="botao" id="edr-salvar">✓ Salvar alterações</button>`;

  let novaCat = r.categoria, novaForma = r.forma;
  const desenhaCats = () => renderChips(corpo.querySelector('#edr-cats'),
    CATEGORIAS_RDV.map((c) => ({ id: c.id, label: c.label, ico: c.ico })), novaCat,
    (id) => { novaCat = id; desenhaCats(); });
  desenhaCats();
  const desenhaFormas = () => renderChips(corpo.querySelector('#edr-formas'),
    formas.map((f) => ({ id: f, label: f })), novaForma,
    (id) => { novaForma = novaForma === id ? null : id; desenhaFormas(); });
  if (formas.length) desenhaFormas();

  corpo.querySelector('#edr-salvar').onclick = () => {
    const v = parseVal(corpo.querySelector('#edr-valor').value);
    const dataISO = corpo.querySelector('#edr-data').value;
    const erroEl = corpo.querySelector('#edr-erro');
    if (isNaN(v) || v <= 0) { erroEl.textContent = 'Valor inválido.'; return; }
    if (!dataISO) { erroEl.textContent = 'Data inválida.'; return; }
    Object.assign(r, {
      data: dataISO, categoria: novaCat, valor: v,
      descricao: corpo.querySelector('#edr-desc').value.trim() || null,
      obs: corpo.querySelector('#edr-obs').value.trim() || null,
      forma: novaForma,
    });
    salvarTudo(); fecharModal('modal-rdv'); renderRdv(); toast('✅ Despesa RDV atualizada!');
  };
  document.getElementById('modal-rdv').showModal();
}

// ---------- PDF mensal do RDV (com as notas ao final) ----------
document.getElementById('rdv-gerar-pdf').onclick = () => gerarRelatorioRdv(rdvAno, rdvMes, true);

async function gerarRelatorioRdv(ano, mes, registrar) {
  const ref = refDe(ano, mes);
  const itens = itensRdvDoMes(ref);
  if (!itens.length) { alert('Não há despesas RDV neste mês.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const VERDE = [27, 127, 76];
  const agora = new Date();
  const emitido = `${fmtData(hojeISO())} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  // Cabeçalho
  doc.setFontSize(16); doc.setTextColor(...VERDE); doc.setFont(undefined, 'bold');
  doc.text('RDV — Relatório de Despesas de Viagem', 14, 18);
  doc.setFontSize(9); doc.setTextColor(80); doc.setFont(undefined, 'normal');
  doc.text(`Colaborador: ${config.nome_colaborador || '—'}    Veículo: ${config.nome_veiculo || '—'}  ${config.placa || ''}`, 14, 25);
  doc.text(`Período: ${MESES_LABEL[mes - 1]}/${ano}    Emitido em: ${emitido}`, 14, 30);
  doc.setDrawColor(...VERDE); doc.setLineWidth(0.6); doc.line(14, 33, 196, 33);

  // Tabela de despesas
  const corpo = itens.map((i) => [
    fmtData(i.data), i.catLabel, i.descricao || '—',
    i.forma || '—', i.obs || '—', fmtMoeda(i.valor),
  ]);
  const total = itens.reduce((s, i) => s + i.valor, 0);
  corpo.push([
    { content: 'TOTAL A REEMBOLSAR', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [243, 248, 243] } },
    { content: fmtMoeda(total), styles: { fontStyle: 'bold', fillColor: [243, 248, 243] } },
  ]);
  doc.autoTable({
    startY: 38,
    head: [['Data', 'Categoria', 'Descrição', 'Pagamento', 'Observação', 'Valor']],
    body: corpo,
    theme: 'grid', headStyles: { fillColor: VERDE }, styles: { fontSize: 8 },
    columnStyles: { 5: { halign: 'right' } },
  });

  // Assinatura
  let yAss = doc.lastAutoTable.finalY + 28;
  if (yAss > 270) { doc.addPage(); yAss = 40; }
  doc.setDrawColor(60); doc.setLineWidth(0.3);
  doc.line(70, yAss, 140, yAss);
  doc.setFontSize(8); doc.setTextColor(90);
  doc.text('Assinatura', 105, yAss + 5, { align: 'center' });

  // ---------- Notas anexadas (uma por página) ----------
  const comNota = itens.filter((i) => i.foto);
  for (const i of comNota) {
    doc.addPage();
    doc.setFontSize(11); doc.setTextColor(...VERDE); doc.setFont(undefined, 'bold');
    doc.text('Nota anexada', 14, 16);
    doc.setFontSize(9); doc.setTextColor(60); doc.setFont(undefined, 'normal');
    doc.text(`${fmtData(i.data)} · ${i.catLabel} · ${i.descricao || 'sem descrição'} · ${fmtMoeda(i.valor)}`, 14, 22);
    try {
      const prop = doc.getImageProperties(i.foto);
      // Ajusta a imagem à página (máx. 180 × 245 mm), mantendo a proporção
      const maxW = 180, maxH = 245;
      const escala = Math.min(maxW / prop.width, maxH / prop.height);
      const w = prop.width * escala, h = prop.height * escala;
      doc.addImage(i.foto, 'JPEG', (210 - w) / 2, 30, w, h);
    } catch (e) {
      doc.setTextColor(150);
      doc.text('(não foi possível incluir a imagem desta nota)', 14, 34);
    }
  }

  doc.setFontSize(7); doc.setTextColor(150);
  doc.text('Documento gerado localmente pelo aplicativo Controle EV.', 105, 292, { align: 'center' });

  // Entrega (compartilhar quando possível, senão baixar)
  const nome = `relatorio-rdv-${ref}.pdf`;
  const blob = doc.output('blob');
  const arquivo = new (window.File || Blob)([blob], nome, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: nome }); }
    catch (e) { if (e.name !== 'AbortError') doc.save(nome); }
  } else {
    doc.save(nome);
  }

  if (registrar) {
    relatorios.push({ id: novoId(), tipo: 'rdv', ini: ref, fim: ref, nome, em: hojeISO() });
    salvarTudo();
  }
  toast('📄 Relatório RDV gerado!');
}

/* ================================================================
   BACKUP NA NUVEM — criptografado no aparelho antes de sair dele.
   - AES-GCM 256 bits; chave derivada da sua senha (PBKDF2, 200 mil
     iterações). Nem o GitHub consegue ler o conteúdo.
   - Destino: um Gist SECRETO na conta GitHub do usuário, acessado
     com um token restrito só a gists.
   - O token e a senha ficam somente neste aparelho (IndexedDB) e
     NUNCA entram no backup exportado.
   ================================================================ */
const ARQUIVO_NUVEM = 'controle-ev-backup.enc.json';

function montarBackupObj() {
  return {
    app: 'controle-ev', versao: 2, gerado_em: new Date().toISOString(),
    meses, despesas, config, relatorios, rdv,
  };
}

// ---------- criptografia (WebCrypto) ----------
function b64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function unb64(s) { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

// Nº de iterações do PBKDF2 para backups NOVOS (recomendação OWASP para
// PBKDF2-HMAC-SHA256). Pacotes antigos guardam o próprio valor no campo `iter`.
const PBKDF2_ITER = 600000;

async function chaveDaSenha(senha, salt, iteracoes) {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iteracoes, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/**
 * Valida a força da senha de criptografia. Retorna string de erro ou null.
 * Mínimo de 12 caracteres e não pode ser apenas dígitos.
 */
function validarSenhaBackup(senha) {
  if (!senha || senha.length < 12) {
    return 'A senha precisa ter pelo menos 12 caracteres.';
  }
  if (/^\d+$/.test(senha)) {
    return 'Use letras e números, não apenas números.';
  }
  return null;
}

async function criptografarBackup(obj, senha) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chave = await chaveDaSenha(senha, salt, PBKDF2_ITER);
  const cifrado = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, chave, new TextEncoder().encode(JSON.stringify(obj)));
  return JSON.stringify({
    app: 'controle-ev-backup-criptografado', v: 2, iter: PBKDF2_ITER,
    salt: b64(salt), iv: b64(iv), dados: b64(cifrado),
  });
}

async function descriptografarBackup(texto, senha) {
  const pacote = JSON.parse(texto);
  if (pacote.app !== 'controle-ev-backup-criptografado') {
    throw new Error('Este arquivo não é um backup criptografado do Controle EV.');
  }
  // Compatibilidade: pacotes v1 não tinham `iter` e usavam 200.000
  const iteracoes = pacote.iter || 200000;
  const chave = await chaveDaSenha(senha, unb64(pacote.salt), iteracoes);
  let aberto;
  try {
    aberto = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64(pacote.iv) }, chave, unb64(pacote.dados));
  } catch (e) {
    throw new Error('Senha incorreta (não foi possível descriptografar).');
  }
  return JSON.parse(new TextDecoder().decode(aberto));
}

// ---------- API do GitHub (Gists) ----------
async function apiGist(token, metodo, caminho, corpo) {
  const r = await fetch('https://api.github.com' + caminho, {
    method: metodo,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return r;
}

let timerBackup = null;
let backupPendente = false;

/** Agendada após cada gravação: espera 30 s de calmaria e envia. */
function agendarBackupAuto() {
  if (!nuvem || !nuvem.ativo) return;
  backupPendente = true;
  clearTimeout(timerBackup);
  timerBackup = setTimeout(() => backupNuvem(false), 30000);
}

/** Envia a cópia criptografada para o Gist secreto. */
async function backupNuvem(manual) {
  if (!nuvem || !nuvem.token || !nuvem.senha) {
    if (manual) toast('⚠️ Configure o token e a senha primeiro.');
    return;
  }
  if (!navigator.onLine) {
    backupPendente = true;
    if (manual) toast('📡 Sem internet — a cópia será enviada quando conectar.');
    return;
  }
  try {
    const conteudo = await criptografarBackup(montarBackupObj(), nuvem.senha);
    const arquivos = { [ARQUIVO_NUVEM]: { content: conteudo } };
    let r = null;
    if (nuvem.gist_id) {
      r = await apiGist(nuvem.token, 'PATCH', '/gists/' + nuvem.gist_id, { files: arquivos });
      if (r.status === 404) r = null; // gist foi apagado -> cria outro
    }
    if (!r) {
      r = await apiGist(nuvem.token, 'POST', '/gists', {
        description: 'Backup criptografado do Controle EV (conteúdo ilegível sem a senha)',
        public: false,
        files: arquivos,
      });
    }
    if (!r.ok) {
      const msg = r.status === 401 ? 'token inválido ou expirado' : 'erro ' + r.status;
      nuvem.ultimo_erro = msg;
      await IDB.set('nuvem', nuvem);
      if (manual) toast('⚠️ Falha no backup: ' + msg);
      return;
    }
    const g = await r.json();
    nuvem.gist_id = g.id;
    nuvem.ultimo_ok = new Date().toISOString();
    nuvem.ultimo_erro = null;
    backupPendente = false;
    ultimoBackupEm = nuvem.ultimo_ok;
    await IDB.set('nuvem', nuvem);
    await IDB.set('ultimo_backup', ultimoBackupEm);
    if (manual) toast('☁️ Cópia de segurança enviada!');
    if (document.getElementById('tela-config').classList.contains('ativa')) renderNuvemStatus();
  } catch (e) {
    if (manual) toast('⚠️ Falha no backup: ' + e.message);
  }
}

// Quando a internet voltar, envia a cópia que ficou pendente
window.addEventListener('online', () => { if (backupPendente) backupNuvem(false); });

/** Restaura os dados a partir do Gist (novo aparelho ou recuperação). */
async function restaurarDaNuvem(token, senha) {
  // Localiza o gist do backup (usa o conhecido ou procura na conta)
  let gistId = nuvem?.gist_id || null;
  if (!gistId) {
    const r = await apiGist(token, 'GET', '/gists?per_page=100');
    if (!r.ok) throw new Error(r.status === 401 ? 'Token inválido.' : 'Erro ao listar backups (' + r.status + ').');
    const lista = await r.json();
    const achado = lista.find((g) => g.files && g.files[ARQUIVO_NUVEM]);
    if (!achado) throw new Error('Nenhum backup do Controle EV foi encontrado nessa conta.');
    gistId = achado.id;
  }
  const r = await apiGist(token, 'GET', '/gists/' + gistId);
  if (!r.ok) throw new Error('Erro ao baixar o backup (' + r.status + ').');
  const g = await r.json();
  const arq = g.files[ARQUIVO_NUVEM];
  if (!arq) throw new Error('O backup não está neste gist.');
  const texto = arq.truncated ? await (await fetch(arq.raw_url)).text() : arq.content;
  const bk = await descriptografarBackup(texto, senha);
  const erro = validarBackup(bk);
  if (erro) throw new Error('Backup inválido: ' + erro);
  return { bk, gistId };
}

// ---------- interface da nuvem (tela Configurações) ----------
function renderNuvemStatus() {
  const el = document.getElementById('nuvem-status');
  if (!el) return;
  if (nuvem && nuvem.ativo) {
    const quando = nuvem.ultimo_ok
      ? new Date(nuvem.ultimo_ok).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : 'ainda não enviada';
    el.innerHTML = nuvem.ultimo_erro
      ? `🟡 Ativo, mas a última tentativa falhou (${escapar(nuvem.ultimo_erro)}).`
      : `🟢 Ativo · última cópia: ${quando}`;
    document.getElementById('nuvem-form').style.display = 'none';
    document.getElementById('nuvem-acoes').style.display = 'block';
  } else {
    el.innerHTML = '⚪ Inativo — seus dados existem apenas neste aparelho.';
    document.getElementById('nuvem-form').style.display = 'block';
    document.getElementById('nuvem-acoes').style.display = 'none';
  }
}

async function ativarNuvem() {
  const token = document.getElementById('nuvem-token').value.trim();
  const senha = document.getElementById('nuvem-senha').value;
  if (!token) return alert('Cole o token do GitHub (use o link acima para criar).');
  const erroSenha = validarSenhaBackup(senha);
  if (erroSenha) return alert(erroSenha + '\n\nIMPORTANTE: guarde essa senha! Sem ela o backup não pode ser lido — nem por você.');
  nuvem = { ativo: true, token, senha, gist_id: nuvem?.gist_id || null, ultimo_ok: null, ultimo_erro: null };
  await IDB.set('nuvem', nuvem);
  document.getElementById('nuvem-token').value = '';
  document.getElementById('nuvem-senha').value = '';
  renderNuvemStatus();
  toast('☁️ Backup automático ativado! Enviando a primeira cópia…');
  backupNuvem(true);
}

async function desativarNuvem() {
  if (!confirm('Desativar o backup automático? A cópia já enviada continua na sua conta GitHub, e seus dados locais não são afetados.')) return;
  nuvem = null;
  await IDB.set('nuvem', null);
  renderNuvemStatus();
  toast('Backup automático desativado.');
}

/**
 * Remove o token e a senha guardados neste aparelho, mantendo a referência
 * do backup (gist_id). O backup automático fica em pausa até recadastrar.
 */
async function esquecerCredenciaisNuvem() {
  if (!confirm('Apagar o token e a senha guardados NESTE aparelho?\n\nO backup na nuvem continua intacto. Para voltar a enviar cópias automáticas, você precisará colar o token e a senha novamente.')) return;
  nuvem = { ativo: false, token: null, senha: null, gist_id: nuvem?.gist_id || null, ultimo_ok: nuvem?.ultimo_ok || null, ultimo_erro: null };
  clearTimeout(timerBackup);
  await IDB.set('nuvem', nuvem);
  renderNuvemStatus();
  toast('🔒 Credenciais apagadas deste aparelho.');
}

async function aoRestaurarNuvem() {
  let token = nuvem?.token || document.getElementById('nuvem-token').value.trim();
  let senha = nuvem?.senha || document.getElementById('nuvem-senha').value;
  if (!token) return alert('Informe o token do GitHub para localizar o backup.');
  if (!senha) return alert('Informe a senha de criptografia usada no backup.');
  try {
    const { bk, gistId } = await restaurarDaNuvem(token, senha);
    if (!confirm(`Backup encontrado: ${bk.despesas.length} despesa(s) e ${bk.meses.length} mês(es), gerado em ${bk.gerado_em ? new Date(bk.gerado_em).toLocaleString('pt-BR') : 'data desconhecida'}.\n\nSubstituir os dados atuais deste aparelho?`)) return;
    meses = bk.meses; despesas = bk.despesas;
    config = { ...CONFIG_PADRAO, ...bk.config };
    relatorios = bk.relatorios || [];
    rdv = bk.rdv || [];
    sanearFotos(despesas); sanearFotos(rdv);
    config.formas_pagamento = Array.isArray(config.formas_pagamento)
      ? config.formas_pagamento.filter((f) => typeof f === 'string').slice(0, 30)
      : [...CONFIG_PADRAO.formas_pagamento];
    if (nuvem) { nuvem.gist_id = gistId; await IDB.set('nuvem', nuvem); }
    salvarTudo(); aplicarTema(); renderConfig();
    toast('✅ Dados restaurados da nuvem!');
  } catch (e) {
    alert('Não foi possível restaurar: ' + e.message);
  }
}

/* ---------------- aviso de backup atrasado (painel) ---------------- */
function renderAvisoBackup() {
  const el = document.getElementById('aviso-backup');
  if (!el) return;
  const temDados = despesas.length > 0 || meses.length > 0;
  const nuvemOk = nuvem && nuvem.ativo && !nuvem.ultimo_erro;
  const dias = ultimoBackupEm
    ? Math.floor((Date.now() - new Date(ultimoBackupEm).getTime()) / 86400000)
    : Infinity;
  if (temDados && !nuvemOk && dias > 7) {
    el.innerHTML = `<div class="card" style="border-color:var(--warn)">
      <div style="font-size:13px;color:var(--warn);font-weight:700">⚠️ Backup atrasado</div>
      <div style="font-size:12px;color:var(--text2);margin-top:3px">
        ${ultimoBackupEm ? `Sua última cópia de segurança foi há ${dias} dia(s).` : 'Você ainda não fez nenhuma cópia de segurança.'}
        Vá em <b>Config. → Backup</b> para exportar ou ativar o backup automático na nuvem.
      </div></div>`;
  } else {
    el.innerHTML = '';
  }
}

/* ---------------- inicialização (assíncrona) ---------------- */
async function bootar() {
  await IDB.abrir();
  meses = await IDB.get('meses');
  despesas = await IDB.get('despesas');
  config = await IDB.get('config');
  relatorios = (await IDB.get('relatorios')) || [];
  rdv = (await IDB.get('rdv')) || [];
  nuvem = await IDB.get('nuvem');
  ultimoBackupEm = await IDB.get('ultimo_backup');

  if (meses === null && despesas === null && config === null) {
    // Migração automática do formato antigo (localStorage)
    const lsM = lsAntigo('meses'), lsD = lsAntigo('despesas'), lsC = lsAntigo('config');
    if (lsM || lsD || lsC) {
      meses = lsM || []; despesas = lsD || [];
      config = { ...CONFIG_PADRAO, ...(lsC || {}) };
      relatorios = lsAntigo('relatorios') || [];
      salvarTudo();
      console.log('Dados migrados do armazenamento antigo para o IndexedDB.');
    } else {
      iniciarVazio(); // primeiro uso: sem dados de exemplo
    }
  }
  meses = meses || []; despesas = despesas || [];
  config = { ...CONFIG_PADRAO, ...(config || {}) };
  relatorios = relatorios || [];

  // Limpeza única: remove os antigos dados de DEMONSTRAÇÃO caso sejam
  // os únicos dados do aparelho (assinatura exata: 3 meses marcados
  // como demonstração + veículo/placa de exemplo intocados).
  // Qualquer dado real quebra a assinatura e NADA é apagado.
  const somenteDemo =
    meses.length === 3 &&
    meses.every((m) => m.obs === 'Dados de demonstração') &&
    config.nome_veiculo === 'Meu Veículo Elétrico' &&
    config.placa === 'ABC1D23' &&
    despesas.every((d) => !d.foto);
  if (somenteDemo) {
    iniciarVazio();
    console.log('Dados de demonstração antigos removidos automaticamente.');
  }

  // Pede ao sistema para NÃO apagar este armazenamento automaticamente
  try { navigator.storage?.persist?.(); } catch (e) {}

  aplicarTema();
  prepararLancar();
  renderPainel();
  window.appPronto = true;

  // Se ficou backup pendente de uma sessão anterior, tenta enviar
  if (nuvem && nuvem.ativo) backupNuvem(false);
}

window.addEventListener('resize', () => {
  if (window.appPronto && document.getElementById('tela-inicio').classList.contains('ativa')) renderPainel();
});

/* ---------------------------------------------------------------
   Correção de layout no iOS (app da tela de início):
   ao fechar o teclado ou quando um filtro encolhe a lista, a página
   fica "presa" rolada para cima e o cabeçalho some sob o relógio.
   Este reencaixe devolve a rolagem para dentro dos limites reais.
   --------------------------------------------------------------- */
function reencaixarRolagem() {
  const raiz = document.scrollingElement || document.documentElement;
  const max = Math.max(0, raiz.scrollHeight - window.innerHeight);
  const y = window.scrollY;
  if (y < 0) window.scrollTo(0, 0);
  else if (y > max) window.scrollTo(0, max);
}
// Ao sair de um campo (teclado fechando) e quando o teclado muda o viewport
document.addEventListener('focusout', () => setTimeout(reencaixarRolagem, 250));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => setTimeout(reencaixarRolagem, 120));
}

// Service worker: deixa o app 100% offline depois da primeira visita
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

bootar().catch((e) => {
  document.body.insertAdjacentHTML('beforeend',
    `<div style="position:fixed;inset:20px;background:var(--surface);border-radius:16px;padding:20px;z-index:999">
       <b>Não foi possível iniciar o aplicativo.</b><br>
       <span style="font-size:13px;color:var(--text2)">${escapar(e.message)}</span></div>`);
});
