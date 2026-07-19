// ---------------------------------------------------------------
// Categorias de despesa e regras de exibição por categoria.
// ---------------------------------------------------------------

export const CATEGORIAS = [
  { id: 'recarga_fora', label: 'Recarga fora', icone: 'flash', cor: '#1E88E5' },
  { id: 'recarga_casa', label: 'Recarga em casa', icone: 'home', cor: '#43A047' },
  { id: 'revisao', label: 'Revisão', icone: 'construct', cor: '#FB8C00' },
  { id: 'pneus', label: 'Pneus', icone: 'disc', cor: '#6D4C41' },
  { id: 'ipva', label: 'IPVA', icone: 'document-text', cor: '#8E24AA' },
  { id: 'seguro', label: 'Seguro', icone: 'shield-checkmark', cor: '#00ACC1' },
  { id: 'outros', label: 'Outros', icone: 'pricetag', cor: '#546E7A' },
];

/** Busca a categoria pelo id (retorna "outros" como fallback seguro) */
export function getCategoria(id) {
  return CATEGORIAS.find((c) => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1];
}

/**
 * Regras de campos por categoria:
 * - recarga_casa: mostra apenas valor (NUNCA kWh, NUNCA local, NUNCA calcula consumo)
 * - recarga_fora: valor obrigatório; kWh e local opcionais
 * - demais: valor obrigatório; sem kWh e sem local
 */
export function camposDaCategoria(categoriaId) {
  if (categoriaId === 'recarga_fora') {
    return { mostraKwh: true, mostraLocal: true };
  }
  return { mostraKwh: false, mostraLocal: false };
}

// Situação financeira da despesa
export const SITUACOES = [
  { id: 'pago', label: 'Paga por mim' },
  { id: 'reembolsado', label: 'Reembolsada pela empresa' },
];

export function labelSituacao(id) {
  const s = SITUACOES.find((x) => x.id === id);
  return s ? s.label : id;
}
