# Auditoria Técnica — Controle EV

Retrato fiel do sistema na data de geração deste documento (commit `1c334d2`).
Documento descritivo: registra o que existe, como está construído e configurado.

---

## 1. Identificação

| Item | Valor |
|---|---|
| Nome | Controle EV |
| Finalidade | Controle pessoal de quilometragem profissional, despesas de veículo elétrico e despesas de viagem reembolsáveis (RDV), com relatórios em PDF |
| Usuários | 1 (uso pessoal, sem autenticação) |
| Repositório | `github.com/marcoscesari18-design/controle-ev` (público) |
| App web publicado | `https://marcoscesari18-design.github.io/controle-ev/` (GitHub Pages) |
| APK Android | Aba *Releases* do repositório (tag `apk`, arquivo `controle-ev.apk`, ~93 MB) |
| Idioma da interface | Português do Brasil |
| Licença | Arquivo `LICENSE` na raiz (gerado pelo template Expo) |

O projeto contém **duas aplicações independentes** que não compartilham código nem
banco entre si (apenas o formato de backup JSON é compatível):

1. **Aplicativo nativo** (React Native + Expo) — raiz do repositório
2. **Aplicativo web / PWA** (HTML + JavaScript puro) — pasta `web/`

---

## 2. Stack

### 2.1 Aplicativo nativo

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | React Native | 0.86.0 |
| Framework | Expo SDK | ~57.0.4 |
| UI | React | 19.2.3 |
| Banco de dados | expo-sqlite (API síncrona) | ~57.0.0 |
| Navegação | @react-navigation/native + bottom-tabs | 7.3.8 / 7.18.8 |
| PDF | expo-print | ~57.0.0 |
| Compartilhamento | expo-sharing | ~57.0.3 |
| Arquivos | expo-file-system (API `File`/`Paths`, métodos `*Sync`) | ~57.0.0 |
| Fotos | expo-image-picker | ~57.0.2 |
| Seleção de arquivos | expo-document-picker | ~57.0.0 |
| Gráficos | react-native-gifted-charts | 1.4.77 |
| Ícones | @expo/vector-icons (Ionicons) + expo-font | 15.0.2 / ~57.0.0 |
| Suporte | react-native-svg, react-native-screens, react-native-safe-area-context, expo-linear-gradient, expo-status-bar | — |

Entry point: `index.js` → `App.js`. Scripts npm: `start`, `android`, `ios`, `web`
(todos via `expo start`).

### 2.2 Aplicativo web (PWA)

| Camada | Tecnologia |
|---|---|
| Base | HTML/CSS/JavaScript puro em arquivo único (`web/index.html`, 2.359 linhas), sem framework e sem etapa de build |
| Armazenamento | IndexedDB (banco `controle-ev`, object store `kv`); localStorage usado apenas como origem de migração de versões antigas |
| PDF | jsPDF 3.x + jspdf-autotable (arquivos locais em `web/js/`, sem CDN) |
| Gráficos | Canvas 2D desenhado manualmente (sem biblioteca) |
| Criptografia | WebCrypto nativo (AES-GCM 256 + PBKDF2) |
| Offline | Service worker (`web/sw.js`, cache versionado, estratégia cache-first) |
| Nuvem (opcional) | API REST do GitHub (Gists) via `fetch` |

---

## 3. Arquitetura

### 3.1 Nativo — estrutura em camadas

