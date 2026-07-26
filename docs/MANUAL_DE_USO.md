# Manual de uso — Controle EV

Guia completo do aplicativo, tela a tela. Ao lado de cada seção há a sugestão
de captura de tela para ilustrar um manual impresso.

---

## 1. Início (Dashboard)

*📷 Captura sugerida: tela inicial com os KPIs e o gráfico de pizza visíveis.*

É o painel do mês. No topo, escolha o **ano** e o **mês** — os indicadores
mudam na hora.

**Indicadores (KPIs):**

- **KM rodados** — quilometragem registrada no mês.
- **Reembolso de KM** — KM rodados × tarifa por KM (configurável; padrão R$ 0,76).
- **Total de despesas** — soma de todas as despesas do mês.
- **Total reembolsável** — despesas marcadas como *Reembolsada pela empresa*.
- **Pago por mim** — despesas que saíram do seu bolso.
- **Custo por KM** — total de despesas ÷ KM rodados. Mostra **—** quando não há
  quilometragem (o app nunca divide por zero).

**Gráficos:**

1. **Barras** — gasto com *recarga fora de casa* nos últimos 12 meses.
2. **Pizza** — distribuição das despesas do mês por categoria.
3. **Barras comparativas** — *Reembolsado* × *Pago por mim*.

**Últimos lançamentos:** as despesas mais recentes do mês, com botões
**Editar** e **Excluir** direto na lista.

---

## 2. Lançar

*📷 Capturas sugeridas: formulário de despesa com a categoria "Recarga fora"
selecionada; formulário de quilometragem no modo odômetro.*

Cadastro rápido — pensado para levar **menos de 15 segundos**.

### Registrar uma despesa

1. Toque na categoria (Recarga fora, Recarga em casa, Revisão, Pneus, IPVA,
   Seguro, Outros).
2. Digite o **valor** (obrigatório — não pode ser vazio, zero ou negativo).
3. Confira a **data** (vem preenchida com hoje).
4. Escolha a **situação**: *Paga por mim* ou *Reembolsada pela empresa*.
5. Toque em **Salvar despesa**. Uma confirmação verde aparece na hora.

Campos extras conforme a categoria:

- **Recarga fora:** kWh e local (ambos opcionais).
- **Recarga em casa:** apenas o valor — o app **não pede kWh nem local** e não
  calcula consumo, de propósito.
- **Foto do comprovante:** opcional em qualquer categoria (câmera ou galeria).

### Registrar quilometragem

Escolha o **período** (ano/mês) e **um** dos métodos:

- **Digitar KM** — informe o total rodado no mês; ou
- **Odômetro início/fim** — o app calcula a diferença e mostra a prévia.

Regras: o valor nunca pode ser negativo e o odômetro final não pode ser menor
que o inicial. Cada mês tem **um único registro** — salvar de novo substitui o
anterior.

---

## 2b. RDV (Relatório de Despesas de Viagem)

*📷 Captura sugerida: aba RDV com o total do mês e o formulário.*

Aba exclusiva para despesas **reembolsadas pela distribuidora** (na versão web).

- **Lançar:** categoria (Refeição, Combustível, Hospedagem, Pedágio,
  Estacionamento, Outros), valor, data, descrição da nota, observação,
  forma de pagamento (botões rápidos) e **foto da nota**.
- **Entrada automática:** despesas do veículo marcadas como *Reembolsada pela
  empresa* aparecem no RDV do mês com a etiqueta **Veículo** — sem duplicar
  nada; editou lá, reflete aqui.
- **Total do mês** em destaque no topo, com contagem de notas anexadas.
- **Relatório mensal em PDF:** tabela com data, categoria, descrição,
  pagamento, observação e valor + total a reembolsar + linha de assinatura +
  **todas as notas anexadas ao final, uma por página**.
- Nas **Configurações → RDV** você cadastra seu nome (sai no cabeçalho do
  relatório) e as formas de pagamento.

## 3. Histórico

*📷 Captura sugerida: lista de despesas com os filtros de categoria abertos.*

Duas visões, alternadas no topo:

- **Despesas** — filtre por ano, mês (ou "Ano todo") e categoria, e pesquise
  por texto na descrição/local. Cada item tem **Editar**, **Duplicar** (ótimo
  para gastos repetidos, como a parcela do seguro) e **Excluir**.
- **Quilometragem** — todos os meses registrados, com edição e exclusão.

Tudo ordenado do mais recente para o mais antigo.

---

## 4. Relatórios

*📷 Capturas sugeridas: tela de geração com o período selecionado; PDF do
modelo "KM + Despesas" aberto.*

1. Escolha o **modelo**:
   - **Relatório de KM** — tabela mês a mês (KM, tarifa, total) com linha de
     assinatura. Ideal para pedir o reembolso de quilometragem.
   - **KM + Despesas** — resumo da quilometragem + tabela de despesas com
     subtotais por categoria e totais gerais (reembolsável, pago por mim,
     custo por KM).
2. Escolha o **período**: um mês ou um intervalo de meses.
3. Toque em **Gerar PDF** (leva poucos segundos) e depois em **Compartilhar**
   para enviar por WhatsApp, e-mail ou salvar no aparelho.

**Histórico de relatórios:** todos os PDFs gerados ficam listados. Se o
arquivo tiver sido apagado do aparelho, o app **recria o PDF automaticamente**
ao compartilhar de novo.

---

## 5. Configurações

*📷 Captura sugerida: tela de configurações completa.*

- **Tarifa por KM** — valor pago pela empresa por quilômetro (padrão R$ 0,76).
- **Nome do veículo e placa** — aparecem no cabeçalho dos PDFs.
- **Meta de KM por mês** — mostra uma barra de progresso no painel.
- **Custo da energia em casa (R$/kWh)** — apenas informativo.
- **Situação pré-selecionada** — o que vem marcado ao lançar despesa.
- **Aparência** — tema claro, escuro ou automático (segue o sistema).

### Backup

- **Exportar backup (JSON)** — gera um arquivo com TODOS os dados e abre o
  compartilhamento. Guarde-o onde preferir (e-mail para si mesmo, pen drive…).
- **Importar backup** — escolha um arquivo exportado anteriormente. O app
  **valida a estrutura** e pede confirmação antes de **substituir** os dados
  atuais. Arquivos inválidos ou corrompidos são recusados com uma mensagem clara.

### Zona de perigo

**Apagar todos os dados** — remove tudo, com **confirmação dupla**. Não tem
volta; exporte um backup antes.

---

## Dicas rápidas

- Registre a quilometragem **uma vez por mês** (anote o odômetro no dia 1º).
- Use **Duplicar** no Histórico para lançamentos mensais repetidos.
- Exporte um **backup** todo mês, logo após fechar o relatório.
- Ative o **backup automático na nuvem** antes do primeiro lançamento
  (veja [BACKUP_NUVEM.md](BACKUP_NUVEM.md)).
