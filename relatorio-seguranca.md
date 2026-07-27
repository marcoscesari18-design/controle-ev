# Relatório de Segurança — Controle EV

**Referência:** commit `31b7d14` · **Mapa usado:** `auditoria.md`
**Método:** leitura do código-fonte completo (nativo e web), varredura de padrões
de segredos no repositório, inspeção dos cabeçalhos servidos em produção
(`curl -I` no GitHub Pages) e testes dinâmicos executados anteriormente no
navegador (injeção de HTML, anexo forjado, exfiltração bloqueada por CSP).
Toda afirmação traz evidência (arquivo:linha). O que não pôde ser confirmado
está marcado **NÃO VERIFICÁVEL**. Nenhum segredo é impresso neste documento.

**Contexto arquitetural relevante:** o sistema não possui backend próprio.
São duas aplicações locais (nativa e web) hospedadas de forma estática; o único
serviço externo consumido é a API de Gists do GitHub, opcional, autenticada com
token do próprio usuário (`web/index.html:2083`).

---

## Resumo

| Severidade | Quantidade | Situação |
|---|---|---|
| Crítico | 0 | — |
| Alto | 0 | — |
| Médio | 3 (M-01 a M-03) | M-01, M-02 corrigidos; M-03 mitigado |
| Baixo | 4 (B-01 a B-04) | B-01, B-03, B-04 corrigidos; B-02 limitação da hospedagem |
| Informativo | 3 (I-01 a I-03) | I-01 corrigido |

> **Atualização (commit posterior):** as correções do `plano-de-acao.md` foram
> aplicadas e verificadas no navegador. O status de cada achado aparece em
> **negrito** ao final da sua descrição. Este relatório mantém o texto original
> do diagnóstico; os números de linha referem-se ao commit `31b7d14`.

---

## 1. Resultado do checklist solicitado

### 1.1 Rotas de API sem autenticação — **NÃO APLICÁVEL** (com evidência)

Não existe API própria: a hospedagem é estática (GitHub Pages, workflow
`.github/workflows/publicar-web.yml:30-42`) e o app nativo não abre porta nem
expõe endpoint. A única chamada de rede do app web é à API oficial do GitHub,
sempre com `Authorization: Bearer <token do usuário>`
(`web/index.html:2083-2090`); a segunda chamada (`raw_url` de gist,
`web/index.html:2174`) baixa conteúdo que só existe em gist secreto da própria
conta. O service worker não intercepta chamadas externas
(`web/sw.js:40`).

### 1.2 IDOR / vazamento entre contas — **NÃO APLICÁVEL** (com evidência)

O sistema é mono-usuário, sem contas, sem sessões e sem IDs em URL: a navegação
troca seções na mesma página por JavaScript (`web/index.html`, função `irPara`)
e nenhum dado é buscado por identificador vindo de URL. O único recurso remoto
endereçável por ID é o gist de backup (`PATCH /gists/{id}`,
`web/index.html:2098-2101`); o controle de acesso desse recurso é exercido pelo
GitHub, que exige token da conta dona do gist — trocar o `gist_id` por um ID de
terceiro resulta em `404/403` da API, não em dado alheio.
**NÃO VERIFICÁVEL:** teste prático de troca de `gist_id` contra a API real não
foi executado (exigiria token e gists de duas contas).

### 1.3 Brute force — sem superfície de login; risco residual no backup cifrado

Não há login nem formulário de autenticação para forçar. A superfície real de
força bruta é **offline**: quem obtiver o arquivo cifrado do gist pode tentar
senhas contra o pacote AES-GCM. Proteções atuais: PBKDF2-HMAC-SHA256 com
200.000 iterações e salt aleatório de 16 bytes (`web/index.html:2049,2054`).
Fragilidades correlatas registradas como achados **M-01** (senha mínima de 6
caracteres) e **M-02** (contagem de iterações abaixo da recomendação atual).
Rate-limiting online é do GitHub (**NÃO VERIFICÁVEL** — comportamento declarado
pela plataforma, não testado).

### 1.4 SQL Injection — **protegido** (com evidência)

Aplica-se só ao app nativo (o web não usa SQL). Todas as consultas com entrada
do usuário usam parâmetros posicionais `?`:

- Inserção/atualização/exclusão de despesas: `src/services/despesasService.js:61, 86, 109, 126, 132`
- Filtros de listagem (ano, mês, categoria, busca `LIKE`): `src/services/despesasService.js:141-160` — todos via `params`
- Quilometragem (upsert e consultas): `src/services/mesesService.js:54, 72, 87`
- Dashboard: `src/services/dashboardService.js:26-56`
- Config e backup: `src/services/configService.js:37,49`; `src/services/backupService.js:138-166`

