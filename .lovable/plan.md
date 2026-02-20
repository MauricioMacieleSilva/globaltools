

# Tema Moderno com Alternancia de Design

## Resumo

Criar um novo tema visual "Moderno" para o sistema, mantendo o tema atual como "Classico". O usuario podera alternar entre os dois temas atraves de um toggle no menu do avatar ou na sidebar.

## Abordagem Tecnica

A estrategia e baseada em **CSS Variables**, o que permite mudar todo o visual do sistema sem alterar componentes individuais. Apenas trocando as variaveis CSS, cards, botoes, sidebar, header e todos os elementos mudam automaticamente.

### O que muda no tema Moderno

- **Paleta de cores**: Tons mais vibrantes e com mais contraste, gradientes sutis
- **Border radius**: Mais arredondado (0.75rem ao inves de 0.5rem)
- **Sombras**: Sombras mais suaves e difusas (glassmorphism leve)
- **Backgrounds**: Cards com fundo semi-transparente e backdrop-blur
- **Tipografia**: Pesos mais leves, espacamento maior
- **Sidebar**: Fundo escuro com acentos coloridos
- **Header**: Efeito glassmorphism com blur
- **Cards KPI**: Bordas coloridas laterais, hover com elevacao

### Arquivos a criar

1. **`src/context/ThemeContext.tsx`** - Contexto para gerenciar o tema (classico/moderno), salva preferencia no localStorage
2. **CSS no `src/index.css`** - Novas variaveis CSS dentro de `.theme-modern` que sobrescrevem as variaveis do tema classico

### Arquivos a modificar

3. **`src/App.tsx`** - Envolver com `ThemeProvider`, aplicar classe CSS no container raiz
4. **`src/components/UserAvatarMenu.tsx`** - Adicionar toggle "Design Moderno" no popover do avatar com icone de Palette
5. **`src/index.css`** - Adicionar bloco `.theme-modern` com variaveis CSS atualizadas (cores, sombras, radius, backgrounds)
6. **`src/components/AppSidebar.tsx`** - Estilos condicionais para sidebar moderna (fundo escuro, itens com hover gradiente)
7. **`src/components/ui/card.tsx`** - Classe condicional para efeito glassmorphism no tema moderno

### Detalhes Tecnicos

```text
ThemeContext
  |
  |-- theme: 'classic' | 'modern'
  |-- toggleTheme()
  |-- Salva em localStorage('app-theme')
  |
  +-- Aplica classe 'theme-modern' no document.documentElement
```

**Variaveis CSS do tema moderno (exemplo):**
- `--background`: Cinza mais quente
- `--card`: Semi-transparente com backdrop-blur
- `--primary`: Azul mais vibrante com gradiente
- `--radius`: 0.75rem (mais arredondado)
- `--shadow-card`: Sombras maiores e mais difusas
- Sidebar com fundo escuro (`--sidebar-background` escuro)
- Header com efeito glass

**Toggle no avatar:**
- Switch com label "Design Moderno" e icone Sparkles
- Posicionado abaixo do botao "Alterar foto" no popover

### Quantidade estimada de mudancas

- ~2 arquivos novos
- ~5 arquivos modificados
- Nenhuma mudanca na logica de negocios, apenas visual
- Nenhuma mudanca no banco de dados (preferencia salva no localStorage)

