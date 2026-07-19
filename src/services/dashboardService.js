// ---------------------------------------------------------------
// Serviço do Dashboard — calcula todos os KPIs e séries dos
// gráficos para um ano/mês selecionado.
// Regra de ouro: NUNCA dividir por zero (retorna null -> exibe "—").
// ---------------------------------------------------------------
import { getDb } from '../database/db';
import { getConfig } from './configService';
import { ultimosMeses } from '../utils/format';

/**
 * Calcula os indicadores de um mês.
 * Retorna:
 * {
 *   km, reembolsoKm, totalDespesas, totalReembolsado, totalPago,
 *   custoTotal, custoPorKm (null se km = 0), tarifaKm, metaKm,
 *   porCategoria: [{categoria, total}],
 *   recargaForaUltimos12: [{mesRef, total}],
 * }
 */
export function getIndicadores(ano, mes) {
  const db = getDb();
  const cfg = getConfig();
  const mesRef = `${ano}-${String(mes).padStart(2, '0')}`;

  // Quilometragem do mês
  const linhaMes = db.getFirstSync(
    'SELECT km_rodados FROM meses WHERE ano = ? AND mes = ?',
    [ano, mes]
  );
  const km = linhaMes ? linhaMes.km_rodados : 0;

  // Totais de despesas do mês
  const tot = db.getFirstSync(
    `SELECT
       COALESCE(SUM(valor), 0) AS total,
       COALESCE(SUM(CASE WHEN reembolso = 'reembolsado' THEN valor ELSE 0 END), 0) AS reembolsado,
       COALESCE(SUM(CASE WHEN reembolso = 'pago' THEN valor ELSE 0 END), 0) AS pago
     FROM despesas WHERE mes_ref = ?`,
    [mesRef]
  );

  // Distribuição por categoria (gráfico de pizza)
  const porCategoria = db.getAllSync(
    `SELECT categoria, SUM(valor) AS total
     FROM despesas WHERE mes_ref = ?
     GROUP BY categoria ORDER BY total DESC`,
    [mesRef]
  );

  // Recarga fora de casa nos últimos 12 meses (gráfico de barras)
  const meses12 = ultimosMeses(12, ano, mes);
  const linhas = db.getAllSync(
    `SELECT mes_ref, SUM(valor) AS total
     FROM despesas
     WHERE categoria = 'recarga_fora' AND mes_ref BETWEEN ? AND ?
     GROUP BY mes_ref`,
    [meses12[0].mesRef, meses12[meses12.length - 1].mesRef]
  );
  const mapa = Object.fromEntries(linhas.map((l) => [l.mes_ref, l.total]));
  const recargaForaUltimos12 = meses12.map((m) => ({
    mesRef: m.mesRef,
    mes: m.mes,
    ano: m.ano,
    total: mapa[m.mesRef] || 0,
  }));

  const totalDespesas = tot.total;
  const reembolsoKm = km * cfg.tarifa_km;
  // NUNCA dividir por zero: custo por km só existe se houver km
  const custoPorKm = km > 0 ? totalDespesas / km : null;

  return {
    km,
    reembolsoKm,
    totalDespesas,
    totalReembolsado: tot.reembolsado,
    totalPago: tot.pago,
    custoTotal: totalDespesas,
    custoPorKm,
    tarifaKm: cfg.tarifa_km,
    metaKm: cfg.meta_km_mes,
    porCategoria,
    recargaForaUltimos12,
  };
}
