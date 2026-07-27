# Plano de Ação — Segurança

Correções derivadas de `relatorio-seguranca.md`, ordenadas do mais grave ao mais
leve. Cada item é pequeno, isolado e testável. Nenhum depende do outro, salvo
onde indicado. Como não há achados Crítico/Alto, o plano começa em Médio.

Legenda de esforço: **P** pequeno (poucas linhas) · **M** médio.

---

## Prioridade 1 — Médios

### AC-01 · Exigir senha de backup mais forte  _(ref. M-01 · esforço P)_
- **Arquivo/linha:** `web/index.html:2205`
- **Mudança:** elevar o mínimo de 6 para 12 caracteres e recusar senhas só
  numéricas; ajustar o texto do placeholder (linha 448) e a mensagem de alerta.
- **Teste 1:** ativar backup com senha `12345` → deve ser recusada com aviso.
- **Teste 2:** ativar com `senhaForte2026!` → deve ser aceita e enviar a 1ª cópia.
- **Teste 3 (regressão):** um backup criado com a senha antiga ainda restaura
  normalmente (a regra nova vale só na criação, não afeta pacotes existentes).

### AC-02 · Aumentar iterações do PBKDF2 para 600.000  _(ref. M-02 · esforço P)_
- **Arquivo/linha:** `web/index.html:2049`
- **Mudança:** `iterations: 200000` → `iterations: 600000`. Gravar a contagem
  usada dentro do pacote cifrado (campo `iter`) e, na descriptografia
  (`web/index.html:2065-2073`), usar `pacote.iter || 200000` para manter
  compatibilidade com backups antigos.
- **Teste 1:** criar backup novo, restaurar em seguida → sucesso (round-trip).
- **Teste 2:** restaurar um pacote antigo (sem campo `iter`) → deve abrir usando
  o fallback 200.000.
- **Teste 3:** medir o tempo de cifragem no iPhone-alvo (deve ficar < 1 s;
  se exceder muito, calibrar o número).

### AC-03 · Reduzir exposição do token/senha em repouso  _(ref. M-03 · esforço M)_
Quebrado em partes independentes:
- **AC-03a (P):** trocar o token clássico por **fine-grained** limitado a Gists —
  ver AC-05 (é a mesma mudança de link); reduz o dano de um vazamento.
- **AC-03b (P):** adicionar botão "Esquecer credenciais neste aparelho" nas
  Configurações que apaga `token` e `senha` de `nuvem` mantendo `gist_id`
  (mantém a referência do backup, mas exige recolar a credencial para novo envio).
  - **Teste:** usar o botão → `IDB.get('nuvem')` não contém mais `token` nem
    `senha`; o status passa a pedir recadastro.
- **AC-03c (M):** opção de sessão sem persistir a senha — guardar a senha só em
  memória (variável de módulo) durante a sessão e recriptografar via PBKDF2 sob
  demanda; ao fechar o app, a senha não fica em disco.
  - **Teste:** ativar o modo, recarregar o app → o app pede a senha novamente
    antes do próximo envio; nenhuma senha em `IDB.get('nuvem')`.

---

## Prioridade 2 — Baixos

### AC-04 · Endurecer a CSP  _(ref. B-01 e B-02 · esforço M)_
- **Arquivo/linha:** `web/index.html:9`
- **Contexto:** remover `'unsafe-inline'` de `script-src` exige extrair o
  `<script>` embutido para um arquivo `app.js` servido pela mesma origem
  (já permitido por `'self'`). O CSS inline pode permanecer (menor risco) ou
  migrar junto.
- **Mudança 1:** mover o bloco de script para `web/app.js` e referenciar com
  `<script src="app.js">`; retirar `'unsafe-inline'` de `script-src`; incluir
  `app.js` no pré-cache do service worker (`web/sw.js:9-14`) e **subir a versão
  do cache** (`web/sw.js:2`).
- **Mudança 2:** adicionar `frame-ancestors 'none'`. Observação: `frame-ancestors`
  é ignorado em CSP via `<meta>`; para valer, precisa vir por cabeçalho HTTP.
  Como o GitHub Pages não permite cabeçalhos personalizados, registrar isto como
  **limitação aceita** ou migrar a hospedagem (ver AC-07).