```
index.js                     registro do componente raiz
App.js                       inicialização do banco + tema + navegação (5 abas)
src/
├── screens/                 uma tela por aba
│   ├── InicioScreen.js      dashboard (KPIs, 3 gráficos, últimos lançamentos)
│   ├── LancarScreen.js      cadastro rápido (despesa ou KM)
│   ├── HistoricoScreen.js   consulta/edição (despesas e quilometragem)
│   ├── RelatoriosScreen.js  geração de PDFs e histórico de relatórios
│   └── ConfiguracoesScreen.js  preferências, tema, backup, limpeza
├── components/              UI reutilizável
│   ├── ui.js                Card, Botao, CampoTexto, Segmentos, Chips, EstadoVazio, KpiCard
│   ├── DespesaForm.js       formulário de despesa (criação e edição)
│   ├── KmForm.js            formulário de quilometragem (KM direto ou odômetro)
│   ├── DespesaItem.js       item de lista com ações
│   ├── SeletorMesAno.js     filtro ano/mês em chips
│   └── ModalFicha.js        modal de edição (folha deslizante)
├── services/                regras de negócio e acesso a dados
│   ├── configService.js     leitura/gravação da tabela config
│   ├── mesesService.js      upsert de quilometragem, listagens, anos disponíveis
│   ├── despesasService.js   CRUD + validação + regras por categoria
│   ├── dashboardService.js  cálculo de KPIs e séries dos gráficos
│   ├── relatorioService.js  HTML dos 2 modelos de PDF, geração, histórico
│   └── backupService.js     exportar/importar JSON, validação, apagar tudo
├── database/db.js           abertura do SQLite, migrações (PRAGMA user_version), config padrão
├── theme/theme.js           temas claro/escuro (Material Design 3) via Context
└── utils/
    ├── format.js            moeda/data/número pt-BR, parse, meses
    └── categorias.js        categorias de despesa e regras de campos
```

A inicialização do banco ocorre no carregamento do módulo `App.js` (API síncrona
do expo-sqlite), antes da montagem do React.

### 3.2 Web — arquivo único com seções

`web/index.html` concentra marcação, estilo e lógica, organizado em blocos:

1. `<head>`: meta viewport, CSP, referrer, manifest PWA, meta tags iOS, jsPDF local, CSS (variáveis de tema claro/escuro)
2. `<body>`: 6 seções `.tela` (uma por aba) + 3 `<dialog>` de edição + toast + `<nav>` inferior fixa
3. Script único com as seções: armazenamento (IDB), utilitários, seed vazio, tema,
   navegação, painel, gráficos canvas, lançar, modais de edição, histórico,
   relatórios (jsPDF), RDV, backup na nuvem (cripto + Gist), configurações,
   backup local, inicialização assíncrona (`bootar()`), correção de rolagem iOS

Arquivos auxiliares: `manifest.webmanifest`, `sw.js`, `icons/icon-192.png`,
`icons/icon-512.png`, `js/jspdf.umd.min.js`, `js/jspdf.plugin.autotable.min.js`.

---

## 4. Rotas / Navegação

### 4.1 Nativo — 5 abas fixas (React Navigation Bottom Tabs)

| Aba | Componente | Conteúdo |
|---|---|---|
| Início | InicioScreen | Filtros ano/mês; 6 KPIs; meta de KM; gráficos: barras 12 meses (recarga fora), pizza por categoria, comparativo reembolsado × pago; últimos 8 lançamentos com editar/excluir |
| Lançar | LancarScreen | Alternador Despesa/Quilometragem; formulários de cadastro rápido; feedback animado |
| Histórico | HistoricoScreen | Sub-abas Despesas (filtros ano/mês/categoria + busca; editar/duplicar/excluir) e Quilometragem (editar/excluir) |
| Relatórios | RelatoriosScreen | Modelo (KM ou KM+Despesas), período (mês ou intervalo), geração, compartilhamento, histórico com regenerar/excluir |
| Configurações | ConfiguracoesScreen | Tarifa/KM, veículo, placa, meta, custo kWh casa, padrão de reembolso, tema, exportar/importar backup, apagar tudo (dupla confirmação) |

### 4.2 Web — 6 abas (troca de seções via JavaScript, sem roteador)

| Aba | id da seção | Conteúdo adicional em relação ao nativo |
|---|---|---|
| Início | `tela-inicio` | + aviso de backup atrasado (>7 dias); + gráfico "RDV por categoria" (rosquinha com fatia "Veículo") |
| Lançar | `tela-lancar` | Igual ao nativo |
| RDV | `tela-rdv` | Filtro ano/mês; total do mês; formulário (categoria, valor, data, descrição, observação, forma de pagamento, foto da nota); lista unificada (RDV próprios + despesas do veículo reembolsadas, etiqueta "Veículo"); botão de PDF mensal |
| Histórico | `tela-historico` | Igual ao nativo |
| Relatórios | `tela-relatorios` | + tipo `rdv` no histórico de relatórios |
| Config. | `tela-config` | + cartão RDV (nome do colaborador, formas de pagamento); + cartão backup na nuvem; + dica de instalação na tela de início |

