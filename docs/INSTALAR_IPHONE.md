# Como usar no iPhone (iOS)

O aplicativo é totalmente compatível com iPhone, mas a Apple **não permite
instalar aplicativos avulsos** como o Android faz com o APK. As opções são as
seguintes, da mais simples para a mais completa.

---

## Opção 1 — Expo Go (grátis, ideal para testar)

1. Instale o app **Expo Go** pela App Store.
2. No computador, dentro da pasta do projeto:
   ```bash
   cd controle-ev
   npx expo start
   ```
3. Abra a **câmera do iPhone**, aponte para o QR Code do terminal e toque na
   notificação — o app abre dentro do Expo Go.

**Limitação:** o iPhone precisa estar na mesma rede Wi-Fi do computador, e o
app só abre enquanto o servidor (`npx expo start`) estiver rodando. Serve para
testar e demonstrar, não para o dia a dia.

---

## Opção 2 — Instalação direta com um Mac (grátis, validade de 7 dias)

Se você tem um **Mac com Xcode** instalado (grátis na Mac App Store):

```bash
cd controle-ev
npx expo run:ios --device
```

Conecte o iPhone por cabo, escolha-o na lista e aguarde. O app fica instalado
como um aplicativo normal, **funcionando 100% offline**.

**Limitações da conta Apple gratuita:**
- O app **expira em 7 dias** — é preciso repetir o comando para renovar.
- Na primeira vez, autorize o desenvolvedor no iPhone em:
  *Ajustes → Geral → VPN e Gerenciamento de Dispositivo*.

---

## Opção 3 — TestFlight (definitiva, requer conta paga da Apple)

Para ter o app instalado **permanentemente**, sem expirar e sem depender de
computador, é necessário o **Apple Developer Program** (US$ 99/ano):

1. Inscreva-se em <https://developer.apple.com/programs/>
2. Gere o build iOS na nuvem (não precisa de Mac):
   ```bash
   npm install -g eas-cli
   eas login
   eas build --platform ios
   ```
   O EAS pede o login da conta de desenvolvedor e cuida dos certificados
   automaticamente.
3. Envie para o TestFlight:
   ```bash
   eas submit --platform ios
   ```
4. No iPhone, instale o app **TestFlight** (App Store) e aceite o convite —
   o Controle EV aparece para instalar com um toque.

Builds no TestFlight valem 90 dias; basta reenviar de tempos em tempos — ou
publicar de vez na App Store (mesma conta, sem custo adicional).

---

## Resumo

| Opção | Custo | Dura | Precisa de |
|---|---|---|---|
| Expo Go | Grátis | Enquanto o servidor roda | Computador na mesma rede |
| Mac + cabo | Grátis | 7 dias (renovável) | Um Mac com Xcode |
| TestFlight | US$ 99/ano | 90 dias por build | Conta Apple Developer |

> Os **dados** ficam sempre salvos no iPhone (SQLite local), independente da
> opção. Mas atenção na Opção 1: se o projeto for aberto por outro caminho, o
> banco pode ser outro. Para uso real no dia a dia, prefira as opções 2 ou 3 —
> e exporte um backup JSON periodicamente, como no Android.
