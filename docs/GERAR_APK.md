# Como gerar o APK Android

Há dois caminhos. O **EAS Build** é o recomendado (mais simples, não exige
Android Studio). A alternativa local não depende dos servidores da Expo.

---

## Opção 1 — EAS Build (recomendada)

O EAS Build compila o aplicativo nos servidores da Expo e devolve um link para
baixar o APK. É gratuito para uso pessoal (fila gratuita).

> Observação: a **geração** do APK usa internet, mas o aplicativo instalado
> continua funcionando 100% offline.

### Passo a passo

```bash
# 1. Instale a ferramenta de linha de comando (uma única vez)
npm install -g eas-cli

# 2. Crie uma conta gratuita em https://expo.dev e faça login
eas login

# 3. Na pasta do projeto, configure o EAS (uma única vez)
cd controle-ev
eas build:configure
```

O comando acima cria o arquivo `eas.json`. Edite-o para que o perfil
`preview` gere um **APK** (por padrão ele gera AAB, que é para a Play Store):

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

```bash
# 4. Gere o APK
eas build --platform android --profile preview
```

Ao final (10–20 minutos na fila gratuita), o terminal mostra um **link para
download do APK**. Baixe e siga o guia
[INSTALAR_APK.md](INSTALAR_APK.md).

---

## Opção 2 — Compilação local (sem servidores da Expo)

Exige mais preparação do computador, mas tudo acontece na sua máquina.

### Pré-requisitos

1. **Java JDK 17** — <https://adoptium.net>
2. **Android Studio** — <https://developer.android.com/studio>
   - Abra o *SDK Manager* e instale o *Android SDK Platform 35* e
     *Android SDK Build-Tools*.
   - Defina a variável de ambiente `ANDROID_HOME` apontando para a pasta do SDK
     (ex.: `~/Library/Android/sdk` no Mac ou `%LOCALAPPDATA%\Android\Sdk` no Windows).

### Passo a passo

```bash
cd controle-ev

# Gera o projeto Android nativo e compila o APK de release
npx expo prebuild --platform android
cd android
./gradlew assembleRelease        # (no Windows: gradlew.bat assembleRelease)
```

O APK ficará em:

```
android/app/build/outputs/apk/release/app-release.apk
```

> Esse APK usa uma assinatura de depuração — serve perfeitamente para uso
> pessoal. Para publicar na Play Store seria necessário assinar com uma chave
> própria, o que está fora do escopo deste projeto.

### Alternativa rápida para testes (build de desenvolvimento)

Se quiser apenas testar em um aparelho conectado por USB, sem gerar o APK de
release:

```bash
npx expo run:android
```

Isso compila e instala direto no celular/emulador conectado.
