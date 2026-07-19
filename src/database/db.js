// ---------------------------------------------------------------
// Banco de dados SQLite local (expo-sqlite).
// - Criação das tabelas com migrações controladas por PRAGMA user_version
// - Dados de demonstração (3 meses) inseridos apenas no primeiro uso
// Nenhum dado sai do aparelho.
// ---------------------------------------------------------------
import * as SQLite from 'expo-sqlite';
import { timestampAgora } from '../utils/format';

const db = SQLite.openDatabaseSync('controle_ev.db');

/** Retorna a instância única do banco */
export function getDb() {
  return db;
}

/**
 * Inicializa o banco: aplica migrações e, se for o primeiro uso,
 * insere os dados de demonstração.
 */
export function initDatabase() {
  db.execSync('PRAGMA journal_mode = WAL;');
  db.execSync('PRAGMA foreign_keys = ON;');

  const { user_version: versao } = db.getFirstSync('PRAGMA user_version');

  if (versao < 1) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS meses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ano INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        km_rodados REAL NOT NULL DEFAULT 0,
        odometro_inicio REAL,
        odometro_fim REAL,
        observacao TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (ano, mes)
      );

      CREATE TABLE IF NOT EXISTS despesas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        categoria TEXT NOT NULL,
        valor REAL NOT NULL CHECK (valor >= 0),
        descricao TEXT,
        local TEXT,
        kwh REAL,
        reembolso TEXT NOT NULL DEFAULT 'pago',
        anexo_foto TEXT,
        mes_ref TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_despesas_mes_ref ON despesas (mes_ref);
      CREATE INDEX IF NOT EXISTS idx_despesas_data ON despesas (data);
      CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas (categoria);

      CREATE TABLE IF NOT EXISTS config (
        chave TEXT PRIMARY KEY,
        valor TEXT
      );

      CREATE TABLE IF NOT EXISTS relatorios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,           -- 'km' ou 'completo'
        periodo_inicio TEXT NOT NULL, -- 'AAAA-MM'
        periodo_fim TEXT NOT NULL,    -- 'AAAA-MM'
        nome_arquivo TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      PRAGMA user_version = 1;
    `);
  }

  seedSeNecessario();
}

// ---------------------------------------------------------------
// Dados de demonstração — 3 meses com despesas de todas as
// categorias, misturando "paga por mim" e "reembolsada".
// Executa uma única vez (controlado pela chave seed_aplicado).
// ---------------------------------------------------------------
function seedSeNecessario() {
  const jaAplicado = db.getFirstSync(
    "SELECT valor FROM config WHERE chave = 'seed_aplicado'"
  );
  if (jaAplicado) return;

  const agora = timestampAgora();

  // Configurações padrão
  const configPadrao = {
    tarifa_km: '0.76',
    nome_veiculo: 'Meu Veículo Elétrico',
    placa: 'ABC1D23',
    meta_km_mes: '1500',
    custo_energia_casa_kwh: '0.92',
    padrao_reembolso: 'pago',
    tema: 'sistema',
    seed_aplicado: '1',
  };

  // Últimos 3 meses fechados (relativos à data atual do aparelho)
  const hoje = new Date();
  const meses = [];
  for (let i = 3; i >= 1; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({ ano: d.getFullYear(), mes: d.getMonth() + 1 });
  }
  const ref = (m) => `${m.ano}-${String(m.mes).padStart(2, '0')}`;
  const dia = (m, d) => `${ref(m)}-${String(d).padStart(2, '0')}`;

  const kmPorMes = [1480, 1620, 1385];
  const odometroBase = 24500;

  // Despesas fictícias: todas as categorias, situações misturadas
  const despesas = [
    // Mês 1
    { m: 0, d: 3,  cat: 'recarga_casa', v: 118.4, desc: 'Recarga noturna em casa', reemb: 'pago' },
    { m: 0, d: 7,  cat: 'recarga_fora', v: 64.9,  desc: 'Recarga rápida na estrada', local: 'Eletroposto BR-101', kwh: 38.5, reemb: 'reembolsado' },
    { m: 0, d: 12, cat: 'ipva',         v: 890.0, desc: 'Parcela 1/3 do IPVA', reemb: 'pago' },
    { m: 0, d: 18, cat: 'recarga_fora', v: 52.3,  desc: 'Recarga no shopping', local: 'Shopping Center Norte', kwh: 30.0, reemb: 'pago' },
    { m: 0, d: 25, cat: 'outros',       v: 45.0,  desc: 'Lavagem completa', reemb: 'pago' },
    // Mês 2
    { m: 1, d: 2,  cat: 'recarga_casa', v: 131.2, desc: 'Recargas em casa no mês', reemb: 'pago' },
    { m: 1, d: 9,  cat: 'recarga_fora', v: 71.8,  desc: 'Recarga em viagem a trabalho', local: 'Posto Ipiranga km 220', kwh: 42.1, reemb: 'reembolsado' },
    { m: 1, d: 14, cat: 'revisao',      v: 650.0, desc: 'Revisão de 30.000 km', reemb: 'reembolsado' },
    { m: 1, d: 20, cat: 'seguro',       v: 385.5, desc: 'Parcela mensal do seguro', reemb: 'pago' },
    { m: 1, d: 27, cat: 'recarga_fora', v: 48.6,  desc: 'Recarga rápida centro', local: 'Estação Recarga Centro', kwh: 27.4, reemb: 'pago' },
    // Mês 3
    { m: 2, d: 4,  cat: 'recarga_casa', v: 109.7, desc: 'Recargas em casa no mês', reemb: 'pago' },
    { m: 2, d: 8,  cat: 'pneus',        v: 1280.0, desc: 'Troca de 2 pneus dianteiros', reemb: 'reembolsado' },
    { m: 2, d: 15, cat: 'recarga_fora', v: 59.4,  desc: 'Recarga em visita a cliente', local: 'Eletroposto Av. Paulista', kwh: 33.8, reemb: 'reembolsado' },
    { m: 2, d: 22, cat: 'seguro',       v: 385.5, desc: 'Parcela mensal do seguro', reemb: 'pago' },
    { m: 2, d: 28, cat: 'outros',       v: 89.9,  desc: 'Palhetas do limpador', reemb: 'pago' },
  ];

  db.withTransactionSync(() => {
    // Configurações
    for (const [chave, valor] of Object.entries(configPadrao)) {
      db.runSync(
        'INSERT OR IGNORE INTO config (chave, valor) VALUES (?, ?)',
        [chave, valor]
      );
    }

    // Meses com quilometragem (usando odômetro para demonstrar o cálculo)
    let odo = odometroBase;
    meses.forEach((m, i) => {
      const inicio = odo;
      const fim = odo + kmPorMes[i];
      odo = fim;
      db.runSync(
        `INSERT OR IGNORE INTO meses
           (ano, mes, km_rodados, odometro_inicio, odometro_fim, observacao, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.ano, m.mes, kmPorMes[i], inicio, fim, 'Dados de demonstração', agora, agora]
      );
    });

    // Despesas
    for (const dsp of despesas) {
      const m = meses[dsp.m];
      const data = dia(m, dsp.d);
      db.runSync(
        `INSERT INTO despesas
           (data, categoria, valor, descricao, local, kwh, reembolso, anexo_foto, mes_ref, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
        [data, dsp.cat, dsp.v, dsp.desc, dsp.local ?? null, dsp.kwh ?? null, dsp.reemb, ref(m), agora, agora]
      );
    }

    // Histórico de relatórios de demonstração
    db.runSync(
      `INSERT INTO relatorios (tipo, periodo_inicio, periodo_fim, nome_arquivo, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      ['km', ref(meses[0]), ref(meses[2]), `relatorio-km-${ref(meses[0])}-a-${ref(meses[2])}.pdf`, agora]
    );
    db.runSync(
      `INSERT INTO relatorios (tipo, periodo_inicio, periodo_fim, nome_arquivo, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      ['completo', ref(meses[2]), ref(meses[2]), `relatorio-completo-${ref(meses[2])}.pdf`, agora]
    );
  });
}
