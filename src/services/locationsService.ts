interface IBGEEstado {
  id: number;
  sigla: string;
  nome: string;
}

interface IBGEMunicipio {
  id: number;
  nome: string;
  microrregiao: {
    mesorregiao: {
      UF: {
        sigla: string;
      };
    };
  };
}

interface CachedLocation {
  data: string[];
  timestamp: number;
  expiry: number;
}

interface EstadoFormatado {
  uf: string;
  nome: string;
  id: number;
}

class LocationsService {
  private cache = new Map<string, CachedLocation>();
  private readonly DEFAULT_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 dias
  private readonly STORAGE_KEY = 'ibge_locations_cache';
  private readonly STORAGE_VERSION = '1.1';
  private readonly REQUEST_TIMEOUT = 10000; // 10 segundos
  private ufToIdMap = new Map<string, number>();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const { version, cache } = JSON.parse(stored);
        if (version === this.STORAGE_VERSION) {
          // Converter array de volta para Map
          this.cache = new Map(cache);
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar cache de localidades do localStorage:', error);
    }
  }

  private saveToLocalStorage() {
    try {
      const cacheData = {
        version: this.STORAGE_VERSION,
        cache: Array.from(this.cache.entries())
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Erro ao salvar cache de localidades no localStorage:', error);
    }
  }

  private isExpired(item: CachedLocation): boolean {
    return Date.now() - item.timestamp > item.expiry;
  }

  async getEstados(): Promise<Array<{ uf: string; nome: string; id: number }>> {
    const cacheKey = 'estados';
    const cached = this.cache.get(cacheKey);
    
    if (cached && !this.isExpired(cached)) {
      const estadosFromCache = JSON.parse(cached.data[0]);
      // Populadar mapa UF -> ID para uso posterior
      estadosFromCache.forEach((estado: EstadoFormatado) => {
        this.ufToIdMap.set(estado.uf, estado.id);
      });
      return estadosFromCache;
    }

    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Falha na requisição');
      
      const estados: IBGEEstado[] = await response.json();
      const estadosFormatados = estados.map(estado => ({
        uf: estado.sigla,
        nome: estado.nome,
        id: estado.id
      }));

      // Preencher mapa UF -> ID
      estadosFormatados.forEach(estado => {
        this.ufToIdMap.set(estado.uf, estado.id);
      });

      // Cache the result
      this.cache.set(cacheKey, {
        data: [JSON.stringify(estadosFormatados)],
        timestamp: Date.now(),
        expiry: this.DEFAULT_EXPIRY
      });
      this.saveToLocalStorage();

      return estadosFormatados;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Erro ao buscar estados do IBGE:', error);
      // Fallback para lista estática
      return this.getFallbackEstados();
    }
  }

  async getCidadesPorEstado(uf: string): Promise<string[]> {
    console.log('LocationsService: getCidadesPorEstado called with UF:', uf);
    const cacheKey = `cidades_${uf}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && !this.isExpired(cached)) {
      console.log('LocationsService: Returning cached cities for', uf, '- count:', cached.data.length);
      return cached.data;
    }

    console.log('LocationsService: Cache miss or expired, fetching from API for', uf);
    // Estratégia dupla: tentar por UF primeiro, depois por ID se falhar
    let cidadesFormatadas: string[] = [];
    
    // Primeira tentativa: por UF
    const controller1 = new AbortController();
    const timeoutId1 = setTimeout(() => controller1.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`, {
        signal: controller1.signal
      });
      
      clearTimeout(timeoutId1);
      
      if (response.ok) {
        const municipios: IBGEMunicipio[] = await response.json();
        cidadesFormatadas = municipios.map(municipio => municipio.nome);
      } else {
        throw new Error('Falha na primeira tentativa');
      }
    } catch (error) {
      clearTimeout(timeoutId1);
      console.warn(`Primeira tentativa falhou para ${uf}, tentando por ID...`, error);
      
      // Segunda tentativa: por ID do estado
      const estadoId = this.ufToIdMap.get(uf);
      if (estadoId) {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), this.REQUEST_TIMEOUT);
        
        try {
          const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoId}/municipios?orderBy=nome`, {
            signal: controller2.signal
          });
          
          clearTimeout(timeoutId2);
          
          if (response.ok) {
            const municipios: IBGEMunicipio[] = await response.json();
            cidadesFormatadas = municipios.map(municipio => municipio.nome);
          } else {
            throw new Error('Falha na segunda tentativa');
          }
        } catch (error2) {
          clearTimeout(timeoutId2);
          console.error(`Ambas tentativas falharam para ${uf}:`, error2);
          return this.getFallbackCidades(uf);
        }
      } else {
        console.error(`ID do estado não encontrado para ${uf}`);
        return this.getFallbackCidades(uf);
      }
    }

    // Se chegamos aqui, uma das tentativas funcionou
    if (cidadesFormatadas.length > 0) {
      // Cache the result
      this.cache.set(cacheKey, {
        data: cidadesFormatadas,
        timestamp: Date.now(),
        expiry: this.DEFAULT_EXPIRY
      });
      this.saveToLocalStorage();
    }

    return cidadesFormatadas.length > 0 ? cidadesFormatadas : this.getFallbackCidades(uf);
  }

  private getFallbackEstados(): Array<{ uf: string; nome: string; id: number }> {
    const fallbackEstados = [
      { uf: 'AC', nome: 'Acre', id: 12 },
      { uf: 'AL', nome: 'Alagoas', id: 17 },
      { uf: 'AP', nome: 'Amapá', id: 16 },
      { uf: 'AM', nome: 'Amazonas', id: 13 },
      { uf: 'BA', nome: 'Bahia', id: 29 },
      { uf: 'CE', nome: 'Ceará', id: 23 },
      { uf: 'DF', nome: 'Distrito Federal', id: 53 },
      { uf: 'ES', nome: 'Espírito Santo', id: 32 },
      { uf: 'GO', nome: 'Goiás', id: 52 },
      { uf: 'MA', nome: 'Maranhão', id: 21 },
      { uf: 'MT', nome: 'Mato Grosso', id: 51 },
      { uf: 'MS', nome: 'Mato Grosso do Sul', id: 50 },
      { uf: 'MG', nome: 'Minas Gerais', id: 31 },
      { uf: 'PA', nome: 'Pará', id: 15 },
      { uf: 'PB', nome: 'Paraíba', id: 25 },
      { uf: 'PR', nome: 'Paraná', id: 41 },
      { uf: 'PE', nome: 'Pernambuco', id: 26 },
      { uf: 'PI', nome: 'Piauí', id: 22 },
      { uf: 'RJ', nome: 'Rio de Janeiro', id: 33 },
      { uf: 'RN', nome: 'Rio Grande do Norte', id: 24 },
      { uf: 'RS', nome: 'Rio Grande do Sul', id: 43 },
      { uf: 'RO', nome: 'Rondônia', id: 11 },
      { uf: 'RR', nome: 'Roraima', id: 14 },
      { uf: 'SC', nome: 'Santa Catarina', id: 42 },
      { uf: 'SP', nome: 'São Paulo', id: 35 },
      { uf: 'SE', nome: 'Sergipe', id: 28 },
      { uf: 'TO', nome: 'Tocantins', id: 27 }
    ];
    
    // Preencher mapa UF -> ID mesmo no fallback
    fallbackEstados.forEach(estado => {
      this.ufToIdMap.set(estado.uf, estado.id);
    });
    
    return fallbackEstados;
  }

  private getFallbackCidades(uf: string): string[] {
    const cidadesPorEstado: Record<string, string[]> = {
      'SC': ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Criciúma', 'Chapecó', 'Itajaí', 'Lages', 'Jaraguá do Sul', 'Palhoça', 'Balneário Camboriú', 'Brusque', 'Tubarão', 'São Bento do Sul', 'Caçador', 'Camboriú', 'Navegantes', 'Concórdia', 'Rio do Sul', 'Araranguá', 'São Miguel do Oeste', 'Videira', 'Xanxerê', 'Maravilha']
    };
    
    return cidadesPorEstado[uf] || [];
  }

  clearCache() {
    this.cache.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalItems: Array.from(this.cache.values()).reduce((acc, item) => acc + item.data.length, 0)
    };
  }
}

export const locationsService = new LocationsService();