Única interpolação direta em SQL: `LIMIT ${parseInt(limite, 10)}`
(`src/services/despesasService.js:165`) — o valor passa por `parseInt`, que só
produz número ou `NaN`; não é vetor de injeção (ver achado de robustez I-01).
O parâmetro `limite` é usado apenas internamente pelo app
(`src/screens/InicioScreen.js`, chamada com `limite: 8`).

### 1.5 Captcha / Turnstile em formulários públicos — **NÃO APLICÁVEL**

Não existem formulários públicos processados por servidor: todos os formulários
gravam exclusivamente no armazenamento local do aparelho (IndexedDB/SQLite).
Não há endpoint que receba submissões, portanto não há o que proteger com
captcha.

### 1.6 Segredos escritos no código — **nenhum encontrado** (com evidência)

Varredura em todos os arquivos versionados com padrões de tokens GitHub
(`ghp_`, `gho_`, `github_pat_`), AWS (`AKIA…`), chaves privadas PEM, chaves
`sk-…`/`AIza…`: **zero ocorrências**. O placeholder `ghp_...` em
`web/index.html:446` é texto de exemplo do campo, não um token. Os workflows de
CI não usam secrets além do `GITHUB_TOKEN` implícito do Actions (nenhuma
referência a `secrets.*` em `.github/workflows/`). O token real do usuário
existe apenas em runtime, no IndexedDB do aparelho (`web/index.html:2206-2207`)
— ver achado M-03.

### 1.7 gitignore — **correto** (com evidência)

`.gitignore` cobre dependências (`node_modules/`, linha 4), artefatos de build
(`.expo/`, `dist/`, linhas 7-9), **chaves e certificados**
(`*.jks`, `*.p8`, `*.p12`, `*.key`, `*.mobileprovision`, linhas 15-19) e
variáveis de ambiente (`.env*.local`, linha 34). Conferência prática: os 55
arquivos versionados (`git ls-files`) não incluem nenhum item dessas classes.

---

## 2. Achados por severidade

### Crítico — nenhum

### Alto — nenhum

### Médio

**M-01 · Senha do backup cifrado aceita mínimo de 6 caracteres**
Evidência: `web/index.html:2205` (`senha.length < 6`) e placeholder na linha 448.
Impacto: senhas curtas reduzem drasticamente o custo de força bruta offline
contra o pacote cifrado armazenado no gist.
Condição de exploração: atacante precisa antes obter o arquivo do gist secreto
(token vazado ou conta GitHub comprometida).
**STATUS: CORRIGIDO (AC-01).** Mínimo elevado para 12 caracteres, senhas só numéricas recusadas (`validarSenhaBackup`).

**M-02 · PBKDF2 com 200.000 iterações**
Evidência: `web/index.html:2049`.
Impacto: abaixo da recomendação corrente do OWASP Password Storage Cheat Sheet
para PBKDF2-HMAC-SHA256 (600.000 iterações), reduzindo o custo de ataque
offline por senha testada.
**STATUS: CORRIGIDO (AC-02).** Iterações elevadas para 600.000; a contagem é gravada no pacote (`iter`) com fallback 200.000 para backups antigos.

**M-03 · Token do GitHub e senha de criptografia armazenados em texto claro no IndexedDB**
Evidência: gravação em `web/index.html:2206-2207` (`nuvem = { ativo: true, token, senha, ... }` → `IDB.set('nuvem', nuvem)`).
Impacto: qualquer código que venha a executar na origem do app (ex.: XSS futura)
ou acesso físico ao aparelho desbloqueado lê ambos os valores.
Mitigações já presentes: CSP restringe destinos de rede a `api.github.com`
(linha 9), o valor nunca entra em backups exportados
(`montarBackupObj`, `web/index.html:2016-2021`) e os campos de entrada são
`type="password"` (linhas 446, 448). Armazenar a credencial é requisito do
**STATUS: MITIGADO (AC-03).** Adicionado botão "Esquecer credenciais neste aparelho" e migração para token fine-grained de menor privilégio; persistir a credencial segue sendo requisito do backup automático.

### Baixo

**B-01 · CSP com `'unsafe-inline'` em `script-src`**
Evidência: `web/index.html:9`.
Impacto: a CSP não bloqueia execução de script inline injetado; a proteção
anti-XSS recai sobre o escape de saída (`escapar`, linha 985) e a barreira de
exfiltração fica com `connect-src`/`img-src`. Decorrência da arquitetura de
arquivo único com script embutido.
**STATUS: CORRIGIDO (AC-04).** Script movido para `app.js` externo; `'unsafe-inline'` removido de `script-src`. Bloqueio de script inline confirmado em teste.

