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
// Primeiro uso: o app começa VAZIO — grava apenas as configurações
// padrão (tarifa R$ 0,76/km). Executa uma única vez (chave
// seed_aplicado). As telas têm estados vazios amigáveis.
// ---------------------------------------------------------------
function seedSeNecessario() {
  const jaAplicado = db.getFirstSync(
    "SELECT valor FROM config WHERE chave = 'seed_aplicado'"
  );
  if (jaAplicado) return;

  const configPadrao = {
    tarifa_km: '0.76',
    nome_veiculo: '',
    placa: '',
    meta_km_mes: '0',
    custo_energia_casa_kwh: '0',
    padrao_reembolso: 'pago',
    tema: 'sistema',
    seed_aplicado: '1',
  };

  db.withTransactionSync(() => {
    for (const [chave, valor] of Object.entries(configPadrao)) {
      db.runSync(
        'INSERT OR IGNORE INTO config (chave, valor) VALUES (?, ?)',
        [chave, valor]
      );
    }
  });
}
