# Instalar no iPhone pelo navegador (PWA) — o caminho mais fácil

A pasta `web/` deste projeto contém a **versão web** do Controle EV: o mesmo
aplicativo (painel, lançamentos, histórico, PDFs, backup), feito para ser
salvo na tela de início do iPhone como se fosse um app nativo.

- ✅ Sem conta de desenvolvedor da Apple (sem os US$ 99/ano)
- ✅ Sem cabo, sem Mac, sem expirar em 7 dias
- ✅ Funciona offline depois da primeira visita
- ✅ Dados ficam no próprio iPhone (armazenamento local do Safari)
- ✅ Funciona também em Android, no computador, em qualquer navegador

## Parte 1 — Publicar o app (uma única vez)

O app precisa estar em um endereço `https` para o iPhone salvá-lo. O GitHub
faz isso de graça com o **GitHub Pages**:

1. Suba o projeto para o GitHub (veja [GERAR_APK_GITHUB.md](GERAR_APK_GITHUB.md),
   Parte 1). **Importante:** para usar o Pages gratuito, o repositório precisa
   ser **público** — sem problema: ele contém só o código do app, nunca os
   seus dados de quilometragem e despesas.
2. No site do repositório: **Settings → Pages → Source: "GitHub Actions"**.
3. Aba **Actions** → **Publicar app web** → **Run workflow**.
   (Depois disso, qualquer alteração na pasta `web/` republica sozinha.)
4. Em ~1 minuto o app estará em:
   `https://SEU_USUARIO.github.io/controle-ev/`

> Alternativa igualmente gratuita: Cloudflare Pages (arraste a pasta `web/`
> no painel deles). O resultado é o mesmo.

## Parte 2 — Instalar no iPhone

1. Abra o endereço acima no **Safari** do iPhone.
2. Toque no botão **Compartilhar** (quadrado com seta para cima).
3. Toque em **Adicionar à Tela de Início** → **Adicionar**.
4. Pronto! O ícone verde ⚡ do Controle EV aparece na tela de início e abre
   em tela cheia, como um aplicativo normal — inclusive sem internet.

No **Android** funciona igual: Chrome → menu ⋮ → *Adicionar à tela inicial*
(o Chrome ainda oferece "Instalar app", que é o mesmo PWA).

## Avisos importantes

- **Onde ficam os dados:** no armazenamento local do navegador, dentro do
  iPhone. Eles **não** vão para o GitHub nem para nenhum servidor.
- **Backup é essencial:** se o app for removido da tela de início ou se os
  dados do Safari forem apagados (ex.: "Limpar Histórico e Dados dos Sites"),
  os registros vão junto. Exporte o **backup JSON** (Configurações → Exportar)
  regularmente — dá para importar de volta em qualquer aparelho.
- **App nativo × PWA:** as duas versões não compartilham dados entre si
  automaticamente, mas o **arquivo de backup é compatível** — exporte em uma
  e importe na outra.

## Testar no computador antes de publicar

```bash
cd controle-ev/web
python3 -m http.server 8000
```
Abra `http://localhost:8000` no navegador.
