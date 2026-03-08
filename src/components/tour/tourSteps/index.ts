import { DriveStep } from 'driver.js';
import { sidebarSteps } from './sidebarSteps';
import { dashboardSteps } from './dashboardSteps';
import { preVendasSteps } from './preVendasSteps';
import { pipelineSteps } from './pipelineSteps';
import { clientesSteps } from './clientesSteps';
import { producaoSteps } from './producaoSteps';
import { politicaSteps } from './politicaSteps';
import { cortePerfilSteps } from './cortePerfilSteps';
import { corteBlankSteps } from './corteBlankSteps';
import { assistenteSteps } from './assistenteSteps';
import { crmSteps } from './crmSteps';

export interface TourConfig {
  steps: DriveStep[];
  title: string;
}

export const tourStepsByRoute: Record<string, TourConfig> = {
  '/': {
    steps: dashboardSteps,
    title: 'Dashboard Comercial'
  },
  '/dashboard-comercial': {
    steps: dashboardSteps,
    title: 'Dashboard Comercial'
  },
  '/pre-vendas': {
    steps: preVendasSteps,
    title: 'Pré-Vendas'
  },
  '/pipeline': {
    steps: pipelineSteps,
    title: 'Pipeline de Vendas'
  },
  '/clientes': {
    steps: clientesSteps,
    title: 'Clientes'
  },
  '/producao': {
    steps: producaoSteps,
    title: 'Produção'
  },
  '/politica-comercial': {
    steps: politicaSteps,
    title: 'Política Comercial'
  },
  '/corte-perfil': {
    steps: cortePerfilSteps,
    title: 'Corte de Perfil'
  },
  '/corte-chapa': {
    steps: corteBlankSteps,
    title: 'Corte de Blank'
  },
  '/corte-blank': {
    steps: corteBlankSteps,
    title: 'Corte de Blank'
  },
  '/assistente-global': {
    steps: assistenteSteps,
    title: 'Assistente Global'
  },
  '/crm': {
    steps: crmSteps,
    title: 'CRM'
  }
};

export { sidebarSteps };
