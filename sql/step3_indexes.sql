CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE OR REPLACE FUNCTION get_available_slots(
  p_date DATE,
  p_service_id UUID,
  p_start_hour INTEGER DEFAULT 8,
  p_end_hour INTEGER DEFAULT 20
)
RETURNS TABLE (slot_time TIME) AS $$
DECLARE
  v_duration INTEGER;
BEGIN
  SELECT COALESCE(duration_minutes, 60) INTO v_duration
  FROM services WHERE id = p_service_id;
  
  IF v_duration IS NULL THEN
    v_duration := 60;
  END IF;
  
  RETURN QUERY
  WITH slots AS (
    SELECT generate_series(
      p_date::TIMESTAMP + (p_start_hour || ' hours')::INTERVAL,
      p_date::TIMESTAMP + (p_end_hour || ' hours')::INTERVAL - (v_duration || ' minutes')::INTERVAL,
      '30 minutes'::INTERVAL
    ) AS slot_start
  ),
  busy_slots AS (
    SELECT start_time, COALESCE(end_time, start_time + (v_duration || ' minutes')::INTERVAL) AS end_time
    FROM appointments
    WHERE DATE(start_time) = p_date AND status NOT IN ('cancelado', 'canceled', 'cancelled')
  )
  SELECT (s.slot_start)::TIME
  FROM slots s
  WHERE NOT EXISTS (
    SELECT 1 FROM busy_slots b
    WHERE (s.slot_start, s.slot_start + (v_duration || ' minutes')::INTERVAL) OVERLAPS (b.start_time, b.end_time)
  )
  ORDER BY 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_available_slots TO anon;
GRANT EXECUTE ON FUNCTION get_available_slots TO authenticated;
