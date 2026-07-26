# Controle EV 🚗⚡

Aplicativo **100% offline** para controle pessoal de quilometragem profissional
e despesas de veículo elétrico, com relatórios em PDF para reembolso.

- **Plataforma:** React Native + Expo (Android prioritário, compatível com iOS)
- **Armazenamento:** SQLite local (`expo-sqlite`) — nenhum dado sai do aparelho
- **Sem** login, backend, API, nuvem ou sincronização
- **Idioma:** Português do Brasil

## Funcionalidades

| Aba | O que faz |
|---|---|
| **Início** | Dashboard com filtros ano/mês, 6 KPIs, 3 gráficos e últimos lançamentos |
| **Lançar** | Cadastro rápido de despesa ou quilometragem (menos de 15 s) |
| **Histórico** | Consulta com filtros e busca; editar, duplicar e excluir |
| **Relatórios** | 2 modelos de PDF (KM e KM + Despesas), compartilhamento e histórico |
| **Configurações** | Tarifa/KM, veículo, meta, tema claro/escuro, backup JSON e limpeza |

O app começa **vazio**, pronto para os seus primeiros registros — todas as
telas têm orientações de estado vazio indicando o próximo passo.

## Estrutura do projeto

```
controle-ev/
├── App.js                    # Navegação (5 abas) + inicialização
├── app.json                  # Configuração do Expo
├── src/
│   ├── components/           # Componentes de interface reutilizáveis
│   │   ├── ui.js             # Botões, campos, chips, cards, KPIs
│   │   ├── DespesaForm.js    # Formulário de despesa (criar/editar)
│   │   ├── KmForm.js         # Formulário de quilometragem
│   │   ├── DespesaItem.js    # Item de lista com ações
│   │   ├── SeletorMesAno.js  # Filtro de período
│   │   └── ModalFicha.js     # Modal de edição
│   ├── screens/              # As 5 telas do aplicativo
│   ├── services/             # Regras de negócio e acesso ao banco
│   │   ├── configService.js
│   │   ├── mesesService.js
│   │   ├── despesasService.js
│   │   ├── dashboardService.js
│   │   ├── relatorioService.js   # Geração dos PDFs
│   │   └── backupService.js      # Exportar/importar JSON
│   ├── database/db.js        # SQLite: migrações + configurações padrão
│   ├── theme/theme.js        # Tema Material Design 3 (claro/escuro)
│   └── utils/                # Formatação pt-BR, categorias, validações
└── docs/                     # Manuais e checklist de testes
```

## Como executar (desenvolvimento)

### Pré-requisitos

1. **Node.js 20 ou superior** — <https://nodejs.org>
2. **Aplicativo Expo Go** no celular — Play Store / App Store
   *(ou um emulador Android configurado)*

### Passo a passo

```bash
# 1. Entre na pasta do projeto
cd controle-ev

# 2. Instale as dependências (só na primeira vez)
npm install

# 3. Inicie o servidor de desenvolvimento
npx expo start
```

Depois:

- **No celular físico:** abra o app *Expo Go* e escaneie o QR Code exibido no
  terminal (celular e computador na mesma rede Wi-Fi).
- **No emulador Android:** pressione `a` no terminal.
- **No simulador iOS (somente Mac):** pressione `i`.

> Após instalado no aparelho, o aplicativo funciona **sem internet**. A rede é
> necessária apenas durante o desenvolvimento, para o Expo Go baixar o código.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/GERAR_APK_GITHUB.md](docs/GERAR_APK_GITHUB.md) | **Caminho mais fácil:** gerar o APK pelo GitHub, sem instalar nada |
| [docs/GERAR_APK.md](docs/GERAR_APK.md) | Como gerar o APK Android (EAS Build e alternativa local) |
| [docs/INSTALAR_APK.md](docs/INSTALAR_APK.md) | Como instalar o APK no celular Android |
| [docs/APP_IPHONE_PWA.md](docs/APP_IPHONE_PWA.md) | **Caminho mais fácil no iPhone:** versão web (pasta `web/`) salva na tela de início |
| [docs/INSTALAR_IPHONE.md](docs/INSTALAR_IPHONE.md) | iPhone como app nativo (Expo Go, Mac ou TestFlight) |
| [docs/MANUAL_DE_USO.md](docs/MANUAL_DE_USO.md) | Manual de uso completo, tela a tela |
| [docs/BACKUP_NUVEM.md](docs/BACKUP_NUVEM.md) | Backup automático criptografado na nuvem (grátis, opcional) |
| [docs/CHECKLIST_TESTES.md](docs/CHECKLIST_TESTES.md) | Checklist de testes das regras de negócio |

## Versão web (PWA)

A pasta [web/](web) contém uma versão completa do aplicativo que roda em
qualquer navegador e pode ser **salva na tela de início do iPhone ou do
Android** como um app — sem lojas, sem contas de desenvolvedor. Os dados ficam
no armazenamento local do navegador e o backup JSON é compatível com a versão
nativa. Veja [docs/APP_IPHONE_PWA.md](docs/APP_IPHONE_PWA.md).

## Privacidade

Todos os dados ficam **exclusivamente no aparelho** (banco SQLite local).
Nenhuma informação é enviada para a internet. Os únicos arquivos que saem do
dispositivo são os que **você** compartilha manualmente: PDFs de relatório e o
backup JSON.
