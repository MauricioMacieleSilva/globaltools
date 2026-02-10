import { DriveStep } from 'driver.js';

export const politicaSteps: DriveStep[] = [
  {
    element: '[data-tour="politica-descontos"]',
    popover: {
      title: 'Política de Descontos',
      description: 'Consulte as regras de desconto por volume (peso). Quanto maior o volume do pedido, maior o percentual de desconto permitido.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="politica-transportadoras"]',
    popover: {
      title: 'Transportadoras',
      description: 'Acesse o cadastro de transportadoras para consultar regiões de atendimento, telefones e contatos para cotação de frete CIF.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="politica-categorias"]',
    popover: {
      title: 'Categorias de Produtos',
      description: 'Navegue entre as categorias: Arames, Bobinas, Perfis, Chapas, Telhas, Tubos, Laminados, Construção Civil e Blank.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="politica-busca"]',
    popover: {
      title: 'Busca de Materiais',
      description: 'Filtre materiais por descrição para encontrar rapidamente o produto desejado.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="politica-table"]',
    popover: {
      title: 'Tabela de Preços',
      description: 'Consulte os preços por material. Clique em qualquer linha para enviar o preço automaticamente ao Simulador.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="politica-referencia"]',
    popover: {
      title: 'Referência de Preços',
      description: 'Todos os preços consideram ICMS 17% | FOB RS | À Vista | Sem IPI. Ajuste as condições no simulador conforme necessário.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="politica-simulador"]',
    popover: {
      title: 'Simulador de Preço',
      description: 'Calcule o preço final considerando ICMS, desconto por volume, financeiro e frete. O preço base é preenchido ao clicar na tabela.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="politica-sim-icms"]',
    popover: {
      title: 'ICMS e Peso',
      description: 'Ajuste o ICMS conforme o estado de destino (4%, 7%, 12% ou 17%). O peso define a faixa de desconto permitida. Clique no ícone "i" para ver a tabela de ICMS interestadual.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="politica-sim-desconto"]',
    popover: {
      title: 'Desconto e Financeiro',
      description: 'Informe o percentual de desconto e o financeiro. Se o desconto exceder o máximo da faixa de volume, um alerta de aprovação será exibido.',
      side: 'left',
      align: 'start'
    }
  },
  {
    element: '[data-tour="politica-sim-resultado"]',
    popover: {
      title: 'Resultado da Simulação',
      description: 'Veja o preço unitário e total calculados automaticamente. O sistema mostra o detalhamento de cada componente do preço.',
      side: 'left',
      align: 'start'
    }
  }
];