**B-02 · Página pode ser incorporada em iframe de terceiros (clickjacking)**
Evidência: produção não envia `X-Frame-Options` (verificado por `curl -I`; o
GitHub Pages retornou apenas `strict-transport-security`), e `frame-ancestors`
não tem efeito em CSP declarada via `<meta>` (limitação da especificação; a CSP
do app está em meta tag, `web/index.html:9`).
Impacto: baixo no contexto (não há sessão autenticada para sequestrar cliques),
mas a incorporação é tecnicamente possível.
**STATUS: LIMITAÇÃO DA HOSPEDAGEM (B-02).** `frame-ancestors` não vale em CSP via `<meta>` e o GitHub Pages não envia cabeçalhos personalizados; correção exige mudar de hospedagem (AC-07, opcional).

**B-03 · Link de criação de token usa token clássico com escopo `gist` amplo**
Evidência: `web/index.html:441` (URL `settings/tokens/new?scopes=gist`).
Impacto: token clássico com escopo `gist` lê/escreve **todos** os gists da
conta, não apenas o gist do backup. Um token de granularidade fina (fine-grained)
limitado a Gists reduziria o privilégio em caso de vazamento.
**STATUS: CORRIGIDO (AC-05).** Link do app agora abre a criação de token fine-grained restrito a Gists.

**B-04 · Actions de CI referenciadas por tag mutável**
Evidência: `.github/workflows/gerar-apk.yml:24,27,33,53,65` e
`.github/workflows/publicar-web.yml:30,33,36,42` (`@v4`, `@v5`, `@v2`, `@v3`).
Impacto: tags podem ser movidas pelo mantenedor da action (risco de cadeia de
suprimentos no CI). Prática mais estrita é fixar por SHA de commit.
**STATUS: CORRIGIDO (AC-06).** Todas as actions dos dois workflows fixadas por SHA de commit.

### Informativo

**I-01 · `limite` não numérico gera SQL inválido (robustez, não injeção)**
Evidência: `src/services/despesasService.js:165` — `parseInt('abc')` → `NaN`
→ `LIMIT NaN` causaria erro de sintaxe SQL. Hoje o parâmetro só recebe o valor
interno `8`.
**STATUS: CORRIGIDO (AC-08).** `LIMIT` só é aplicado com inteiro positivo (`Number.isFinite`).

**I-02 · APK assinado com chave de depuração**
Evidência: processo descrito em `docs/GERAR_APK.md` (build `assembleRelease`
sem keystore própria) e workflow `gerar-apk.yml`. Adequado a uso pessoal;
impede publicação em loja e permite que outro APK "debug" o substitua.

**I-03 · Controles positivos verificados** (registro do que já protege o sistema)
- Escape de HTML incluindo atributos: `web/index.html:985-990`; teste dinâmico de injeção executado com bloqueio confirmado
- Visualização de anexos restrita a `data:image/...;base64`: `web/index.html:995-1008`
- Saneamento de anexos e formas de pagamento na importação/restauração: `web/index.html:1011-1016, 1674-1677, 2235-2238`
- CSP com `connect-src` restrito + `referrer no-referrer`: `web/index.html:9-10`; teste dinâmico de exfiltração bloqueado
- Service worker: só GET, só mesma origem, instalação com `cache:'reload'`: `web/sw.js:22,38,40`
- Criptografia do backup: AES-GCM 256, salt/IV aleatórios por cópia: `web/index.html:2049-2058`
- Validação estrutural de backups antes de importar: `web/index.html` (`validarBackup`) e `src/services/backupService.js:60-93`
- Confirmação dupla para apagar tudo: `web/index.html:1707-1708`; `src/screens/ConfiguracoesScreen.js`
- HSTS ativo em produção (`strict-transport-security: max-age=31556952`, resposta do Pages)
- Token nunca aparece em `console.log` (nenhuma ocorrência de log de `nuvem.token` no código)

---

## 3. NÃO VERIFICÁVEL (limites desta análise)

1. Comportamento do iOS/Safari em runtime (proteção do IndexedDB em repouso,
   isolamento do app da tela de início) — depende do aparelho e do sistema.
2. Configuração da conta GitHub do usuário (2FA, sessões ativas) — fora do repositório.
3. Rate limiting e controles anti-abuso da API do GitHub — comportamento da
   plataforma, não testado.
4. Teste prático de IDOR contra gists de terceiros (item 1.2) — não executado.
5. Integridade dos binários de dependências (`web/js/jspdf*.js`, `node_modules`)
   além da origem de instalação registrada no `package-lock.json`.
