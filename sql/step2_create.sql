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
BEGIN
  SELECT COALESCE(duration_minutes, 60) INTO v_duration
  FROM services WHERE id = p_service_id;
  
  IF v_duration IS NULL THEN
    v_duration := 60;
  END IF;
  
  v_end := COALESCE(p_end_time, p_start_time + (v_duration || ' minutes')::INTERVAL);
  
  SELECT has_conflict, conflicting_appointment INTO v_conflict, v_conflict_data
  FROM check_appointment_conflict(p_start_time, v_end, p_service_id, NULL);
  
  IF v_conflict THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Horario conflita com agendamento existente',
      'conflict', v_conflict_data
    );
  END IF;
  
  INSERT INTO appointments (customer_id, service_id, start_time, end_time, status, created_at)
  VALUES (p_customer_id, p_service_id, p_start_time, v_end, 'agendado', NOW())
  RETURNING to_jsonb(appointments.*) INTO v_result;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', v_result
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Falha ao criar agendamento: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION safe_create_appointment TO anon;
GRANT EXECUTE ON FUNCTION safe_create_appointment TO authenticated;
