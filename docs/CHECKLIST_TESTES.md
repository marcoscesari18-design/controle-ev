# Checklist de testes — Controle EV

Marque cada item após verificar no aparelho. Cobre todas as regras de negócio
e os critérios de aceite do projeto.

## Funcionamento offline e persistência

- [ ] Com o **modo avião ligado**, todas as telas funcionam normalmente
- [ ] Registrar despesa e quilometragem offline funciona
- [ ] Gerar e compartilhar PDF offline funciona
- [ ] Fechar o app completamente e reabrir: todos os dados continuam lá
- [ ] Reiniciar o celular: dados continuam lá

## Quilometragem

- [ ] Método 1: digitar KM diretamente e salvar
- [ ] Método 2: informar odômetro inicial e final — o app calcula a diferença
- [ ] Prévia do cálculo aparece ao digitar os dois odômetros
- [ ] Odômetro final menor que o inicial é **bloqueado** com mensagem
- [ ] KM negativo é **bloqueado**
- [ ] Salvar o mesmo mês duas vezes **substitui** o registro (ano+mês único)
- [ ] Registro completo em **menos de 15 segundos**
- [ ] Dashboard atualiza **imediatamente** após salvar

## Despesas

- [ ] Salvar despesa com categoria, valor, data e situação
- [ ] Valor vazio é bloqueado
- [ ] Valor zero é bloqueado
- [ ] Valor negativo é bloqueado
- [ ] Data inválida (ex.: 31/02/2026) é bloqueada
- [ ] **Recarga em casa:** campos kWh e local **não aparecem**
- [ ] **Recarga fora:** kWh e local aparecem como opcionais
- [ ] Trocar de "Recarga fora" para "Recarga em casa" esconde kWh/local
- [ ] Situação padrão segue a configuração (Paga por mim / Reembolsada)
- [ ] Anexar foto da câmera funciona
- [ ] Anexar foto da galeria funciona
- [ ] Despesa com foto apagada do aparelho mostra aviso, sem travar
- [ ] Feedback visual (mensagem verde) aparece após salvar
- [ ] Registro completo em **menos de 15 segundos** (máx. 3 toques essenciais)

## Dashboard

- [ ] Trocar ano/mês atualiza os KPIs instantaneamente
- [ ] Reembolso de KM = KM rodados × tarifa configurada
- [ ] Custo por KM = total de despesas ÷ KM
- [ ] Mês **sem quilometragem**: custo por KM mostra **—** (sem erro)
- [ ] Mês sem despesas: gráficos mostram estado vazio amigável
- [ ] Mês sem nenhum registro: tela não quebra
- [ ] Total reembolsável soma apenas despesas "Reembolsada pela empresa"
- [ ] Pago por mim soma apenas despesas "Paga por mim"
- [ ] Gráfico de barras mostra recarga fora nos últimos 12 meses
- [ ] Gráfico de pizza reflete as categorias do mês selecionado
- [ ] Gráfico comparativo Reembolsado × Pago por mim confere com os KPIs
- [ ] Editar despesa pelos "Últimos lançamentos" funciona
- [ ] Excluir despesa pede confirmação e atualiza o painel
- [ ] Dashboard abre em menos de 1 segundo

## Histórico

- [ ] Filtro por ano funciona
- [ ] Filtro por mês e "Ano todo" funcionam
- [ ] Filtro por categoria funciona
- [ ] Busca por texto encontra descrição e local
- [ ] Ordenação: mais recentes primeiro
- [ ] Editar despesa abre o formulário preenchido e salva
- [ ] Duplicar cria uma cópia idêntica
- [ ] Excluir pede confirmação
- [ ] Aba Quilometragem lista os meses, com editar/excluir

## Relatórios

- [ ] Modelo 1 (KM): mês, KM, tarifa, total e linha de assinatura
- [ ] Modelo 2 (KM + Despesas): resumo de KM + tabela com subtotais por categoria
- [ ] Modelo 2 mostra Total Geral, Reembolsável, Pago por Mim, Reembolso por KM,
      Custo Total e Custo por KM
- [ ] Cabeçalho traz veículo, placa, período e data de emissão
- [ ] Relatório de **um mês** funciona
- [ ] Relatório de **intervalo de meses** funciona
- [ ] Intervalo invertido (início depois do fim) é bloqueado
- [ ] Período sem registros gera PDF com aviso "nenhum registro" (sem erro)
- [ ] Geração leva menos de 3 segundos
- [ ] Compartilhar abre a janela do sistema (WhatsApp, e-mail etc.)
- [ ] Relatório aparece no histórico após gerar
- [ ] Compartilhar do histórico com o arquivo apagado **regenera o PDF**
- [ ] Excluir item do histórico funciona

## Configurações

- [ ] Tarifa por KM padrão é **0,76**
- [ ] Alterar a tarifa muda o cálculo de reembolso no painel e nos PDFs
- [ ] Nome do veículo e placa aparecem nos PDFs
- [ ] Meta de KM mostra barra de progresso no painel
- [ ] Tarifa inválida (letras/negativo) é bloqueada
- [ ] Tema claro, escuro e automático funcionam

## Backup

- [ ] Exportar gera um JSON e abre o compartilhamento
- [ ] Importar um backup válido substitui os dados (com confirmação)
- [ ] Importar arquivo que não é JSON é recusado com mensagem
- [ ] Importar JSON de outra origem (estrutura errada) é recusado
- [ ] Cancelar a importação mantém os dados atuais intactos
- [ ] Após importar, dashboard e histórico refletem os dados do backup

## Limpeza de dados

- [ ] "Apagar todos os dados" pede **duas** confirmações
- [ ] Cancelar em qualquer etapa não apaga nada
- [ ] Após apagar, o app continua funcionando (telas vazias amigáveis)
- [ ] Nenhum dado de exemplo volta após a limpeza

## Primeira instalação (começa vazia)

- [ ] O app abre sem nenhum lançamento pré-cadastrado
- [ ] A tarifa por KM já vem preenchida com 0,76
- [ ] Painel, histórico e gráficos mostram estados vazios amigáveis (sem erros)
- [ ] O aviso de backup só aparece depois que existir algum lançamento
