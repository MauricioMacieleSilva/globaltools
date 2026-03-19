

## Plano: Mapa de Bolhas Profissional com react-simple-maps

### Avaliação das Opções

| Opção | Prós | Contras |
|-------|------|---------|
| **react-simple-maps** | Leve (~50kb), SVG puro, TopoJSON real do Brasil, zero API key, funciona offline, total controle visual | Precisa de arquivo TopoJSON externo |
| Google Maps API | Mapa "real" com satélite/ruas | Precisa de API key paga, pesado, estilo difícil de customizar para dark mode, overhead enorme para um bubble chart |
| Leaflet/MapLibre | Mapa de tiles real | Pesado, complexo, tiles externos, overkill para visualização por estado |
| Mapbox | Visual premium | API key paga, pesado |

**Decisão: `react-simple-maps`** - é a solução padrão da indústria para este tipo de visualização (bubble map por região). Usa dados geográficos reais (TopoJSON) com contornos precisos dos estados. Não precisa de API key, é leve e permite total controle de estilo (dark/light mode). Google Maps seria overkill e inadequado para este caso de uso.

### Implementação

**1. Instalar dependências**
- `react-simple-maps` - renderiza mapa geográfico real via TopoJSON
- `react-tooltip` - tooltips profissionais com animação

**2. Fonte de dados geográficos**
- TopoJSON oficial do Brasil hospedado publicamente (IBGE/Natural Earth)
- URL: `https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson` (ou equivalente TopoJSON)
- Contornos reais e precisos de cada estado

**3. Reescrever `BrazilBubbleMap.tsx`**
- `ComposableMap` com projeção `geoMercator` centrada no Brasil
- `Geographies` renderiza os contornos reais dos 27 estados
- Cada estado preenchido com cor suave (muted) e borda fina
- `Marker` com coordenadas lat/lng reais dos centróides posiciona as bolhas
- Como o foco é RS, a projeção pode dar um leve zoom no sul sem perder o contexto nacional
- Toggle valor/peso mantido, tooltips via `react-tooltip`
- Animação CSS transition nas bolhas ao trocar modo

**4. Coordenadas reais dos centróides**
- Usar lat/lng reais (ex: RS = [-30.03, -51.23], SC = [-27.59, -48.55], PR = [-25.42, -49.27], SP = [-23.55, -46.63])
- A projeção geográfica posiciona automaticamente no lugar correto

**5. Visual**
- Estados: fill `hsl(var(--muted))`, stroke `hsl(var(--border))`
- Bolhas: mesma lógica de cores atual (azul valor, laranja peso)
- Tooltips: estado, valor formatado R$, peso formatado em toneladas
- Responsivo ao dark/light mode

### Arquivos
- **Modificar**: `src/components/dashboard/BrazilBubbleMap.tsx` (reescrita completa)
- **Instalar**: `react-simple-maps`, `@types/react-simple-maps`, `react-tooltip`
- Sem alterações no dashboard layout