Modais (web): `modal-despesa`, `modal-km`, `modal-rdv`.

---

## 5. Modelo de dados

### 5.1 Nativo — SQLite (banco `controle_ev.db`, migração v1 via `PRAGMA user_version`)

**Tabela `meses`** — quilometragem mensal
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
ano INTEGER NOT NULL
mes INTEGER NOT NULL
km_rodados REAL NOT NULL DEFAULT 0
odometro_inicio REAL          -- nulo quando o KM foi digitado direto
odometro_fim REAL
observacao TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
UNIQUE (ano, mes)             -- upsert por ON CONFLICT
```

**Tabela `despesas`**
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
data TEXT NOT NULL            -- 'AAAA-MM-DD'
categoria TEXT NOT NULL       -- recarga_fora | recarga_casa | revisao | pneus | ipva | seguro | outros
valor REAL NOT NULL CHECK (valor >= 0)
descricao TEXT
local TEXT                    -- somente recarga_fora
kwh REAL                      -- somente recarga_fora
reembolso TEXT NOT NULL DEFAULT 'pago'   -- 'pago' | 'reembolsado'
anexo_foto TEXT               -- URI de arquivo copiado para a pasta do app
mes_ref TEXT NOT NULL         -- 'AAAA-MM' derivado da data
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
-- índices: idx_despesas_mes_ref, idx_despesas_data, idx_despesas_categoria
```

**Tabela `config`** — chave/valor (`chave TEXT PRIMARY KEY, valor TEXT`).
Chaves usadas: `tarifa_km` (padrão `0.76`), `nome_veiculo`, `placa`,
`meta_km_mes`, `custo_energia_casa_kwh`, `padrao_reembolso`, `tema`,
`seed_aplicado` (flag de primeira execução — grava apenas configurações padrão;
não há dados de exemplo).

**Tabela `relatorios`** — histórico de PDFs gerados
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
tipo TEXT NOT NULL            -- 'km' | 'completo'
periodo_inicio TEXT NOT NULL  -- 'AAAA-MM'
periodo_fim TEXT NOT NULL
nome_arquivo TEXT NOT NULL
created_at TEXT NOT NULL
```

### 5.2 Web — IndexedDB (banco `controle-ev`, store `kv`, chave→JSON)

| Chave | Conteúdo |
|---|---|
| `meses` | `[{id, ano, mes, km, odoIni, odoFim, obs}]` |
| `despesas` | `[{id, data, categoria, valor, descricao, local, kwh, reembolso, foto}]` — `foto` em data URL JPEG (redimensionada a máx. 800 px, qualidade 0,7) |
| `config` | `{tarifa_km, nome_veiculo, placa, meta_km_mes, custo_energia_casa_kwh, padrao_reembolso, tema, nome_colaborador, formas_pagamento[]}` |
| `relatorios` | `[{id, tipo('km'|'completo'|'rdv'), ini, fim, nome, em}]` |
| `rdv` | `[{id, data, categoria(refeicao|combustivel|hospedagem|pedagio|estacionamento|outros), valor, descricao, obs, forma, foto}]` |
| `nuvem` | `{ativo, token, senha, gist_id, ultimo_ok, ultimo_erro}` — excluída de todos os backups |
| `ultimo_backup` | timestamp ISO da última cópia de segurança (manual ou nuvem) |

IDs gerados por `Date.now() + aleatório`. Na primeira execução sem dados, o app
inicia vazio; se existirem chaves `cev_*` no localStorage (formato anterior),
elas são migradas uma única vez. Dados de demonstração antigos são removidos
automaticamente quando batem com assinatura exata (3 meses com observação
"Dados de demonstração" + veículo/placa de exemplo).

### 5.3 Formato de backup (compartilhado entre as duas aplicações)

```json
{
  "app": "controle-ev",
  "versao": 2,
  "gerado_em": "ISO-8601",
  "meses": [...], "despesas": [...], "config": {...},
  "relatorios": [...], "rdv": [...]        // rdv opcional (versões antigas)
}
```
Importação: validação estrutural (tipos, datas `AAAA-MM-DD`, valores ≥ 0,
reembolso ∈ {pago, reembolsado}), saneamento de anexos (somente
`data:image/...;base64`) e de `formas_pagamento` (strings, máx. 30), seguida de
substituição integral mediante confirmação.

### 5.4 Backup na nuvem (web, opcional)

- Conteúdo: o mesmo objeto de backup, criptografado no aparelho com AES-GCM 256;
  chave derivada de senha do usuário por PBKDF2 (SHA-256, 200.000 iterações,
  salt de 16 bytes, IV de 12 bytes); pacote `{app:'controle-ev-backup-criptografado', v:1, salt, iv, dados}` em base64
- Destino: Gist **secreto** na conta GitHub do usuário, arquivo
  `controle-ev-backup.enc.json`, via `POST/PATCH https://api.github.com/gists`
  com token pessoal (escopo `gist`) colado pelo usuário no app
