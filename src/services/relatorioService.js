// ---------------------------------------------------------------
// Serviço de relatórios em PDF (expo-print + expo-sharing).
// - Modelo 1: Relatório de KM (com linha de assinatura)
// - Modelo 2: KM + Despesas (subtotais por categoria e totais)
// O PDF é gerado 100% no aparelho e só sai dele se o usuário
// compartilhar manualmente.
// ---------------------------------------------------------------
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { getDb } from '../database/db';
import { getConfig } from './configService';
import {
  formatMoeda, formatNumero, formatData, labelMesRef,
  agoraFormatado, timestampAgora, MESES_LABEL,
} from '../utils/format';
import { getCategoria, labelSituacao } from '../utils/categorias';

// ------------------------- consultas -------------------------

/** Lista os meses (tabela meses) dentro do período AAAA-MM..AAAA-MM */
function mesesDoPeriodo(inicio, fim) {
  const db = getDb();
  return db.getAllSync(
    `SELECT * FROM meses
     WHERE (ano || '-' || printf('%02d', mes)) BETWEEN ? AND ?
     ORDER BY ano, mes`,
    [inicio, fim]
  );
}

/** Lista as despesas do período, ordenadas por data */
function despesasDoPeriodo(inicio, fim) {
  const db = getDb();
  return db.getAllSync(
    'SELECT * FROM despesas WHERE mes_ref BETWEEN ? AND ? ORDER BY data, id',
    [inicio, fim]
  );
}

// ------------------------- HTML base -------------------------

const CSS = `
  <style>
    * { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    body { margin: 24px; color: #1a1a1a; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 2px 0; color: #1B7F4C; }
    .sub { color: #555; font-size: 11px; margin-bottom: 2px; }
    .cabecalho { border-bottom: 2px solid #1B7F4C; padding-bottom: 10px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { background: #E9F1E9; text-align: left; padding: 6px 8px; font-size: 11px;
         border-bottom: 1px solid #bbb; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e2e2; font-size: 11px; }
    .num { text-align: right; }
    .total-row td { font-weight: bold; background: #F3F8F3; border-top: 2px solid #1B7F4C; }
    .subtotal td { font-weight: bold; background: #FAFAFA; font-style: italic; }
    .bloco-resumo { background: #F3F8F3; border: 1px solid #D6E5D8; border-radius: 8px;
                    padding: 12px 16px; margin-bottom: 14px; }
    .bloco-resumo h2 { font-size: 13px; margin: 0 0 8px 0; color: #1B7F4C; }
    .kpis { width: 100%; }
    .kpis td { border: none; padding: 3px 8px 3px 0; }
    .assinatura { margin-top: 60px; text-align: center; }
    .assinatura .linha { border-top: 1px solid #333; width: 280px; margin: 0 auto; padding-top: 6px;
                         font-size: 11px; color: #444; }
    .rodape { margin-top: 24px; font-size: 9px; color: #999; text-align: center; }
  </style>
`;

/** Cabeçalho comum aos dois modelos */
function htmlCabecalho(titulo, cfg, inicio, fim) {
  const periodo = inicio === fim
    ? labelMesRef(inicio)
    : `${labelMesRef(inicio)} a ${labelMesRef(fim)}`;
  return `
    <div class="cabecalho">
      <h1>${titulo}</h1>
      <div class="sub"><b>Veículo:</b> ${cfg.nome_veiculo || '—'} &nbsp;&nbsp; <b>Placa:</b> ${cfg.placa || '—'}</div>
      <div class="sub"><b>Período:</b> ${periodo}</div>
      <div class="sub"><b>Emitido em:</b> ${agoraFormatado()}</div>
    </div>
  `;
}

function htmlAssinatura() {
  return `
    <div class="assinatura">
      <div class="linha">Assinatura</div>
    </div>
  `;
}

const RODAPE = `<div class="rodape">Documento gerado localmente pelo aplicativo Controle EV — os dados permanecem no aparelho.</div>`;

// ------------------------- Modelo 1: KM -------------------------

