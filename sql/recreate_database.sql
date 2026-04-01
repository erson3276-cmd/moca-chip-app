-- ============================================
-- BANCO DE DADOS COMPLETO - MOÇA CHIQ
-- Recriar TODAS as tabelas do zero
-- Executar no Supabase SQL Editor
-- ============================================

-- 1. Tabela de SERVIÇOS
DROP TABLE IF EXISTS services CASCADE;
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) DEFAULT 0,
  duration_minutes INTEGER DEFAULT 60,
  description TEXT,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de CLIENTES
DROP TABLE IF EXISTS customers CASCADE;
CREATE TABLE customers (
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
DROP TABLE IF EXISTS appointments CASCADE;
CREATE TABLE appointments (
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
DROP TABLE IF EXISTS vendas CASCADE;
CREATE TABLE vendas (
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
DROP INDEX IF EXISTS idx_appointments_start;
DROP INDEX IF EXISTS idx_appointments_status;
DROP INDEX IF EXISTS idx_appointments_customer;
DROP INDEX IF EXISTS idx_vendas_date;
DROP INDEX IF EXISTS idx_vendas_customer;
DROP INDEX IF EXISTS idx_customers_name;
DROP INDEX IF EXISTS idx_customers_active;
DROP INDEX IF EXISTS idx_services_name;
DROP INDEX IF EXISTS idx_services_category;
DROP INDEX IF EXISTS idx_services_active;

CREATE INDEX idx_appointments_start ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_vendas_date ON vendas(date);
CREATE INDEX idx_vendas_customer ON vendas(customer_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_active ON customers(active);
CREATE INDEX idx_services_name ON services(name);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(active);

-- 6. Dados iniciais - SERVIÇOS
DELETE FROM services;
INSERT INTO services (name, price, duration_minutes, description, category) VALUES
  ('Corte Feminino', 80.00, 60, 'Corte feminino clássico com finalização', 'Cabelo'),
  ('Corte Masculino', 50.00, 30, 'Corte masculino moderno', 'Cabelo'),
  ('Escova', 60.00, 45, 'Escova modeladora', 'Cabelo'),
  ('Pintura Completa', 120.00, 120, 'Pintura de cabelo completa com retoque', 'Cabelo'),
  ('Mechas / Luzes', 150.00, 180, 'Mechas finas ou grossas', 'Cabelo'),
  ('Hidratação', 70.00, 45, 'Tratamento hidratante profundo', 'Cabelo'),
  ('Acrygel', 200.00, 180, 'Unhas em acrygel esculpidas', 'Unhas'),
  ('Manicure', 40.00, 45, 'Manicure tradicional', 'Unhas'),
  ('Pedicure', 50.00, 60, 'Pedicure completa', 'Unhas'),
  ('Sobrancelha', 30.00, 20, 'Design de sobrancelha', 'Estética'),
  ('Depilação Buço', 25.00, 15, 'Depilação de buço com cera', 'Depilação'),
  ('Maquiagem', 150.00, 60, 'Maquiagem profissional', 'Maquiagem'),
  ('Maquiagem noivas', 350.00, 120, 'Maquiagem para.noivas', 'Maquiagem');

-- 7. Dados iniciais - CLIENTES
DELETE FROM customers;
INSERT INTO customers (name, whatsapp, phone, email, notes) VALUES
  ('Maria Silva', '(21) 99999-0001', '(21) 3333-0001', 'maria@email.com', 'Cliente VIP - prefere horário matinal'),
  ('Ana Costa', '(21) 99999-0002', '(21) 3333-0002', 'ana@email.com', NULL),
  ('Julia Santos', '(21) 99999-0003', '(21) 3333-0003', 'julia@email.com', 'Alérgica a produtos com amônia'),
  ('Carla Oliveira', '(21) 99999-0004', '(21) 3333-0004', 'carla@email.com', 'Prefere tons claros'),
  ('Fernanda Lima', '(21) 99999-0005', '(21) 3333-0005', 'fernanda@email.com', 'Cliente antiga - 2 anos'),
  ('Patrícia Rocha', '(21) 99999-0006', '(21) 3333-0006', 'patricia@email.com', NULL),
  ('Renata Alves', '(21) 99999-0007', '(21) 3333-0007', 'renata@email.com', 'Sempre às sextas'),
  ('Beatriz Souza', '(21) 99999-0008', '(21) 3333-0008', 'beatriz@email.com', NULL);

-- 8. Dados iniciais - VENDAS (exemplos do mês atual)
DELETE FROM vendas;
INSERT INTO vendas (customer_id, service_id, amount, payment_method, date)
SELECT 
  c.id as customer_id,
  s.id as service_id,
  s.price as amount,
  (ARRAY['Pix', 'Crédito', 'Débito', 'Dinheiro'])[floor(random() * 4 + 1)::int] as payment_method,
  NOW() - (random() * 15 || ' days')::interval as date
FROM customers c
CROSS JOIN services s
WHERE c.name = 'Maria Silva'
LIMIT 5;

INSERT INTO vendas (customer_id, service_id, amount, payment_method, date)
SELECT 
  c.id as customer_id,
  s.id as service_id,
  s.price as amount,
  'Pix' as payment_method,
  NOW() - (random() * 10 || ' days')::interval as date
FROM customers c
CROSS JOIN services s
WHERE c.name = 'Ana Costa'
LIMIT 3;

-- 9. Função para verificar conflitos de horário
DROP FUNCTION IF EXISTS check_time_conflict;
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

-- 10. Função para atualizar timestamp
DROP FUNCTION IF EXISTS update_updated_at;
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Triggers para updated_at
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 12. Permissões RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for service role" ON services;
DROP POLICY IF EXISTS "Enable all for authenticated" ON services;
DROP POLICY IF EXISTS "Enable all for service role" ON customers;
DROP POLICY IF EXISTS "Enable all for authenticated" ON customers;
DROP POLICY IF EXISTS "Enable all for service role" ON appointments;
DROP POLICY IF EXISTS "Enable all for authenticated" ON appointments;
DROP POLICY IF EXISTS "Enable all for service role" ON vendas;
DROP POLICY IF EXISTS "Enable all for authenticated" ON vendas;

CREATE POLICY "Enable all for service role" ON services FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service role" ON customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service role" ON appointments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for service role" ON vendas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON vendas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Verificar resultado
SELECT 'Services: ' || COUNT(*) as result FROM services;
SELECT 'Customers: ' || COUNT(*) as result FROM customers;
SELECT 'Appointments: ' || COUNT(*) as result FROM appointments;
SELECT 'Vendas: ' || COUNT(*) as result FROM vendas;
