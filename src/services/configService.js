// ---------------------------------------------------------------
// Serviço de configurações (tabela config: chave/valor).
// ---------------------------------------------------------------
import { getDb } from '../database/db';

// Valores padrão exigidos pela especificação
const PADROES = {
  tarifa_km: '0.76',
  nome_veiculo: '',
  placa: '',
  meta_km_mes: '0',
  custo_energia_casa_kwh: '0',
  padrao_reembolso: 'pago', // valor pré-selecionado no formulário de despesa
  tema: 'sistema',          // 'sistema' | 'claro' | 'escuro'
};

/** Lê todas as configurações, aplicando os padrões quando ausentes */
export function getConfig() {
  const db = getDb();
  const linhas = db.getAllSync('SELECT chave, valor FROM config');
  const cfg = { ...PADROES };
  for (const l of linhas) cfg[l.chave] = l.valor;
  return {
    tarifa_km: parseFloat(cfg.tarifa_km) || 0,
    nome_veiculo: cfg.nome_veiculo || '',
    placa: cfg.placa || '',
    meta_km_mes: parseFloat(cfg.meta_km_mes) || 0,
    custo_energia_casa_kwh: parseFloat(cfg.custo_energia_casa_kwh) || 0,
    padrao_reembolso: cfg.padrao_reembolso === 'reembolsado' ? 'reembolsado' : 'pago',
    tema: cfg.tema || 'sistema',
  };
}

/** Salva (insere ou atualiza) uma configuração */
export function setConfig(chave, valor) {
  const db = getDb();
  db.runSync(
    `INSERT INTO config (chave, valor) VALUES (?, ?)
     ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
    [chave, String(valor)]
  );
}

/** Salva várias configurações de uma vez */
export function setConfigVarias(objeto) {
  const db = getDb();
  db.withTransactionSync(() => {
    for (const [chave, valor] of Object.entries(objeto)) {
      db.runSync(
        `INSERT INTO config (chave, valor) VALUES (?, ?)
         ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
        [chave, String(valor)]
      );
    }
  });
}
