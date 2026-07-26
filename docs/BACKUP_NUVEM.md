# Backup automático na nuvem (criptografado)

A versão web do Controle EV pode manter uma cópia de segurança automática dos
seus dados na **sua própria conta GitHub** — de graça e com criptografia forte.

## Como funciona (e por que é seguro)

1. Sempre que você salva algo, o app espera 30 segundos e envia uma cópia.
2. **Antes de sair do aparelho**, a cópia é criptografada (AES-256) com uma
   senha que só você conhece.
3. O arquivo cifrado fica em um *gist secreto* da sua conta GitHub — não
   aparece no seu perfil e ninguém consegue ler o conteúdo, **nem o GitHub**.
4. O token e a senha ficam armazenados apenas no aparelho e **nunca** entram
   nos arquivos de backup exportados.

Sem internet? Sem problema: o app guarda a pendência e envia quando conectar.

## Ativar (uma única vez, ~2 minutos)

1. No app: **Config. → ☁️ Backup automático na nuvem**
2. Toque no link **"criar seu token no GitHub"** — a página já vem
   pré-configurada: deixe marcado só **gist**, escolha *No expiration* e
   toque em **Generate token**
3. Copie o token (começa com `ghp_`) e cole no campo do app
4. Crie uma **senha de criptografia** e anote em local seguro
   ⚠️ *Sem essa senha o backup é ilegível para sempre — não há recuperação.*
5. Toque em **Ativar backup automático** — a primeira cópia sobe na hora

O status na tela mostra 🟢 e a data/hora da última cópia enviada.

## Recuperar (celular novo, perdido ou dados apagados)

1. Abra o app no aparelho novo (mesmo endereço) e vá em
   **Config. → Backup automático na nuvem**
2. Cole o **token** e a **senha de criptografia**
3. Toque em **⤵️ Restaurar backup da nuvem neste aparelho**
4. Confirme — tudo volta: quilometragens, despesas, configurações e histórico

> Perdeu também o token? Sem problema: crie um novo token no GitHub (mesmo
> passo a passo) — o que não pode perder é a **senha de criptografia**.

## Outras proteções incluídas

- **IndexedDB**: o armazenamento interno passou a suportar centenas de MB
  (fotos de comprovantes à vontade) e resiste melhor a limpezas automáticas
- **Armazenamento persistente**: o app pede ao iOS/Android para não apagar
  os dados em limpezas de espaço
- **Aviso de backup atrasado**: se passar de 7 dias sem nenhuma cópia
  (manual ou nuvem), um alerta amarelo aparece no painel
- A **migração é automática**: quem já usava o app não perde nada ao atualizar
