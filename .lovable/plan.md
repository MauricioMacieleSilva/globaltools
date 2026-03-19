

## Plano: Painel de Indicadores Empilhados (coluna direita)

### O que muda
Remover o `BrazilBubbleMap` e as dependências `react-leaflet`/`leaflet`. Substituir por um novo componente `DashboardSideIndicators` com cards compactos empilhados verticalmente na coluna de 320px.

### Indicadores planejados (de cima para baixo)

1. **Meta do Mês** - Barra de progresso circular ou linear mostrando % da meta atingida, valor faturado vs meta, dias restantes no mês
2. **Ticket Medio** - Valor do ticket medio com seta de tendencia (compara com mes anterior se disponivel)
3. **R$/kg** - Indicador de preço medio por kg com destaque visual
4. **Clientes Novos** - Contagem de clientes novos no período com badge de destaque
5. **Top Classe** - Mini ranking das classes de produto por faturamento (barras horizontais compactas)
6. **Faturamento por UF** - Top 5 estados em lista compacta com mini barras de progresso

### Dados disponíveis (do ComercialContext)
Todos os dados já existem nos KPIs: `kpis.faturamento.ticketMedio`, `kpis.faturamento.reaisPorKg`, `kpis.clientesNovos`, `metas.metaMensal`, `filteredData` (para agrupar por classe e UF). Nenhuma nova fonte de dados necessária.

### Arquivos

- **Criar**: `src/components/dashboard/DashboardSideIndicators.tsx` - componente com cards empilhados
- **Modificar**: `src/pages/DashboardComercial.tsx` - trocar `BrazilBubbleMap` pelo novo componente, remover imports do mapa
- **Deletar**: `src/components/dashboard/BrazilBubbleMap.tsx`
- **Remover dependências**: `react-leaflet`, `leaflet`, `@types/leaflet` do package.json

### Visual
- Cards compactos com `p-3`, ícones Lucide, cores temáticas
- Barras de progresso para meta e rankings
- Responsivo: no mobile empilha abaixo dos gráficos
- Segue dark/light mode do dashboard

