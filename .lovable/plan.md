

# Aproveitamento Combinado de Tiras por Espessura

## Resumo

Criar uma nova funcionalidade opcional que combina perfis de mesma espessura para otimizar o aproveitamento das tiras na chapa, reduzindo desperdício. O modo atual permanece inalterado.

## Como Funciona Hoje

Atualmente, cada perfil calcula sua tira individualmente:
- Perfil U 3,75mm com tira de 300mm na chapa 1200mm = 4 tiras + 0mm perda
- Perfil UE 3,75mm com tira de 350mm na chapa 1200mm = 3 tiras + 150mm perda
- Perfil L 3,75mm com tira de 200mm na chapa 1200mm = 6 tiras + 0mm perda

Cada um usa sua propria chapa, mesmo tendo a mesma espessura.

## Nova Funcionalidade

Combinar perfis de mesma espessura em uma unica chapa:
- Chapa 1200mm com espessura 3,75mm pode ter: 1x tira 300mm + 1x tira 350mm + 2x tira 200mm = 1050mm utilizados + 150mm perda

### Beneficios
- Menor desperdicio total de material
- Menos chapas necessarias
- Melhor aproveitamento do estoque

## Interface do Usuario

### Onde Ficara
Nova aba **"Otimizado"** ao lado da aba "Resumo" na pagina Corte Perfil.

### Funcionamento
1. Usuario preenche os perfis normalmente nas abas U/Z, L, UE, etc.
2. Na aba "Otimizado", o sistema agrupa automaticamente por espessura
3. Apresenta comparativo: aproveitamento individual vs combinado
4. Visualizacao SVG mostrando como as tiras ficam dispostas na chapa

### Controles
- Checkbox global para ativar/desativar modo otimizado
- Filtro por espessura para ver grupos especificos
- Botao "Calcular Otimizacao" para executar o algoritmo

## Detalhes Tecnicos

### 1. Nova Interface de Dados

Criar interface para resultado da otimizacao:
```text
interface OtimizacaoGrupo {
  espessura: number
  larguraChapa: number
  perfis: CalculoItem[]
  distribuicao: DistribuicaoChapa[]
  aproveitamentoTotal: number
  chapasNecessarias: number
  comparativoIndividual: {
    chapasIndividuais: number
    aproveitamentoIndividual: number
  }
}

interface DistribuicaoChapa {
  chapaIndex: number
  tiras: {perfilId: string, quantidade: number}[]
  larguraUtilizada: number
  larguraPerda: number
}
```

### 2. Algoritmo de Bin-Packing

Implementar algoritmo First-Fit Decreasing:
1. Agrupar `CalculoItem` por `espessura` e `largura` (dimensoes da chapa)
2. Ordenar tiras por largura decrescente
3. Para cada grupo de pecas, distribuir nas chapas usando FFD
4. Calcular estatisticas de aproveitamento

### 3. Novo Componente

Criar `src/components/perfis/AproveitamentoOtimizado.tsx`:
- Exibir grupos por espessura em cards
- Para cada grupo mostrar:
  - Lista de perfis incluidos
  - Visualizacao SVG das chapas otimizadas
  - Metricas comparativas (antes vs depois)
  - Economia em chapas e kg

### 4. Visualizacao SVG

Adaptar `VisualizacaoPerfilPopover` para mostrar multiplas tiras de tipos diferentes:
- Cores diferentes para cada tipo de perfil
- Legenda identificando cada perfil
- Largura de cada tira anotada

### 5. Extensao do Contexto

Adicionar ao `PerfilContext`:
- Estado `modoOtimizado: boolean`
- Funcao `calcularOtimizacao(): OtimizacaoGrupo[]`
- Estado `resultadoOtimizacao: OtimizacaoGrupo[] | null`

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/perfis/AproveitamentoOtimizado.tsx` | Criar | Componente principal da nova aba |
| `src/components/perfis/VisualizacaoChapaCombinada.tsx` | Criar | SVG para visualizar multiplas tiras |
| `src/lib/otimizacao-perfis.ts` | Criar | Algoritmo de bin-packing e calculos |
| `src/context/PerfilContext.tsx` | Modificar | Adicionar estado e funcao de otimizacao |
| `src/pages/CortePerfil.tsx` | Modificar | Adicionar nova aba "Otimizado" |

## Fluxo de Uso

```text
+----------------+     +-----------------+     +-------------------+
| Usuario insere | --> | Preenche perfis | --> | Navega para aba   |
| dados normais  |     | U, L, UE, etc   |     | "Otimizado"       |
+----------------+     +-----------------+     +-------------------+
                                                        |
                                                        v
                                              +-------------------+
                                              | Sistema agrupa    |
                                              | por espessura     |
                                              +-------------------+
                                                        |
                                                        v
                                              +-------------------+
                                              | Executa bin-pack  |
                                              | e mostra resultado|
                                              +-------------------+
                                                        |
                                                        v
                                              +-------------------+
                                              | Visualizacao SVG  |
                                              | com comparativo   |
                                              +-------------------+
```

## Exemplo Visual do Resultado

Card para espessura 3,75mm:

```text
+----------------------------------------------------------+
| ESPESSURA 3,75mm                              [Detalhes] |
|----------------------------------------------------------|
| Perfis incluidos: U 40x100, UE 30x80x20, L 50x70         |
|----------------------------------------------------------|
|              INDIVIDUAL    |    OTIMIZADO                |
| Chapas:          8         |        5       (-37.5%)     |
| Aproveitamento:  72%       |       91%      (+19pp)      |
| Peso Perda:    45.2 kg     |     18.7 kg    (-58.6%)     |
+----------------------------------------------------------+
| [========= SVG VISUALIZACAO DAS CHAPAS OTIMIZADAS ======]|
+----------------------------------------------------------+
```

## Restricoes

- Apenas perfis com **mesma espessura E mesma largura de chapa** podem ser combinados
- O modo otimizado nao altera os dados originais dos perfis
- Comprimentos diferentes sao ignorados (cada perfil mantem seu comprimento)

