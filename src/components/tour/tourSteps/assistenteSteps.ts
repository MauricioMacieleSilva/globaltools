import { DriveStep } from 'driver.js';

export const assistenteSteps: DriveStep[] = [
  {
    element: '[data-tour="assistente-tabs"]',
    popover: {
      title: 'Modos de Interação',
      description: 'Escolha entre Chat de Texto ou Conversa por Voz para interagir com o Zé da Global.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '[data-tour="assistente-chat"]',
    popover: {
      title: 'Chat com o Zé',
      description: 'Converse por texto com o Zé da Global. Faça perguntas sobre processos, produtos ou políticas.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="assistente-input"]',
    popover: {
      title: 'Digite sua Pergunta',
      description: 'Escreva sua dúvida aqui. O Zé tem acesso à base de conhecimento da empresa.',
      side: 'top',
      align: 'center'
    }
  },
  {
    element: '[data-tour="assistente-voice"]',
    popover: {
      title: 'Conversa por Voz',
      description: 'Use o microfone para conversar por voz com o assistente de IA.',
      side: 'bottom',
      align: 'center'
    }
  }
];