- Disparo: 30 s após a última gravação (debounce), na abertura do app se houver
  pendência, no retorno da conexão (`online`) e manualmente
- Restauração: localiza o gist pelo nome do arquivo (ou id salvo), baixa
  (usa `raw_url` quando truncado), descriptografa, valida e substitui

---

## 6. Regras de negócio implementadas

- Quilometragem: um registro por ano+mês (upsert); dois métodos de entrada —
  KM direto ou odômetro início/fim (`km = fim − início`); valores negativos e
  odômetro final menor que o inicial são rejeitados
- Despesa: valor obrigatório, maior que zero; data validada; situação
  obrigatória (`pago`/`reembolsado`, padrão configurável); categoria
  `recarga_casa` não exibe nem grava kWh/local; `recarga_fora` tem kWh e local
  opcionais; demais categorias não têm esses campos
- KPIs: reembolso de KM = `km_rodados × tarifa_km`; custo por KM =
  `total de despesas ÷ km` com exibição de `—` quando `km = 0` (sem divisão por zero)
- RDV (web): despesas próprias por 6 categorias + inclusão automática (por
  consulta, sem duplicação de registros) das despesas do veículo com
  `reembolso = 'reembolsado'` no mês
- PDFs:
  - Modelo 1 "Relatório de KM": tabela mês/KM/tarifa/total, total do período, linha de assinatura
  - Modelo 2 "KM + Despesas": resumo de quilometragem, tabela de despesas com subtotais por categoria, totais (geral, reembolsável, pago, reembolso KM, custo total, custo/KM), assinatura
  - Modelo RDV (web): cabeçalho com colaborador/veículo/período, tabela
    (data, categoria, descrição, pagamento, observação, valor), total a
    reembolsar, assinatura e **todas as notas anexadas ao final, uma por página**
  - Histórico de relatórios permite regenerar o PDF com os dados atuais
- Limpeza total: dupla confirmação; restaura configurações padrão

---

## 7. Configurações

### 7.1 `app.json` (Expo — aplicativo nativo)

