import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase or JSON fallback
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_KEY ||
  '';

export const isSupabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = isSupabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// JSON Datastore Paths
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Interface definition for data types
export interface City {
  id: string;
  name: string;
  province: string;
  created_at: string;
}

export interface Area {
  id: string;
  city_id: string;
  name: string;
  created_at: string;
}

export interface Property {
  id: string;
  name: string;
  city_id: string;
  area_id: string;
  property_type: string;
  address: string;
  description: string;
  status: string;
  img_url?: string;
  created_at: string;
}

export interface Floor {
  id: string;
  property_id: string;
  name: string;
  created_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  floor_id: string;
  name: string;
  unit_type: string;
  rent_amount: number;
  advance_amount: number;
  status: string; // Rented, Vacant, Pending
  notes: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  father_name: string;
  cnic: string;
  phone: string;
  address: string;
  emergency_contact: string;
  cnic_front_url?: string;
  cnic_back_url?: string;
  notes: string;
  created_at: string;
}

export interface RentAgreement {
  id: string;
  tenant_id: string;
  unit_id: string;
  monthly_rent: number;
  advance_amount: number;
  start_date: string;
  end_date: string;
  due_day: number;
  status: string; // Active, Ended
  agreement_doc_url?: string;
  notes: string;
  created_at: string;
}

export interface RentPayment {
  id: string;
  tenant_id: string;
  unit_id: string;
  agreement_id: string;
  rent_month: number;
  rent_year: number;
  total_rent: number;
  paid_amount: number;
  pending_amount: number;
  status: string; // Paid, Partial, Pending
  payment_date: string;
  payment_method: string;
  payment_proof_url?: string;
  notes: string;
  created_at: string;
}

export interface AdvancePayment {
  id: string;
  tenant_id: string;
  unit_id: string;
  agreement_id: string;
  amount: number;
  received_date: string;
  payment_method: string;
  notes: string;
  created_at: string;
}

export interface AdvanceAdjustment {
  id: string;
  advance_payment_id: string;
  agreement_id: string;
  adjusted_amount: number;
  remaining_advance: number;
  adjustment_date: string;
  notes: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  created_at: string;
}

export interface DatastoreSchema {
  admin_users: AdminUser[];
  cities: City[];
  areas: Area[];
  properties: Property[];
  floors: Floor[];
  units: Unit[];
  tenants: Tenant[];
  rent_agreements: RentAgreement[];
  rent_payments: RentPayment[];
  advance_payments: AdvancePayment[];
  advance_adjustments: AdvanceAdjustment[];
  activity_logs: ActivityLog[];
}

