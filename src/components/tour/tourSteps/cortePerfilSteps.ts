import { DriveStep } from 'driver.js';

export const cortePerfilSteps: DriveStep[] = [
  {
    element: '[data-tour="perfil-tabs"]',
    popover: {
      title: 'Tipos de Perfis',
      description: 'Escolha o tipo de perfil que deseja calcular: U/Z, L, U Enrijecido, Cartola, etc.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-dimensoes"]',
    popover: {
      title: 'Dimensões do Perfil',
      description: 'Preencha as medidas do perfil: base, abas, enrijecedores, espessura e comprimento.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-chapa"]',
    popover: {
      title: 'Dimensões da Chapa',
      description: 'Informe a largura da chapa que será utilizada para calcular o aproveitamento.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-calcular"]',
    popover: {
      title: 'Calcular Corte',
      description: 'Clique para calcular quantas tiras cabem na chapa e qual o percentual de perda.',
      side: 'top',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-visualizacao"]',
    popover: {
      title: 'Visualização do Corte',
      description: 'Veja graficamente como as tiras serão distribuídas na chapa.',
      side: 'left',
      align: 'center'
    }
  },
  {
    element: '[data-tour="perfil-resumo"]',
    popover: {
      title: 'Resumo Geral',
      description: 'Veja o resumo de todos os perfis calculados com peso total e perda.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-otimizado"]',
    popover: {
      title: 'Aproveitamento Otimizado',
      description: 'Combine perfis de mesma espessura para maximizar o aproveitamento da chapa.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="perfil-export"]',
    popover: {
      title: 'Exportar Dados',
      description: 'Exporte os cálculos em PDF ou Excel para usar em orçamentos.',
      side: 'left',
      align: 'start'
    }
  }
];