- `name`: "Controle EV" · `slug`: `controle-ev` · versão 1.0.0 · orientação retrato
- `userInterfaceStyle`: `automatic` (tema segue o sistema) · `primaryColor`: `#1B7F4C`
- iOS: `bundleIdentifier` `br.com.controleev.app`; textos de permissão de câmera e galeria (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`)
- Android: `package` `br.com.controleev.app`; ícone adaptativo (4 camadas em `assets/`)
- Plugins: `expo-sqlite`, `expo-sharing`, `expo-image-picker` (com textos de permissão), `expo-font`

### 7.2 PWA (`web/manifest.webmanifest` e meta tags)

- `display: standalone`, orientação retrato, `start_url`/`scope` `.`
- `theme_color` `#1B7F4C`, `background_color` `#F6FAF6`, idioma `pt-BR`
- Ícones 192 px (cantos transparentes) e 512 px (`purpose: any maskable`)
- iOS: `apple-mobile-web-app-capable`, status bar `black-translucent`,
  `apple-touch-icon` apontando para o ícone 512 (opaco)

### 7.3 Segurança (web)

- **Content-Security-Policy** (meta): `default-src 'self'`;
  `script-src 'self' 'unsafe-inline'`; `style-src 'self' 'unsafe-inline'`;
  `img-src 'self' data: blob:`;
  `connect-src 'self' https://api.github.com https://gist.githubusercontent.com`;
  `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`
- `referrer: no-referrer`
- Escape de HTML em todos os textos dinâmicos, incluindo contexto de atributo
  (`&`, `<`, `>`, `"`, `'`)
- Visualização de anexos restrita a `data:image/(jpeg|jpg|png|webp|gif);base64`
- Saneamento de anexos e formas de pagamento na importação/restauração
- Token e senha da nuvem armazenados apenas no IndexedDB local; nunca incluídos
  em exportações; campos de entrada `type="password"`
- `navigator.storage.persist()` solicitado na inicialização

### 7.4 Service worker (`web/sw.js`)

- Cache nomeado `controle-ev-v8` (versão incrementada a cada publicação)
- Pré-cache: `./`, `index.html`, `manifest.webmanifest`, os 2 arquivos jsPDF e os 2 ícones
- Instalação com `Request(..., {cache:'reload'})` (ignora o cache HTTP do navegador)
- `skipWaiting` + `clients.claim`; remoção de caches de versões anteriores na ativação
- Fetch: somente `GET` da mesma origem (requisições externas seguem direto à rede); cache-first com gravação em segundo plano; fallback para `index.html`

### 7.5 CI/CD (GitHub Actions)

**`publicar-web.yml`** — publica a pasta `web/` no GitHub Pages
- Gatilhos: push em `main` com mudanças em `web/**`; manual (`workflow_dispatch`)
- Passos: checkout → `configure-pages` → `upload-pages-artifact` (path `web`) → `deploy-pages`
- Permissões: `pages: write`, `id-token: write`; Pages configurado com source "GitHub Actions"

**`gerar-apk.yml`** — compila o APK Android
- Gatilho: manual (`workflow_dispatch`)
- Passos: checkout → Node 20 (cache npm) → Java 17 (Temurin) → `npm ci` →
  `expo prebuild --platform android --no-install` → `gradlew assembleRelease` →
  publica `controle-ev.apk` na release de tag `apk` (softprops/action-gh-release)
  e como artifact
- Permissão: `contents: write`

### 7.6 Outros arquivos de configuração

- `.gitignore`: template Expo (node_modules, .expo, dist, pastas nativas, chaves `*.jks/*.p8/*.p12/*.key/*.mobileprovision`, `.env*.local`, etc.)
- `.claude/settings.json`: habilita o plugin `expo@claude-plugins-official`
- `CLAUDE.md` → referencia `AGENTS.md` (nota sobre uso da documentação do Expo SDK 57)

---

## 8. Documentação existente (`docs/`)

| Arquivo | Assunto |
|---|---|
| `MANUAL_DE_USO.md` | Manual do usuário, tela a tela (inclui RDV) |
| `APP_IPHONE_PWA.md` | Publicação no Pages e instalação na tela de início do iPhone |
| `INSTALAR_IPHONE.md` | Alternativas nativas iOS (Expo Go, Mac+cabo, TestFlight) |
| `GERAR_APK_GITHUB.md` | Geração do APK pelo GitHub Actions |
| `GERAR_APK.md` | Geração do APK por EAS Build ou build local |
| `INSTALAR_APK.md` | Instalação do APK no Android |
| `BACKUP_NUVEM.md` | Ativação e recuperação do backup criptografado |
| `CHECKLIST_TESTES.md` | Checklist de testes das regras de negócio |
| `README.md` (raiz) | Visão geral, estrutura, execução em desenvolvimento, índice da documentação |

---

## 9. Histórico de versões (commits em `main`)

| Commit | Descrição |
|---|---|
| `ab09b84` | Initial commit (template Expo) |
| `95232e3` | App nativo completo + versão web PWA + automações GitHub |
| `4b2a8c5` | Correção do ícone iPhone (apple-touch-icon opaco) |
| `504f41e` | IndexedDB + backup automático criptografado na nuvem |
| `6154053` | Remoção dos dados de demonstração (início vazio) |
| `eb21eb6` | Nova aba RDV |
| `9782203` | Varredura de segurança (anti-XSS, CSP, atualização confiável) |
| `6b8cb1b` | Gráfico RDV por categoria no painel |
| `1c334d2` | Correção de layout iOS (reencaixe de rolagem) |
