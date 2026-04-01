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
  IF p_service_id IS NOT NULL THEN
    SELECT COALESCE(duration_minutes, 60) INTO v_duration_minutes
    FROM services WHERE id = p_service_id;
  END IF;
  
  v_end := COALESCE(p_end_time, p_start_time + (v_duration_minutes || ' minutes')::INTERVAL);
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
  FROM appointments a
  LEFT JOIN customers c ON c.id = a.customer_id
  LEFT JOIN services s ON s.id = a.service_id
  WHERE 
    a.status NOT IN ('cancelado', 'canceled', 'cancelled')
    AND (p_exclude_id IS NULL OR a.id != p_exclude_id)
    AND (a.start_time, COALESCE(a.end_time, a.start_time + INTERVAL '60 minutes')) OVERLAPS (v_start, v_end)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::JSONB;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_appointment_conflict TO anon;
GRANT EXECUTE ON FUNCTION check_appointment_conflict TO authenticated;