// Initial Data Seed for Fallback
const initialDb: DatastoreSchema = {
  admin_users: [
    {
      id: 'admin-1',
      username: 'admin',
      password_hash: 'admin123', // Clean, direct admin login for ease of use
      full_name: 'Super Admin',
      created_at: new Date().toISOString()
    }
  ],
  cities: [
    { id: 'city-pew', name: 'Peshawar', province: 'Khyber Pakhtunkhwa', created_at: new Date().toISOString() },
    { id: 'city-isb', name: 'Islamabad', province: 'Federal Capital', created_at: new Date().toISOString() },
    { id: 'city-lhr', name: 'Lahore', province: 'Punjab', created_at: new Date().toISOString() }
  ],
  areas: [
    { id: 'area-saddar', city_id: 'city-pew', name: 'Saddar', created_at: new Date().toISOString() },
    { id: 'area-hayatabad', city_id: 'city-pew', name: 'Hayatabad', created_at: new Date().toISOString() },
    { id: 'area-f6', city_id: 'city-isb', name: 'F-6 Sector', created_at: new Date().toISOString() },
    { id: 'area-gulberg', city_id: 'city-lhr', name: 'Gulberg', created_at: new Date().toISOString() }
  ],
  properties: [
    { id: 'prop-abc', name: 'ABC Plaza', city_id: 'city-pew', area_id: 'area-saddar', property_type: 'Plaza', address: 'Main Saddar Road, Peshawar', description: 'Commercial business hub', status: 'Active', created_at: new Date().toISOString() },
    { id: 'prop-home', name: 'Khyber Heights', city_id: 'city-pew', area_id: 'area-hayatabad', property_type: 'Flat Building', address: 'Phase 2, Hayatabad, Peshawar', description: 'Residential flats building', status: 'Active', created_at: new Date().toISOString() },
    { id: 'prop-isb-off', name: 'Centaurus Mall Offices', city_id: 'city-isb', area_id: 'area-f6', property_type: 'Office Building', address: 'Jinnah Avenue, Islamabad', description: 'Co-working spaces & brand corporate desks', status: 'Active', created_at: new Date().toISOString() }
  ],
  floors: [
    { id: 'floor-abc-g', property_id: 'prop-abc', name: 'Ground Floor', created_at: new Date().toISOString() },
    { id: 'floor-abc-1', property_id: 'prop-abc', name: 'First Floor', created_at: new Date().toISOString() },
    { id: 'floor-kh-1', property_id: 'prop-home', name: 'First Floor', created_at: new Date().toISOString() },
    { id: 'floor-isb-5', property_id: 'prop-isb-off', name: 'Fifth Floor', created_at: new Date().toISOString() }
  ],
  units: [
    { id: 'unit-shop01', property_id: 'prop-abc', floor_id: 'floor-abc-g', name: 'Shop 01', unit_type: 'Shop', rent_amount: 30000, advance_amount: 100000, status: 'Rented', notes: 'Main exit road front', created_at: new Date().toISOString() },
    { id: 'unit-shop02', property_id: 'prop-abc', floor_id: 'floor-abc-g', name: 'Shop 02', unit_type: 'Shop', rent_amount: 25000, advance_amount: 100000, status: 'Vacant', notes: 'Inner corridor shop', created_at: new Date().toISOString() },
    { id: 'unit-office-1', property_id: 'prop-abc', floor_id: 'floor-abc-1', name: 'Office 101', unit_type: 'Office', rent_amount: 45000, advance_amount: 150000, status: 'Pending', notes: 'Rent payment is partial for this month', created_at: new Date().toISOString() },
    { id: 'unit-flat101', property_id: 'prop-home', floor_id: 'floor-kh-1', name: 'Flat 101', unit_type: 'Apartment', rent_amount: 35000, advance_amount: 120000, status: 'Rented', notes: '2 BHK with balcony', created_at: new Date().toISOString() },
    { id: 'unit-isb-off501', property_id: 'prop-isb-off', floor_id: 'floor-isb-5', name: 'Desk 501', unit_type: 'Office', rent_amount: 60000, advance_amount: 200000, status: 'Vacant', notes: 'Premium view office room', created_at: new Date().toISOString() }
  ],
  tenants: [
    { id: 'tenant-arshad', name: 'Arshad Khan', father_name: 'Zaman Khan', cnic: '17301-1234567-9', phone: '0333-1234567', address: 'Hayatabad Peshawar', emergency_contact: 'Brother (0332-1112223)', notes: 'On-time payer. Runs a software agency.', created_at: new Date().toISOString() },
    { id: 'tenant-bilal', name: 'Bilal Ahmad', father_name: 'Nisar Ahmad', cnic: '35202-9876543-1', phone: '0300-9876543', address: 'Saddar Peshawar', emergency_contact: 'Father (0300-8888777)', notes: 'Clothes business merchant', created_at: new Date().toISOString() }
  ],
  rent_agreements: [
    { id: 'agree-arshad', tenant_id: 'tenant-arshad', unit_id: 'unit-shop01', monthly_rent: 30000, advance_amount: 100000, start_date: '2026-01-01', end_date: '2027-01-01', due_day: 5, status: 'Active', notes: 'Signed agreement attached', created_at: new Date().toISOString() },
    { id: 'agree-bilal', tenant_id: 'tenant-bilal', unit_id: 'unit-flat101', monthly_rent: 35000, advance_amount: 120000, start_date: '2026-03-01', end_date: '2027-03-01', due_day: 10, status: 'Active', notes: 'Residential standard agreement', created_at: new Date().toISOString() }
  ],
  rent_payments: [
    { id: 'pay-1', tenant_id: 'tenant-arshad', unit_id: 'unit-shop01', agreement_id: 'agree-arshad', rent_month: 5, rent_year: 2026, total_rent: 30000, paid_amount: 30000, pending_amount: 0, status: 'Paid', payment_date: '2026-05-04', payment_method: 'EasyPaisa', notes: 'All clear', created_at: new Date().toISOString() },
    { id: 'pay-2', tenant_id: 'tenant-arshad', unit_id: 'unit-shop01', agreement_id: 'agree-arshad', rent_month: 6, rent_year: 2026, total_rent: 30000, paid_amount: 15000, pending_amount: 15000, status: 'Partial', payment_date: '2026-06-08', payment_method: 'Cash', notes: 'Promised remaining rent by 20th June', created_at: new Date().toISOString() }
  ],
  advance_payments: [
    { id: 'adv-arshad', tenant_id: 'tenant-arshad', unit_id: 'unit-shop01', agreement_id: 'agree-arshad', amount: 100000, received_date: '2026-01-01', payment_method: 'Bank', notes: 'Received fully in Allied Bank', created_at: new Date().toISOString() },
    { id: 'adv-bilal', tenant_id: 'tenant-bilal', unit_id: 'unit-flat101', agreement_id: 'agree-bilal', amount: 120000, received_date: '2026-03-01', payment_method: 'JazzCash', notes: 'Initial advanced security deposit', created_at: new Date().toISOString() }
  ],
  advance_adjustments: [] as AdvanceAdjustment[],
  activity_logs: [
    { id: 'log-1', action: 'System Setup', details: 'Rental Management system bootstrapped with Peshawar, Lahore and Islamabad cities.', created_at: new Date().toISOString() }
  ]
};

// Cache JSON in-memory to prevent slow disk reads on every request
let dbCache: DatastoreSchema | null = null;

// Ensure database path exists
function ensureDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  }
}

// Read database
export function readDb(): DatastoreSchema {
  if (dbCache) {
    return dbCache;
  }
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    dbCache = JSON.parse(raw);
    return dbCache!;
  } catch (err) {
    console.error('Error reading fallback JSON database, resetting. Error:', err);
    return initialDb;
  }
}

// Write database
export function writeDb(data: DatastoreSchema) {
  ensureDb();
  dbCache = data;
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Helper to generate IDs
export function makeId(prefix = 'id'): string {
  return `${prefix}-${Math.floor(Math.random() * 10000000)}`;
}

// DB Log Helper
export function logActivity(action: string, details: string) {
  if (isSupabaseEnabled) {
    // Suppress await inside non-async scope for logging
    supabase!.from('activity_logs').insert([{ action, details }]).then();
  } else {
    const db = readDb();
    db.activity_logs.unshift({
      id: makeId('log'),
      action,
      details,
      created_at: new Date().toISOString()
    });
    // Truncate logs if they exceed 500
    if (db.activity_logs.length > 500) {
      db.activity_logs = db.activity_logs.slice(0, 500);
    }
    writeDb(db);
  }
}
