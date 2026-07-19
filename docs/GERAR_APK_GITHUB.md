# Gerar o APK pelo GitHub (sem instalar nada no computador)

Este é o caminho mais fácil para quem não quer instalar Android Studio nem
usar o EAS: o **GitHub Actions** compila o APK de graça nos servidores do
GitHub e deixa o arquivo pronto para baixar no celular.

O projeto já vem com a automação configurada
(arquivo `.github/workflows/gerar-apk.yml`). Você só precisa subir o código
para o GitHub uma vez.

---

## Parte 1 — Subir o projeto para o GitHub (uma única vez)

1. Crie uma conta gratuita em <https://github.com> (se ainda não tiver).
2. No site, clique em **+** (canto superior direito) → **New repository**.
   - Nome: `controle-ev`
   - Marque **Private** (recomendado — só você vê o projeto)
   - Clique em **Create repository**
3. No computador, no terminal, dentro da pasta do projeto:

```bash
cd ~/Downloads/controle-ev
git add -A
git commit -m "Controle EV - versao inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/controle-ev.git
git push -u origin main
```

> Troque `SEU_USUARIO` pelo seu nome de usuário do GitHub. Na primeira vez o
> git pede login — siga as instruções na tela (ele abre o navegador).

---

## Parte 2 — Gerar o APK (sempre que quiser uma versão nova)

1. Abra o repositório no site do GitHub.
2. Clique na aba **Actions** (menu superior).
3. Na lista à esquerda, clique em **Gerar APK Android**.
4. Clique no botão cinza **Run workflow** → **Run workflow** (verde).
5. Aguarde uns **15 minutos** (a bolinha amarela vira um ✅ verde).

## Parte 3 — Baixar no celular

1. **No navegador do celular**, abra o repositório e toque em **Releases**
   (na página inicial do repositório, coluna da direita).
2. Toque em **controle-ev.apk** para baixar.
3. Siga o guia [INSTALAR_APK.md](INSTALAR_APK.md) (autorizar fonte
   desconhecida → instalar).

> Se o repositório for privado, faça login no GitHub pelo navegador do
> celular antes de baixar.

---

## Perguntas comuns

**Custa algo?** Não. Repositórios privados têm 2.000 minutos grátis de
Actions por mês; cada APK usa ~15 minutos. Dá para gerar dezenas de versões
por mês sem pagar nada.

**Preciso repetir a Parte 1?** Não. Depois do primeiro envio, se fizer
alterações no app, basta:
```bash
git add -A && git commit -m "descricao da mudanca" && git push
```
e rodar a Parte 2 de novo.

**E para iPhone?** O GitHub não ajuda no iOS — a Apple exige assinatura com
conta de desenvolvedor de qualquer forma. Veja
[INSTALAR_IPHONE.md](INSTALAR_IPHONE.md).

**O app continua offline?** Sim. O GitHub é usado só para *compilar* o
aplicativo. Depois de instalado, ele funciona 100% sem internet e nenhum dado
seu vai para o GitHub (o banco de dados fica só no celular; o repositório
contém apenas o código-fonte).
