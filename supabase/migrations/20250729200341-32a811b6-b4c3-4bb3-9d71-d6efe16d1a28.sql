-- Inserir artigos iniciais da Global Aço para alimentar a base de conhecimento

-- Primeiro, criar categorias básicas
INSERT INTO public.knowledge_categories (name, description, icon, color, display_order) VALUES
  ('Produtos', 'Informações sobre produtos da Global Aço', 'Package', '#2563EB', 1),
  ('Processos', 'Processos de fabricação e corte', 'Settings', '#DC2626', 2),
  ('Atendimento', 'Informações de atendimento ao cliente', 'HeadphonesIcon', '#16A34A', 3),
  ('Técnico', 'Especificações e informações técnicas', 'Wrench', '#EA580C', 4)
ON CONFLICT (name) DO NOTHING;

-- Inserir artigos básicos com informações da Global Aço
INSERT INTO public.knowledge_articles (title, content, summary, category_id, keywords, search_terms, is_published, is_featured, article_type, difficulty_level, priority)
SELECT 
  'Telhas Metálicas TP40',
  'As telhas metálicas TP40 são uma das principais soluções oferecidas pela Global Aço para cobertura industrial e residencial.

**Características:**
- Perfil trapezoidal de alta resistência
- Largura útil: 1000mm
- Espessuras disponíveis: 0,43mm a 0,80mm
- Material: Aço galvanizado ou galvalume
- Comprimentos: Sob medida conforme necessidade

**Aplicações:**
- Galpões industriais
- Residências
- Comércio
- Construção civil em geral

**Vantagens:**
- Alta durabilidade
- Resistência à corrosão
- Facilidade de instalação
- Excelente custo-benefício

Para orçamentos e especificações técnicas detalhadas, entre em contato com nossa equipe comercial.',
  'Telhas metálicas TP40 para cobertura industrial e residencial com alta resistência e durabilidade.',
  (SELECT id FROM public.knowledge_categories WHERE name = 'Produtos' LIMIT 1),
  ARRAY['telha', 'tp40', 'metálica', 'cobertura', 'galvanizado'],
  ARRAY['telha tp40', 'telhas metálicas', 'cobertura', 'galvanizado'],
  true,
  true,
  'product',
  'beginner',
  5

UNION ALL SELECT
  'Processo de Corte a Laser',
  'A Global Aço utiliza tecnologia de corte a laser de última geração para garantir precisão e qualidade nos produtos.

**Como funciona:**
1. **Programação**: Desenho técnico é convertido em programa CNC
2. **Posicionamento**: Material é posicionado na mesa de corte
3. **Corte**: Laser de alta potência realiza o corte seguindo o programa
4. **Acabamento**: Peças passam por controle de qualidade

**Vantagens do corte a laser:**
- Precisão milimétrica
- Cortes limpos sem rebarbas
- Possibilidade de formas complexas
- Rapidez na execução
- Aproveitamento otimizado do material

**Materiais processados:**
- Aço carbono até 20mm
- Aço inox até 10mm
- Alumínio até 8mm

**Capacidades:**
- Mesa de corte: 3000 x 1500mm
- Velocidade: Até 25m/min
- Tolerância: ±0,1mm',
  'Processo de corte a laser com alta precisão para diversos tipos de materiais metálicos.',
  (SELECT id FROM public.knowledge_categories WHERE name = 'Processos' LIMIT 1),
  ARRAY['corte', 'laser', 'precisão', 'cnc', 'processo'],
  ARRAY['corte a laser', 'processo de corte', 'laser', 'cnc'],
  true,
  true,
  'process',
  'intermediate',
  4

UNION ALL SELECT
  'Como Solicitar Orçamento',
  'Para solicitar um orçamento na Global Aço, siga os passos abaixo:

**Informações necessárias:**
- Especificação do produto (tipo, dimensões, espessura)
- Quantidade desejada
- Prazo de entrega
- Local de entrega
- Desenhos técnicos (se houver)

**Canais de atendimento:**
- **Telefone**: (11) 1234-5678
- **Email**: comercial@globalaco.com.br
- **WhatsApp**: (11) 99999-9999
- **Presencial**: Rua Industrial, 123 - São Paulo/SP