function htmlRelatorioKm(inicio, fim) {
  const cfg = getConfig();
  const meses = mesesDoPeriodo(inicio, fim);

  let linhas = '';
  let totalKm = 0;
  let totalValor = 0;
  for (const m of meses) {
    const valor = m.km_rodados * cfg.tarifa_km;
    totalKm += m.km_rodados;
    totalValor += valor;
    linhas += `
      <tr>
        <td>${MESES_LABEL[m.mes - 1]}/${m.ano}</td>
        <td class="num">${formatNumero(m.km_rodados)} km</td>
        <td class="num">${formatMoeda(cfg.tarifa_km)}</td>
        <td class="num">${formatMoeda(valor)}</td>
      </tr>`;
  }
  if (!meses.length) {
    linhas = `<tr><td colspan="4" style="text-align:center;color:#888">Nenhuma quilometragem registrada no período.</td></tr>`;
  }

  return `${CSS}
    ${htmlCabecalho('Relatório de Quilometragem', cfg, inicio, fim)}
    <table>
      <tr><th>Mês</th><th class="num">KM Rodados</th><th class="num">Tarifa por KM</th><th class="num">Total</th></tr>
      ${linhas}
      <tr class="total-row">
        <td>Total do período</td>
        <td class="num">${formatNumero(totalKm)} km</td>
        <td></td>
        <td class="num">${formatMoeda(totalValor)}</td>
      </tr>
    </table>
    ${htmlAssinatura()}
    ${RODAPE}
  `;
}

// --------------------- Modelo 2: KM + Despesas ---------------------

function htmlRelatorioCompleto(inicio, fim, comAssinatura = true) {
  const cfg = getConfig();
  const meses = mesesDoPeriodo(inicio, fim);
  const despesas = despesasDoPeriodo(inicio, fim);

  const totalKm = meses.reduce((s, m) => s + m.km_rodados, 0);
  const reembolsoKm = totalKm * cfg.tarifa_km;
  const totalGeral = despesas.reduce((s, d) => s + d.valor, 0);
  const totalReembolsado = despesas
    .filter((d) => d.reembolso === 'reembolsado')
    .reduce((s, d) => s + d.valor, 0);
  const totalPago = totalGeral - totalReembolsado;
  // NUNCA dividir por zero
  const custoPorKm = totalKm > 0 ? totalGeral / totalKm : null;

  // Bloco inicial: resumo da quilometragem
  const resumo = `
    <div class="bloco-resumo">
      <h2>Resumo da Quilometragem</h2>
      <table class="kpis">
        <tr><td><b>KM rodados no período:</b> ${formatNumero(totalKm)} km</td>
            <td><b>Tarifa por KM:</b> ${formatMoeda(cfg.tarifa_km)}</td>
            <td><b>Reembolso de KM:</b> ${formatMoeda(reembolsoKm)}</td></tr>
      </table>
    </div>
  `;

  // Tabela de despesas com subtotais por categoria
  let corpo = '';
  const grupos = new Map();
  for (const d of despesas) {
    if (!grupos.has(d.categoria)) grupos.set(d.categoria, []);
    grupos.get(d.categoria).push(d);
  }
  for (const [catId, itens] of grupos) {
    const cat = getCategoria(catId);
    let subtotal = 0;
    for (const d of itens) {
      subtotal += d.valor;
      corpo += `
        <tr>
          <td>${formatData(d.data)}</td>
          <td>${cat.label}</td>
          <td>${d.descricao || '—'}</td>
          <td class="num">${formatMoeda(d.valor)}</td>
          <td>${labelSituacao(d.reembolso)}</td>
        </tr>`;
    }
    corpo += `
      <tr class="subtotal">
        <td colspan="3">Subtotal — ${cat.label}</td>
        <td class="num">${formatMoeda(subtotal)}</td>
        <td></td>
      </tr>`;
  }
  if (!despesas.length) {
    corpo = `<tr><td colspan="5" style="text-align:center;color:#888">Nenhuma despesa registrada no período.</td></tr>`;
  }

  const totais = `
    <div class="bloco-resumo">
      <h2>Totais do Período</h2>
      <table class="kpis">
        <tr><td><b>Total geral de despesas:</b> ${formatMoeda(totalGeral)}</td>
            <td><b>Total reembolsável:</b> ${formatMoeda(totalReembolsado)}</td></tr>
        <tr><td><b>Total pago por mim:</b> ${formatMoeda(totalPago)}</td>
            <td><b>Reembolso por KM:</b> ${formatMoeda(reembolsoKm)}</td></tr>
        <tr><td><b>Custo total:</b> ${formatMoeda(totalGeral)}</td>
            <td><b>Custo por KM:</b> ${custoPorKm === null ? '—' : formatMoeda(custoPorKm)}</td></tr>
      </table>
    </div>
  `;

  return `${CSS}
    ${htmlCabecalho('Relatório de Quilometragem e Despesas', cfg, inicio, fim)}
    ${resumo}
    <table>
      <tr><th>Data</th><th>Categoria</th><th>Descrição</th><th class="num">Valor</th><th>Situação</th></tr>
      ${corpo}
    </table>
    ${totais}
    ${comAssinatura ? htmlAssinatura() : ''}
    ${RODAPE}
  `;
}

