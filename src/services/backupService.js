// ---------------------------------------------------------------
// Backup completo em JSON (exportar / importar).
// - Exportar: gera um arquivo JSON com TODOS os dados e abre a
//   janela de compartilhamento (o usuário decide para onde enviar).
// - Importar: lê um JSON escolhido pelo usuário, VALIDA a estrutura
//   e substitui os dados atuais (após confirmação na tela).
// ---------------------------------------------------------------
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { getDb } from '../database/db';
import { hojeISO } from '../utils/format';

const VERSAO_BACKUP = 1;

/** Monta o objeto de backup com todos os dados do banco */
export function montarBackup() {
  const db = getDb();
  return {
    app: 'controle-ev',
    versao: VERSAO_BACKUP,
    gerado_em: new Date().toISOString(),
    meses: db.getAllSync('SELECT * FROM meses'),
    despesas: db.getAllSync('SELECT * FROM despesas'),
    config: db.getAllSync('SELECT * FROM config'),
    relatorios: db.getAllSync('SELECT * FROM relatorios'),
  };
}

/** Exporta o backup para arquivo e abre o compartilhamento */
export async function exportarBackup() {
  try {
    const backup = montarBackup();
    const nome = `backup-controle-ev-${hojeISO()}.json`;
    const arquivo = new File(Paths.document, nome);
    if (arquivo.exists) arquivo.delete();
    arquivo.write(JSON.stringify(backup, null, 2));

    const disponivel = await Sharing.isAvailableAsync();
    if (disponivel) {
      await Sharing.shareAsync(arquivo.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar backup',
      });
    }
    return { ok: true, nome };
  } catch (e) {
    return { ok: false, erro: 'Falha ao exportar backup: ' + e.message };
  }
}

/**
 * Valida a estrutura de um backup antes de importar.
 * Retorna string de erro ou null se estiver tudo certo.
 */
export function validarBackup(obj) {
  if (!obj || typeof obj !== 'object') return 'Arquivo inválido: não é um JSON de backup.';
  if (obj.app !== 'controle-ev') return 'Este arquivo não é um backup do Controle EV.';
  if (!Array.isArray(obj.meses) || !Array.isArray(obj.despesas) || !Array.isArray(obj.config)) {
    return 'Estrutura do backup incompleta (faltam tabelas).';
  }
  for (const m of obj.meses) {
    if (typeof m.ano !== 'number' || typeof m.mes !== 'number' || m.mes < 1 || m.mes > 12) {
      return 'Backup corrompido: registro de mês inválido.';
    }
    if (typeof m.km_rodados !== 'number' || m.km_rodados < 0) {
      return 'Backup corrompido: quilometragem inválida.';
    }
  }
  for (const d of obj.despesas) {
    if (typeof d.valor !== 'number' || d.valor < 0) {
      return 'Backup corrompido: despesa com valor inválido.';
    }
    if (!d.data || !/^\d{4}-\d{2}-\d{2}$/.test(d.data)) {
      return 'Backup corrompido: despesa com data inválida.';
    }
    if (d.reembolso !== 'pago' && d.reembolso !== 'reembolsado') {
      return 'Backup corrompido: situação de reembolso inválida.';
    }
  }
  return null;
}

/**
 * Abre o seletor de arquivos e lê o conteúdo do backup escolhido.
 * Retorna { ok, backup?, erro?, cancelado? } — a substituição em si
 * é feita por aplicarBackup() depois que o usuário confirmar.
 */
export async function escolherArquivoBackup() {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return { ok: false, cancelado: true };

    const uri = res.assets?.[0]?.uri;
    if (!uri) return { ok: false, erro: 'Não foi possível ler o arquivo selecionado.' };

    let texto;
    try {
      texto = new File(uri).textSync();
    } catch (e) {
      return { ok: false, erro: 'Arquivo ilegível ou corrompido.' };
    }

    let backup;
    try {
      backup = JSON.parse(texto);
    } catch (e) {
      return { ok: false, erro: 'O arquivo não é um JSON válido.' };
    }

    const erro = validarBackup(backup);
    if (erro) return { ok: false, erro };

    return { ok: true, backup };
  } catch (e) {
    return { ok: false, erro: 'Falha ao abrir o arquivo: ' + e.message };
  }
}

/**
 * Substitui TODOS os dados atuais pelos do backup.
 * Deve ser chamada somente após a confirmação do usuário.
 */
export function aplicarBackup(backup) {
  const db = getDb();
  try {
    db.withTransactionSync(() => {
      db.runSync('DELETE FROM meses');
      db.runSync('DELETE FROM despesas');
      db.runSync('DELETE FROM config');
      db.runSync('DELETE FROM relatorios');

      for (const m of backup.meses) {
        db.runSync(
          `INSERT INTO meses (ano, mes, km_rodados, odometro_inicio, odometro_fim, observacao, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [m.ano, m.mes, m.km_rodados, m.odometro_inicio ?? null, m.odometro_fim ?? null,
           m.observacao ?? null, m.created_at ?? new Date().toISOString(), m.updated_at ?? new Date().toISOString()]
        );
      }
      for (const d of backup.despesas) {
        db.runSync(
          `INSERT INTO despesas (data, categoria, valor, descricao, local, kwh, reembolso, anexo_foto, mes_ref, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [d.data, d.categoria, d.valor, d.descricao ?? null, d.local ?? null, d.kwh ?? null,
           d.reembolso, d.anexo_foto ?? null, d.mes_ref ?? d.data.slice(0, 7),
           d.created_at ?? new Date().toISOString(), d.updated_at ?? new Date().toISOString()]
        );
      }
      for (const c of backup.config) {
        if (c.chave) {
          db.runSync('INSERT OR REPLACE INTO config (chave, valor) VALUES (?, ?)', [c.chave, c.valor ?? '']);
        }
      }
      // Garante que o seed não rode de novo por cima dos dados importados
      db.runSync("INSERT OR REPLACE INTO config (chave, valor) VALUES ('seed_aplicado', '1')");

      for (const r of backup.relatorios ?? []) {
        db.runSync(
          `INSERT INTO relatorios (tipo, periodo_inicio, periodo_fim, nome_arquivo, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [r.tipo, r.periodo_inicio, r.periodo_fim, r.nome_arquivo, r.created_at ?? new Date().toISOString()]
        );
      }
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: 'Falha ao importar: ' + e.message };
  }
}

/** Apaga TODOS os dados (usado pelo botão de limpeza, com dupla confirmação na tela) */
export function apagarTudo() {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM meses');
    db.runSync('DELETE FROM despesas');
    db.runSync('DELETE FROM relatorios');
    db.runSync("DELETE FROM config WHERE chave NOT IN ('seed_aplicado')");
    // Mantém seed_aplicado para não recriar os dados de demonstração
    db.runSync("INSERT OR REPLACE INTO config (chave, valor) VALUES ('seed_aplicado', '1')");
  });
}