**Processo:**
1. Envie as especificações por um dos canais
2. Nossa equipe técnica analisa o projeto
3. Calculamos o orçamento personalizado
4. Enviamos proposta em até 24h
5. Negociamos condições comerciais

**Dicas importantes:**
- Seja específico nas medidas
- Informe quantidade exata
- Mencione prazo desejado
- Anexe desenhos quando possível

Nossa equipe comercial está pronta para atender você com agilidade e qualidade!',
  'Passo a passo para solicitar orçamentos na Global Aço com todas as informações necessárias.',
  (SELECT id FROM public.knowledge_categories WHERE name = 'Atendimento' LIMIT 1),
  ARRAY['orçamento', 'pedido', 'comercial', 'atendimento', 'contato'],
  ARRAY['como solicitar orçamento', 'fazer pedido', 'orçamento', 'comercial'],
  true,
  true,
  'faq',
  'beginner',
  5

UNION ALL SELECT
  'Perfis Estruturais U',
  'Os perfis estruturais em U são elementos fundamentais na construção metálica, oferecendo versatilidade e resistência.

**Características técnicas:**
- Material: Aço carbono SAE 1020/1045
- Comprimento padrão: 6 metros ou 12 metros
- Acabamento: Natural, galvanizado ou pintado
- Normas: ABNT NBR 6355

**Dimensões disponíveis:**
- U 2" x 1" (50,8 x 25,4mm)
- U 3" x 1,5" (76,2 x 38,1mm)
- U 4" x 2" (101,6 x 50,8mm)
- U 6" x 2" (152,4 x 50,8mm)
- U 8" x 2,5" (203,2 x 63,5mm)

**Aplicações:**
- Estruturas metálicas
- Esquadrias
- Portões e grades
- Suportes industriais
- Construção civil

**Vantagens:**
- Alta resistência mecânica
- Facilidade de soldagem
- Versatilidade de aplicação
- Durabilidade

Para especificações técnicas detalhadas e cargas de trabalho, consulte nossa equipe técnica.',
  'Perfis estruturais em U para construção metálica com diversas dimensões e aplicações.',
  (SELECT id FROM public.knowledge_categories WHERE name = 'Produtos' LIMIT 1),
  ARRAY['perfil', 'estrutural', 'u', 'aço', 'construção'],
  ARRAY['perfil u', 'perfil estrutural', 'aço u', 'construção metálica'],
  true,
  false,
  'product',
  'intermediate',
  3

UNION ALL SELECT
  'Dobra e Conformação',
  'A Global Aço oferece serviços de dobra e conformação de chapas metálicas com equipamentos modernos.

**Equipamentos disponíveis:**
- Dobradeira hidráulica 100 toneladas
- Calandra para cilindros até 3000mm
- Prensa excêntrica 60 toneladas
- Equipamentos CNC para precisão

**Materiais processados:**
- Chapas de aço carbono até 6mm
- Chapas de aço inox até 4mm
- Chapas de alumínio até 5mm

**Processos oferecidos:**
- **Dobra**: Ângulos de 0° a 135°
- **Calandragem**: Cilindros e cones
- **Estampagem**: Formas complexas
- **Conformação**: Peças especiais

**Capacidades:**
- Comprimento máximo: 3000mm
- Precisão angular: ±0,5°
- Raio mínimo de dobra: 2x espessura

**Controle de qualidade:**
- Verificação dimensional
- Teste de ângulos
- Inspeção visual
- Documentação completa

Entre em contato para discutir seu projeto específico!',
  'Serviços de dobra e conformação de chapas metálicas com equipamentos modernos e alta precisão.',
  (SELECT id FROM public.knowledge_categories WHERE name = 'Processos' LIMIT 1),
  ARRAY['dobra', 'conformação', 'chapa', 'dobradeira', 'calandra'],
  ARRAY['dobra de chapa', 'conformação', 'dobradeira', 'calandragem'],
  true,
  false,
  'process',
  'intermediate',
  3;