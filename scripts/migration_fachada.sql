-- Create billing_requests table
CREATE TABLE IF NOT EXISTS billing_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES billing_customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_id_number TEXT,
    customer_address TEXT,
    customer_phone TEXT,
    business_area TEXT,
    request_type TEXT NOT NULL CHECK (request_type IN ('Impulsadora', 'Especial', 'Fachada')),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create fachada_inspections table with detailed fields
CREATE TABLE IF NOT EXISTS fachada_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES billing_requests(id) ON DELETE CASCADE,
    dimensions_height NUMERIC NOT NULL,
    dimensions_width NUMERIC NOT NULL,
    design_details TEXT NOT NULL,
    structure_type TEXT NOT NULL,
    material_specs TEXT NOT NULL,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to billing_invoices
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_invoices' AND column_name='document_type') THEN
        ALTER TABLE billing_invoices ADD COLUMN document_type TEXT DEFAULT 'Factura';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_invoices' AND column_name='request_id') THEN
        ALTER TABLE billing_invoices ADD COLUMN request_id UUID REFERENCES billing_requests(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_invoices' AND column_name='items') THEN
        ALTER TABLE billing_invoices ADD COLUMN items JSONB;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE billing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE fachada_inspections ENABLE ROW LEVEL SECURITY;

-- Create policies (Allowing public/anon access for the inspection flow)
CREATE POLICY "Allow anon read billing_requests" 
ON billing_requests FOR SELECT 
TO public 
USING (status = 'pending_inspection');

CREATE POLICY "Allow anon insert fachada_inspections" 
ON fachada_inspections FOR INSERT 
TO public 
WITH CHECK (true);

CREATE POLICY "Allow anon update billing_requests" 
ON billing_requests FOR UPDATE 
TO public 
USING (status = 'pending_inspection');

-- Authenticated users still have full access
CREATE POLICY "Allow all for authenticated users on billing_requests" 
ON billing_requests FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users on fachada_inspections" 
ON fachada_inspections FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
