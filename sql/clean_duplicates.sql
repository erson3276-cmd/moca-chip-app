-- Script para limpar agendamentos duplicados (manter apenas o mais recente por horario)
-- Mantem: finalizado > agendado > cancelado > falta

DELETE FROM appointments a
USING appointments b
WHERE 
  a.id < b.id
  AND a.start_time = b.start_time
  AND a.status = b.status
  AND (
    -- Se tem o mesmo horario e mesmo status, deletar o mais antigo
    (a.start_time, a.end_time) = (b.start_time, b.end_time)
  );

-- Ver quantos agendamentos tem por horario
SELECT start_time, COUNT(*) as total, 
  COUNT(*) FILTER (WHERE status = 'agendado') as agendado,
  COUNT(*) FILTER (WHERE status = 'finalizado') as finalizado,
  COUNT(*) FILTER (WHERE status = 'cancelado') as cancelado
FROM appointments
GROUP BY start_time
HAVING COUNT(*) > 1
ORDER BY start_time;
