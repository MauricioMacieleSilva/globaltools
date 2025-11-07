-- Adicionar campo pipeline_status para controlar status separadamente no pipeline
ALTER TABLE leads ADD COLUMN pipeline_status TEXT;

-- Atualizar leads já encaminhados para ter pipeline_status = 'encaminhado'
UPDATE leads 
SET pipeline_status = 'encaminhado' 
WHERE forwarded_to_specialist = true AND pipeline_status IS NULL;