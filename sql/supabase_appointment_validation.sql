-- ============================================
-- FUNÇÕES DE VALIDAÇÃO DE AGENDAMENTO
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Função para verificar se há conflito de horário
CREATE OR REPLACE FUNCTION check_appointment_conflict(
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_service_id UUID DEFAULT NULL,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  has_conflict BOOLEAN,
  conflicting_appointment JSONB
) AS $$
DECLARE
  v_duration_minutes INTEGER := 60;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  -- Se passou service_id, buscar duração do serviço
  IF p_service_id IS NOT NULL THEN
    SELECT duration_minutes INTO v_duration_minutes
    FROM services WHERE id = p_service_id;
    
    IF v_duration_minutes IS NULL THEN
      v_duration_minutes := 60;
    END IF;
    
    -- Calcular end_time baseado na duração se não foi passado
    IF p_end_time IS NULL THEN
      v_end := p_start_time + (v_duration_minutes || ' minutes')::INTERVAL;
    ELSE
      v_end := p_end_time;
    END IF;
  ELSE
    v_end := COALESCE(p_end_time, p_start_time + INTERVAL '60 minutes');
  END IF;
  
  v_start := p_start_time;

  RETURN QUERY
  SELECT 
    TRUE,
    jsonb_build_object(
      'id', a.id,
      'start_time', a.start_time,
      'end_time', a.end_time,
      'status', a.status,
      'customer_name', c.name,
      'service_name', s.name
    )
  FROM (
    SELECT id, start_time, end_time, status, customer_id, service_id
    FROM appointments
    WHERE status NOT IN ('cancelado', 'canceled', 'cancelled')
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    
    UNION ALL
    
    SELECT id, start_time, end_time, status, customer_id, service_id
    FROM agendamentos
    WHERE status NOT IN ('cancelado', 'cancelado', 'cancelled')
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
  ) a
  LEFT JOIN customers c ON c.id = a.customer_id
  LEFT JOIN services s ON s.id = a.service_id
  LEFT JOIN servicos srv ON srv.id = a.service_id
  WHERE 
    -- Conflito: sobreposição de horários
    (a.start_time, COALESCE(a.end_time, a.start_time + INTERVAL '60 minutes')) 
    OVERLAPS 
    (v_start, v_end)
  LIMIT 1;

  -- Se não encontrou conflito
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::JSONB;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função segura para criar agendamento (com verificação de conflito)
CREATE OR REPLACE FUNCTION safe_create_appointment(
  p_customer_id UUID,
  p_service_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_duration INTEGER;
  v_end TIMESTAMPTZ;
  v_conflict BOOLEAN;
  v_conflict_data JSONB;
  v_result JSONB;
  v_table TEXT;
BEGIN
  -- Buscar duração do serviço
  SELECT COALESCE(duration_minutes, 60) INTO v_duration
  FROM services WHERE id = p_service_id;
  
  IF v_duration IS NULL THEN
    SELECT COALESCE(duration_minutes, 60) INTO v_duration
    FROM servicos WHERE id = p_service_id;
  END IF;
  
  IF v_duration IS NULL THEN
    v_duration := 60;
  END IF;
  
  -- Calcular end_time
  v_end := COALESCE(p_end_time, p_start_time + (v_duration || ' minutes')::INTERVAL);
  
  -- Verificar conflito
  SELECT has_conflict, conflicting_appointment INTO v_conflict, v_conflict_data
  FROM check_appointment_conflict(p_start_time, v_end, p_service_id, NULL);
  
  IF v_conflict THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Horário conflita com agendamento existente',
      'conflict', v_conflict_data
    );
  END IF;
  
  -- Tentar inserir na tabela appointments
  BEGIN
    INSERT INTO appointments (customer_id, service_id, start_time, end_time, status, created_at)
    VALUES (p_customer_id, p_service_id, p_start_time, v_end, 'agendado', NOW())
    RETURNING to_jsonb(row) INTO v_result;
    
    v_table := 'appointments';
  EXCEPTION WHEN OTHERS THEN
    -- Se falhou, tentar na tabela agendamentos
    BEGIN
      INSERT INTO agendamentos (customer_id, service_id, start_time, end_time, status, created_at)
      VALUES (p_customer_id, p_service_id, p_start_time, v_end, 'agendado', NOW())
      RETURNING to_jsonb(row) INTO v_result;
      
      v_table := 'agendamentos';
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Falha ao criar agendamento: ' || SQLERRM
      );
    END;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', v_result,
    'table', v_table
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION check_appointment_conflict TO anon;
GRANT EXECUTE ON FUNCTION check_appointment_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION safe_create_appointment TO anon;
GRANT EXECUTE ON FUNCTION safe_create_appointment TO authenticated;

