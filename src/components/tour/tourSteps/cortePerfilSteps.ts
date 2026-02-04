import { DriveStep } from 'driver.js';

export const cortePerfilSteps: DriveStep[] = [
  {
    element: '[data-tour="perfil-padrao-btn"]',
    popover: {
      title: 'Tabela de Perfis Padrão',
      description: 'Consulte as dimensões dos perfis padrão comerciais (U e UE) para referência rápida.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '[data-tour="perfil-tabs"]',
    popover: {
      title: 'Tipos de Perfis',
      description: 'Escolha o tipo de perfil: U/Z (simples), L (cantoneira), Enrijecido ou Cartola. Cada aba tem cálculos específicos.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-headers"]',
    popover: {
      title: 'Colunas da Tabela',
      description: 'U/Z = orientação | Sim = simétrico | Esp = espessura | Aba1/Base/Aba2 = dimensões | Comp/Larg = chapa | Qt = quantidade | %P = perda adicional.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-linha"]',
    popover: {
      title: 'Linha de Cálculo',
      description: 'Preencha as dimensões do perfil. Os cálculos são automáticos: Tira, Tira Perda, peso por peça (kg/Pç), peso de perda (kg/Prd) e totais.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-simetrico"]',
    popover: {
      title: 'Perfil Simétrico',
      description: 'Quando marcado, Aba2 é igual a Aba1 automaticamente. Desmarque para perfis assimétricos com abas diferentes.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-resultados"]',
    popover: {
      title: 'Resultados Calculados',
      description: 'Tira = largura desenvolvida | T.Prd = sobra na chapa | P.T = peso total | P.+ = peso com perda adicional.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-tipo-indicador"]',
    popover: {
      title: 'Tipo do Perfil',
      description: '🟢 Padrão = dimensões comerciais | 🟡 Especial = dimensões sob medida. Perfis padrão têm preços diferenciados.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-estoque"]',
    popover: {
      title: 'Disponibilidade em Estoque',
      description: '🟢 Perfil em estoque | 🟡 Material compatível disponível | 🔴 Sem estoque. Verifique antes de produzir.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-visualizacao"]',
    popover: {
      title: 'Visualização do Corte',
      description: 'Clique para ver o layout gráfico das tiras na chapa, aproveitamento percentual e sugestões de perfis para a sobra.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-adicionar"]',
    popover: {
      title: 'Adicionar Linha',
      description: 'Clique para adicionar mais linhas de cálculo. Você pode calcular vários perfis simultaneamente.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="perfil-totais"]',
    popover: {
      title: 'Totais da Aba',
      description: 'Resumo dos perfis desta aba: peso total de material e peso total de perda (sobras).',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="perfil-resumo"]',
    popover: {
      title: 'Aba Resumo',
      description: 'Visualize todos os perfis calculados de todas as abas em uma única tabela. Exporte para PDF ou Excel.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-otimizado"]',
    popover: {
      title: 'Aproveitamento Otimizado',
      description: 'Algoritmo que combina perfis de mesma espessura em chapas únicas, minimizando desperdício de material.',
      side: 'bottom',
      align: 'start'
    }
  }
];
