-- Supabase SQL Schema for Rental Management System

-- 1. Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed a default admin if table is empty (username: admin, password_hash: raw password 'admin123' or bcrypt)
-- Note: Our application handles password validation. If you manually insert, write matching hash.

-- 2. Cities
CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    province TEXT NOT NULL, -- e.g., Punjab, Sindh, KPK, Balochistan, Federal Capital
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Areas
CREATE TABLE IF NOT EXISTS areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    UNIQUE (city_id, name),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Properties
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
    property_type TEXT NOT NULL, -- Plaza, House, Shop Line, Flat Building, Basement, Office Building, Room Building, Other
    address TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Active' NOT NULL, -- Active, Inactive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Floors / Sections
CREATE TABLE IF NOT EXISTS floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. Basement, Ground Floor, First Floor, Block A
    UNIQUE(property_id, name),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Units
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE RESTRICT,
    name TEXT NOT NULL, -- e.g. Shop 01, Flat 101, Room 05
    unit_type TEXT NOT NULL, -- Shop, Office, Apartment, Room, Hall, Portion, Other
    rent_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'Vacant' NOT NULL, -- Rented, Vacant, Pending (Rent Pending/Partial)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(property_id, floor_id, name)
);

-- 7. Tenants
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    cnic TEXT UNIQUE NOT NULL, -- Pakistani CNIC
    phone TEXT NOT NULL,
    address TEXT,
    emergency_contact TEXT,
    cnic_front_url TEXT,
    cnic_back_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Rent Agreements
CREATE TABLE IF NOT EXISTS rent_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    monthly_rent NUMERIC(12, 2) NOT NULL,
    advance_amount NUMERIC(12, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    due_day INT DEFAULT 5 NOT NULL, -- Rent due day of the month
    status TEXT DEFAULT 'Active' NOT NULL, -- Active, Ended
    agreement_doc_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Rent Payments
CREATE TABLE IF NOT EXISTS rent_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    agreement_id UUID NOT NULL REFERENCES rent_agreements(id) ON DELETE RESTRICT,
    rent_month INT NOT NULL, -- 1 to 12
    rent_year INT NOT NULL,
    total_rent NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL,
    pending_amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL, -- Paid, Partial, Pending
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL, -- Cash, Bank, JazzCash, EasyPaisa, Other
    payment_proof_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Advance Payments
CREATE TABLE IF NOT EXISTS advance_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    agreement_id UUID NOT NULL REFERENCES rent_agreements(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    received_date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Advance Adjustments
CREATE TABLE IF NOT EXISTS advance_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_payment_id UUID NOT NULL REFERENCES advance_payments(id) ON DELETE CASCADE,
    agreement_id UUID NOT NULL REFERENCES rent_agreements(id) ON DELETE RESTRICT,
    adjusted_amount NUMERIC(12, 2) NOT NULL,
    remaining_advance NUMERIC(12, 2) NOT NULL,
    adjustment_date DATE DEFAULT CURRENT_DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    related_type TEXT NOT NULL, -- Tenant, Unit, Agreement, Payment
    related_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL, -- Base64 encoded or absolute path
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Property Images
CREATE TABLE IF NOT EXISTS property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL, -- e.g. "City added", "Tenant edited"
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