// ------------------------- geração e histórico -------------------------

/** Nome de arquivo amigável: relatorio-km-2026-04-a-2026-06.pdf */
function nomeArquivo(tipo, inicio, fim) {
  const base = inicio === fim ? inicio : `${inicio}-a-${fim}`;
  return `relatorio-${tipo === 'km' ? 'km' : 'completo'}-${base}.pdf`;
}

/**
 * Gera o PDF de um relatório e o salva na pasta de documentos do app.
 * tipo: 'km' | 'completo'. Retorna { ok, uri?, nome?, erro? }.
 * `registrarHistorico`: false ao regenerar a partir do histórico.
 */
export async function gerarRelatorio(tipo, inicio, fim, { registrarHistorico = true, comAssinatura = true } = {}) {
  try {
    if (!inicio || !fim) return { ok: false, erro: 'Selecione o período do relatório.' };
    if (inicio > fim) return { ok: false, erro: 'O mês inicial deve ser anterior ao final.' };

    const html = tipo === 'km'
      ? htmlRelatorioKm(inicio, fim)
      : htmlRelatorioCompleto(inicio, fim, comAssinatura);

    // Gera o PDF (arquivo temporário no cache)
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    // Move para a pasta de documentos com um nome legível
    const nome = nomeArquivo(tipo, inicio, fim);
    const destino = new File(Paths.document, nome);
    try {
      if (destino.exists) destino.delete();
      new File(uri).moveSync(destino);
    } catch (e) {
      // Se mover falhar (raro), usa o arquivo do cache mesmo
      return { ok: true, uri, nome };
    }

    if (registrarHistorico) {
      const db = getDb();
      db.runSync(
        `INSERT INTO relatorios (tipo, periodo_inicio, periodo_fim, nome_arquivo, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [tipo, inicio, fim, nome, timestampAgora()]
      );
    }

    return { ok: true, uri: destino.uri, nome };
  } catch (e) {
    return { ok: false, erro: 'Não foi possível gerar o PDF: ' + e.message };
  }
}

/** Compartilha um PDF já gerado (WhatsApp, e-mail, salvar etc.) */
export async function compartilharPdf(uri) {
  const disponivel = await Sharing.isAvailableAsync();
  if (!disponivel) {
    return { ok: false, erro: 'O compartilhamento não está disponível neste aparelho.' };
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Compartilhar relatório',
    UTI: 'com.adobe.pdf',
  });
  return { ok: true };
}

/** Histórico de relatórios gerados (mais recentes primeiro) */
export function listarHistoricoRelatorios() {
  const db = getDb();
  return db.getAllSync('SELECT * FROM relatorios ORDER BY id DESC');
}

/** Remove um item do histórico (o PDF pode ser recriado depois) */
export function excluirHistoricoRelatorio(id) {
  const db = getDb();
  db.runSync('DELETE FROM relatorios WHERE id = ?', [id]);
}

/**
 * Retorna a URI do PDF de um item do histórico, regenerando o
 * arquivo caso ele tenha sido removido do aparelho.
 */
export async function obterOuRegenerarPdf(itemHistorico) {
  const arquivo = new File(Paths.document, itemHistorico.nome_arquivo);
  if (arquivo.exists) return { ok: true, uri: arquivo.uri, nome: itemHistorico.nome_arquivo };
  // Arquivo não existe mais -> regenera com os mesmos parâmetros
  return gerarRelatorio(
    itemHistorico.tipo,
    itemHistorico.periodo_inicio,
    itemHistorico.periodo_fim,
    { registrarHistorico: false }
  );
}
