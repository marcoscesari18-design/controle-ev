// ---------------------------------------------------------------
// Serviço de despesas.
// Regras:
// - Valor obrigatório, nunca vazio, nunca negativo.
// - Toda despesa tem situação: 'pago' (paga por mim) ou 'reembolsado'.
// - recarga_casa: nunca grava kWh nem local (regra da especificação).
// - mes_ref é derivado automaticamente da data (AAAA-MM).
// ---------------------------------------------------------------
import { getDb } from '../database/db';
import { mesRefDaData, timestampAgora } from '../utils/format';
import { CATEGORIAS } from '../utils/categorias';

/** Valida os campos de uma despesa. Retorna string de erro ou null. */
function validarDespesa({ data, categoria, valor, reembolso }) {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return 'Informe uma data válida (dd/mm/aaaa).';
  }
  const d = new Date(data + 'T12:00:00');
  if (isNaN(d.getTime())) return 'Data inválida.';

  if (!categoria || !CATEGORIAS.some((c) => c.id === categoria)) {
    return 'Escolha uma categoria.';
  }
  if (valor === null || valor === undefined || isNaN(valor)) {
    return 'Informe o valor da despesa.';
  }
  if (valor < 0) return 'O valor não pode ser negativo.';
  if (valor === 0) return 'O valor não pode ser zero.';
  if (reembolso !== 'pago' && reembolso !== 'reembolsado') {
    return 'Escolha a situação: paga por mim ou reembolsada.';
  }
  return null;
}

/** Aplica as regras por categoria antes de gravar */
function normalizarPorCategoria(despesa) {
  const d = { ...despesa };
  if (d.categoria === 'recarga_casa') {
    // Recarga em casa: NUNCA kWh, NUNCA local, nunca calcula consumo
    d.kwh = null;
    d.local = null;
  } else if (d.categoria !== 'recarga_fora') {
    // Demais categorias não usam kWh nem local
    d.kwh = null;
    d.local = null;
  }
  if (d.kwh !== null && d.kwh !== undefined && (isNaN(d.kwh) || d.kwh < 0)) {
    d.kwh = null; // kWh inválido é simplesmente descartado (campo opcional)
  }
  return d;
}

/** Insere uma despesa. Retorna { ok, erro?, id? }. */
export function inserirDespesa(despesa) {
  const erro = validarDespesa(despesa);
  if (erro) return { ok: false, erro };

  const d = normalizarPorCategoria(despesa);
  const agora = timestampAgora();
  const db = getDb();
  const res = db.runSync(
    `INSERT INTO despesas
       (data, categoria, valor, descricao, local, kwh, reembolso, anexo_foto, mes_ref, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.data, d.categoria, d.valor,
      d.descricao?.trim() || null,
      d.local?.trim() || null,
      d.kwh ?? null,
      d.reembolso,
      d.anexo_foto || null,
      mesRefDaData(d.data),
      agora, agora,
    ]
  );
  return { ok: true, id: res.lastInsertRowId };
}

/** Atualiza uma despesa existente. Retorna { ok, erro? }. */
export function atualizarDespesa(id, despesa) {
  const erro = validarDespesa(despesa);
  if (erro) return { ok: false, erro };

  const d = normalizarPorCategoria(despesa);
  const db = getDb();
  db.runSync(
    `UPDATE despesas SET
       data = ?, categoria = ?, valor = ?, descricao = ?, local = ?,
       kwh = ?, reembolso = ?, anexo_foto = ?, mes_ref = ?, updated_at = ?
     WHERE id = ?`,
    [
      d.data, d.categoria, d.valor,
      d.descricao?.trim() || null,
      d.local?.trim() || null,
      d.kwh ?? null,
      d.reembolso,
      d.anexo_foto || null,
      mesRefDaData(d.data),
      timestampAgora(),
      id,
    ]
  );
  return { ok: true };
}

/** Duplica uma despesa (cópia idêntica, útil para gastos recorrentes) */
export function duplicarDespesa(id) {
  const db = getDb();
  const original = db.getFirstSync('SELECT * FROM despesas WHERE id = ?', [id]);
  if (!original) return { ok: false, erro: 'Despesa não encontrada.' };
  return inserirDespesa({
    data: original.data,
    categoria: original.categoria,
    valor: original.valor,
    descricao: original.descricao,
    local: original.local,
    kwh: original.kwh,
    reembolso: original.reembolso,
    anexo_foto: null, // a foto não é duplicada (evita referência dupla ao mesmo arquivo)
  });
}

/** Exclui uma despesa */
export function excluirDespesa(id) {
  const db = getDb();
  db.runSync('DELETE FROM despesas WHERE id = ?', [id]);
}

/** Busca uma despesa pelo id */
export function getDespesa(id) {
  const db = getDb();
  return db.getFirstSync('SELECT * FROM despesas WHERE id = ?', [id]) || null;
}

/**
 * Lista despesas com filtros opcionais:
 * { ano, mes, categoria, busca, limite }
 * Sempre ordenadas da mais recente para a mais antiga.
 */
export function listarDespesas({ ano, mes, categoria, busca, limite } = {}) {
  const db = getDb();
  const cond = [];
  const params = [];

  if (ano && mes) {
    cond.push('mes_ref = ?');
    params.push(`${ano}-${String(mes).padStart(2, '0')}`);
  } else if (ano) {
    cond.push("substr(mes_ref, 1, 4) = ?");
    params.push(String(ano));
  }
  if (categoria) {
    cond.push('categoria = ?');
    params.push(categoria);
  }
  if (busca && busca.trim()) {
    cond.push('(descricao LIKE ? OR local LIKE ?)');
    const like = `%${busca.trim()}%`;
    params.push(like, like);
  }

  let sql = 'SELECT * FROM despesas';
  if (cond.length) sql += ' WHERE ' + cond.join(' AND ');
  sql += ' ORDER BY data DESC, id DESC';
  if (limite) sql += ` LIMIT ${parseInt(limite, 10)}`;

  return db.getAllSync(sql, params);
}
