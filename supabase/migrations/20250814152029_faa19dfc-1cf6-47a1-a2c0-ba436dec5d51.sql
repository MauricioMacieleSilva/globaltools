-- Primeiro, vamos adicionar as colunas UF e Cidade na tabela de leads
ALTER TABLE leads 
ADD COLUMN uf text,
ADD COLUMN cidade text;