- **Teste 1:** abrir o app → console sem violações de CSP; todas as telas e o
  PDF continuam funcionando.
- **Teste 2:** repetir o teste dinâmico de injeção de HTML → segue bloqueado.
- **Teste 3 (regressão):** backup na nuvem ainda alcança `api.github.com`.

### AC-05 · Link de token com menor privilégio  _(ref. B-03 · esforço P)_
- **Arquivo/linha:** `web/index.html:441`
- **Mudança:** trocar a URL para o fluxo de token **fine-grained** com permissão
  apenas de Gists; atualizar o texto das instruções (linhas 441-444) e o guia
  `docs/BACKUP_NUVEM.md`.
- **Teste:** criar um token fine-grained só de Gists e ativar o backup →
  envio e restauração funcionam; o token não consegue ler repositórios.

### AC-06 · Fixar actions de CI por SHA  _(ref. B-04 · esforço P)_
- **Arquivos:** `.github/workflows/gerar-apk.yml` e `publicar-web.yml`
- **Mudança:** substituir cada `uses: org/acao@vX` pelo SHA de commit
  correspondente (com comentário indicando a versão).
- **Teste 1:** disparar "Publicar app web" → conclui com sucesso.
- **Teste 2:** disparar "Gerar APK Android" → gera o APK na release.

### AC-07 · (opcional) Cabeçalhos de segurança por hospedagem  _(ref. B-02 · esforço M)_
- **Contexto:** GitHub Pages não envia `X-Frame-Options`/`X-Content-Type-Options`
  nem permite `frame-ancestors` por cabeçalho.
- **Mudança:** publicar a pasta `web/` no Cloudflare Pages (gratuito) com um
  arquivo `_headers` definindo `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff` e `Content-Security-Policy` com
  `frame-ancestors 'none'`.
- **Teste:** `curl -I` no novo endereço mostra os três cabeçalhos.
- **Nota:** muda o endereço do app; só faz sentido se o clickjacking for
  considerado relevante para o uso.

---

## Prioridade 3 — Informativos / Robustez

### AC-08 · Blindar o `LIMIT` contra valor inválido  _(ref. I-01 · esforço P)_
- **Arquivo/linha:** `src/services/despesasService.js:165`
- **Mudança:** `const n = parseInt(limite, 10); if (Number.isFinite(n) && n > 0)
  sql += ' LIMIT ' + n;`
- **Teste:** chamar `listarDespesas({ limite: 'abc' })` → retorna resultados sem
  erro (cláusula LIMIT omitida); `listarDespesas({ limite: 8 })` → no máx. 8.

### AC-09 · Assinar o APK com keystore própria  _(ref. I-02 · esforço M)_
- **Contexto:** só necessário se houver intenção de distribuir fora do uso
  pessoal.
- **Mudança:** gerar keystore, guardá-la como secret do repositório e ajustar o
  `gerar-apk.yml` para assinar o release com ela.
- **Teste:** `apksigner verify` no APK gerado confirma a assinatura própria.
- **Nota:** manter a keystore fora do Git (já coberto por `.gitignore:15-19`).

### AC-10 · (recomendado, transversal) Rotina de rotação de token
- **Contexto:** não é um bug de código, mas reduz o risco de M-03/B-03 ao longo
  do tempo.
- **Mudança:** documentar em `docs/BACKUP_NUVEM.md` como revogar e recriar o
  token periodicamente, e usar o botão de AC-03b para limpar o antigo do aparelho.
- **Teste:** seguir o passo a passo → backup volta a funcionar com o token novo.

---

## Ordem sugerida de execução

1. AC-01, AC-02 (senha e KDF — ganho direto contra força bruta offline, esforço baixo)
2. AC-05 + AC-03a (token de menor privilégio — uma mudança cobre os dois)
3. AC-03b (botão esquecer credenciais)
4. AC-08 (robustez do LIMIT — trivial)
5. AC-06 (pin de actions)
6. AC-04 (endurecer CSP — maior, mexe na estrutura do arquivo)
7. AC-03c, AC-07, AC-09, AC-10 conforme necessidade (opcionais/contextuais)
