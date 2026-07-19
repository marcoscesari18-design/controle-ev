// ---------------------------------------------------------------
// Serviço de quilometragem mensal (tabela meses).
// Regras:
// - Cada combinação ano+mês é única (upsert).
// - Se houver odômetro inicial e final, km = fim - início.
// - Jamais permitir quilômetros negativos.
// ---------------------------------------------------------------
import { getDb } from '../database/db';
import { timestampAgora } from '../utils/format';

/**
 * Salva a quilometragem de um mês.
 * Recebe { ano, mes, kmDireto, odometroInicio, odometroFim, observacao }.
 * Retorna { ok, erro?, km? }.
 */
export function salvarKm({ ano, mes, kmDireto, odometroInicio, odometroFim, observacao }) {
  // Validações básicas
  if (!ano || !mes || mes < 1 || mes > 12) {
    return { ok: false, erro: 'Ano e mês inválidos.' };
  }

  let km = null;
  let odoIni = null;
  let odoFim = null;

  const temOdometro =
    odometroInicio !== null && odometroInicio !== undefined && !isNaN(odometroInicio) &&
    odometroFim !== null && odometroFim !== undefined && !isNaN(odometroFim);

  if (temOdometro) {
    // Método 2: odômetro inicial e final
    if (odometroInicio < 0 || odometroFim < 0) {
      return { ok: false, erro: 'O odômetro não pode ser negativo.' };
    }
    if (odometroFim < odometroInicio) {
      return { ok: false, erro: 'O odômetro final deve ser maior ou igual ao inicial.' };
    }
    km = odometroFim - odometroInicio;
    odoIni = odometroInicio;
    odoFim = odometroFim;
  } else {
    // Método 1: quilômetros digitados diretamente
    if (kmDireto === null || kmDireto === undefined || isNaN(kmDireto)) {
      return { ok: false, erro: 'Informe os KM rodados ou o odômetro inicial e final.' };
    }
    if (kmDireto < 0) {
      return { ok: false, erro: 'Os quilômetros não podem ser negativos.' };
    }
    km = kmDireto;
  }

  const agora = timestampAgora();
  const db = getDb();
  db.runSync(
    `INSERT INTO meses (ano, mes, km_rodados, odometro_inicio, odometro_fim, observacao, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (ano, mes) DO UPDATE SET
       km_rodados = excluded.km_rodados,
       odometro_inicio = excluded.odometro_inicio,
       odometro_fim = excluded.odometro_fim,
       observacao = excluded.observacao,
       updated_at = excluded.updated_at`,
    [ano, mes, km, odoIni, odoFim, observacao || null, agora, agora]
  );

  return { ok: true, km };
}

/** Busca o registro de um mês específico (ou null) */
export function getMes(ano, mes) {
  const db = getDb();
  return db.getFirstSync(
    'SELECT * FROM meses WHERE ano = ? AND mes = ?',
    [ano, mes]
  ) || null;
}

/** Lista todos os meses registrados, mais recentes primeiro */
export function listarMeses() {
  const db = getDb();
  return db.getAllSync('SELECT * FROM meses ORDER BY ano DESC, mes DESC');
}

/** Exclui o registro de quilometragem de um mês */
export function excluirMes(id) {
  const db = getDb();
  db.runSync('DELETE FROM meses WHERE id = ?', [id]);
}

/** Lista os anos que possuem registros (para os filtros) */
export function anosDisponiveis() {
  const db = getDb();
  const anosMeses = db.getAllSync('SELECT DISTINCT ano FROM meses');
  const anosDespesas = db.getAllSync(
    "SELECT DISTINCT CAST(substr(mes_ref, 1, 4) AS INTEGER) AS ano FROM despesas"
  );
  const set = new Set([
    ...anosMeses.map((r) => r.ano),
    ...anosDespesas.map((r) => r.ano),
    new Date().getFullYear(),
  ]);
  return [...set].sort((a, b) => b - a);
}
