-- ============================================
-- BANCO DE DADOS COMPLETO - MOÇA CHIQ
-- Recriar tabelas da agenda do zero
-- ============================================

-- 1. Tabela de SERVIÇOS
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) DEFAULT 0,
  duration_minutes INTEGER DEFAULT 60,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de CLIENTES
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de AGENDAMENTOS
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'finalizado', 'cancelado', 'falta')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de VENDAS
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('Pix', 'Crédito', 'Débito', 'Dinheiro')),
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_vendas_date ON vendas(date);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- 6. Inserir dados iniciais
INSERT INTO services (name, price, duration_minutes, description) VALUES
  ('Corte Feminino', 80.00, 60, 'Corte feminino clássico'),
  ('Corte Masculino', 50.00, 30, 'Corte masculino'),
  ('Escova', 60.00, 45, 'Escova modeladora'),
  ('Pintura', 120.00, 120, 'Pintura de cabelo'),
  ('Acrygel', 200.00, 180, 'Unhas em acrygel'),
  ('Manicure', 40.00, 45, 'Manicure tradicional'),
  ('Pedicure', 50.00, 60, 'Pedicure'),
  ('Sobrancelha', 30.00, 20, 'Design de sobrancelha'),
  ('Maquiagem', 150.00, 60, 'Maquiagem profissional')
ON CONFLICT DO NOTHING;

INSERT INTO customers (name, whatsapp, email) VALUES
  ('Maria Silva', '(21) 99999-0001', 'maria@email.com'),
  ('Ana Costa', '(21) 99999-0002', 'ana@email.com'),
  ('Julia Santos', '(21) 99999-0003', 'julia@email.com'),
  ('Carla Oliveira', '(21) 99999-0004', 'carla@email.com'),
  ('Fernanda Lima', '(21) 99999-0005', 'fernanda@email.com')
ON CONFLICT DO NOTHING;

-- 7. Função para verificar conflitos de horário
CREATE OR REPLACE FUNCTION check_time_conflict(
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_conflict_count
  FROM appointments
  WHERE status NOT IN ('cancelado', 'falta')
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    AND start_time < p_end_time
    AND end_time > p_start_time;
  
  RETURN v_conflict_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Permissões
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for service role" ON services FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service role" ON customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service role" ON appointments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service role" ON vendas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON vendas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Verificar resultado
SELECT 'Services: ' || COUNT(*) FROM services;
SELECT 'Customers: ' || COUNT(*) FROM customers;
SELECT 'Appointments: ' || COUNT(*) FROM appointments;
SELECT 'Vendas: ' || COUNT(*) FROM vendas;
