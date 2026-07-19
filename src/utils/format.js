// ---------------------------------------------------------------
// Utilitários de formatação (moeda, datas, números) — pt-BR
// Nenhuma dependência externa: funciona 100% offline.
// ---------------------------------------------------------------

export const MESES_LABEL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

/** Formata um número como moeda brasileira: 1234.5 -> "R$ 1.234,50" */
export function formatMoeda(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
  const negativo = valor < 0;
  const abs = Math.abs(valor);
  const [inteiro, decimal] = abs.toFixed(2).split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}R$ ${comMilhar},${decimal}`;
}

/** Formata número com separador pt-BR: 1234.56 -> "1.234,56" */
export function formatNumero(valor, casas = 0) {
  if (valor === null || valor === undefined || isNaN(valor)) return '0';
  const [inteiro, decimal] = Number(valor).toFixed(casas).split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal ? `${comMilhar},${decimal}` : comMilhar;
}

/**
 * Converte texto digitado pelo usuário em número.
 * Aceita "1.234,56", "1234,56", "1234.56", "1234".
 * Retorna NaN se não for um número válido.
 */
export function parseValor(texto) {
  if (texto === null || texto === undefined) return NaN;
  let t = String(texto).trim();
  if (t === '') return NaN;
  // Se tem vírgula, ela é o separador decimal (padrão brasileiro)
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.');
  }
  const n = Number(t);
  return isFinite(n) ? n : NaN;
}

/** "2026-07-11" -> "11/07/2026" */
export function formatData(iso) {
  if (!iso || typeof iso !== 'string') return '—';
  const partes = iso.split('-');
  if (partes.length !== 3) return iso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/** "11/07/2026" -> "2026-07-11" (retorna null se inválida) */
export function parseDataBR(texto) {
  if (!texto) return null;
  const m = String(texto).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const ano = parseInt(m[3], 10);
  if (mes < 1 || mes > 12 || dia < 1 || ano < 2000 || ano > 2100) return null;
  // Valida o dia usando o próprio objeto Date (evita 31/02, por exemplo)
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Data de hoje no formato ISO "AAAA-MM-DD" (fuso local) */
export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "2026-07-11" -> "2026-07" (mês de referência da despesa) */
export function mesRefDaData(dataISO) {
  return dataISO ? dataISO.slice(0, 7) : null;
}

/** "2026-07" -> "Julho/2026" */
export function labelMesRef(mesRef) {
  if (!mesRef) return '—';
  const [ano, mes] = mesRef.split('-').map(Number);
  return `${MESES_LABEL[mes - 1]}/${ano}`;
}

/** Gera os últimos N meses (incluindo o atual) como [{ano, mes, mesRef}] em ordem cronológica */
export function ultimosMeses(n, anoBase, mesBase) {
  const hoje = new Date();
  let ano = anoBase ?? hoje.getFullYear();
  let mes = mesBase ?? hoje.getMonth() + 1;
  const lista = [];
  for (let i = 0; i < n; i++) {
    lista.unshift({ ano, mes, mesRef: `${ano}-${String(mes).padStart(2, '0')}` });
    mes -= 1;
    if (mes === 0) { mes = 12; ano -= 1; }
  }
  return lista;
}

/** Data e hora atuais formatadas: "11/07/2026 14:35" */
export function agoraFormatado() {
  const d = new Date();
  const data = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${data} ${hora}`;
}

/** Timestamp ISO completo para created_at / updated_at */
export function timestampAgora() {
  return new Date().toISOString();
}