-- 4. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_start_time ON agendamentos(start_time);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);

-- 5. Função para buscar horários disponíveis (retorna slots livres)
CREATE OR REPLACE FUNCTION get_available_slots(
  p_date DATE,
  p_service_id UUID,
  p_start_hour INTEGER DEFAULT 8,
  p_end_hour INTEGER DEFAULT 20
)
RETURNS TABLE (slot_time TIME) AS $$
DECLARE
  v_duration INTEGER;
  v_slot_interval INTEGER := 30; -- Intervalo de 30 minutos entre slots
BEGIN
  -- Buscar duração do serviço
  SELECT COALESCE(duration_minutes, 60) INTO v_duration
  FROM services WHERE id = p_service_id;
  
  IF v_duration IS NULL THEN
    SELECT COALESCE(duration_minutes, 60) INTO v_duration
    FROM servicos WHERE id = p_service_id;
  END IF;
  
  IF v_duration IS NULL THEN
    v_duration := 60;
  END IF;
  
  -- Gerar slots disponíveis
  RETURN QUERY
  WITH slots AS (
    SELECT generate_series(
      p_date::TIMESTAMP + (p_start_hour || ' hours')::INTERVAL,
      p_date::TIMESTAMP + (p_end_hour || ' hours')::INTERVAL - (v_duration || ' minutes')::INTERVAL,
      (v_slot_interval || ' minutes')::INTERVAL
    ) AS slot_start
  ),
  appointments_on_date AS (
    SELECT start_time, COALESCE(end_time, start_time + (v_duration || ' minutes')::INTERVAL) AS end_time
    FROM appointments
    WHERE DATE(start_time) = p_date AND status NOT IN ('cancelado', 'canceled', 'cancelled')
    
    UNION ALL
    
    SELECT start_time, COALESCE(end_time, start_time + (v_duration || ' minutes')::INTERVAL) AS end_time
    FROM agendamentos
    WHERE DATE(start_time) = p_date AND status NOT IN ('cancelado', 'cancelado', 'cancelled')
  ),
  unavailable_slots AS (
    SELECT slot_start, slot_start + (v_duration || ' minutes')::INTERVAL AS slot_end
    FROM slots s
    WHERE EXISTS (
      SELECT 1 FROM appointments_on_date a
      WHERE (s.slot_start, s.slot_start + (v_duration || ' minutes')::INTERVAL) 
            OVERLAPS (a.start_time, a.end_time)
    )
  )
  SELECT (s.slot_start)::TIME AS slot_time
  FROM slots s
  WHERE NOT EXISTS (
    SELECT 1 FROM unavailable_slots u
    WHERE (s.slot_start, s.slot_start + (v_duration || ' minutes')::INTERVAL) 
          OVERLAPS (u.slot_start, u.slot_end)
  )
  ORDER BY slot_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_available_slots TO anon;
GRANT EXECUTE ON FUNCTION get_available_slots TO authenticated;

-- ============================================
-- FIM DAS FUNÇÕES
-- ============================================

-- Verificar se as funções foram criadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('check_appointment_conflict', 'safe_create_appointment', 'get_available_slots');
