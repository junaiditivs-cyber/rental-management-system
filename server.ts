// @ts-nocheck
import 'dotenv/config';
import express from 'express';
import path from 'path';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = Number(process.env.PORT || 3000);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_KEY ||
  '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

type AnyRow = Record<string, any>;

type AppDb = {
  admin_users: AnyRow[];
  cities: AnyRow[];
  areas: AnyRow[];
  properties: AnyRow[];
  floors: AnyRow[];
  units: AnyRow[];
  tenants: AnyRow[];
  rent_agreements: AnyRow[];
  rent_payments: AnyRow[];
  advance_payments: AnyRow[];
  advance_adjustments: AnyRow[];
  activity_logs: AnyRow[];
};

const nowIso = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().split('T')[0];
const toNumber = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function asyncHandler(fn: any) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function selectAll(table: string) {
  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function loadDb(): Promise<AppDb> {
  const [
    admin_users,
    cities,
    areas,
    properties,
    floors,
    units,
    tenants,
    rent_agreements,
    rent_payments,
    advance_payments,
    advance_adjustments,
    activity_logs
  ] = await Promise.all([
    selectAll('admin_users'),
    selectAll('cities'),
    selectAll('areas'),
    selectAll('properties'),
    selectAll('floors'),
    selectAll('units'),
    selectAll('tenants'),
    selectAll('rent_agreements'),
    selectAll('rent_payments'),
    selectAll('advance_payments'),
    selectAll('advance_adjustments'),
    selectAll('activity_logs')
  ]);

  return {
    admin_users,
    cities,
    areas,
    properties,
    floors,
    units,
    tenants,
    rent_agreements,
    rent_payments,
    advance_payments,
    advance_adjustments,
    activity_logs
  };
}

async function insertOne(table: string, payload: AnyRow) {
  const { data, error } = await supabase.from(table).insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

async function updateById(table: string, id: string, payload: AnyRow) {
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

async function deleteById(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

async function logActivity(action: string, details: string) {
  const { error } = await supabase.from('activity_logs').insert({ action, details });
  if (error) console.error('Activity log error:', error.message);
}

async function ensureDefaultAdmin() {
  const { data, error } = await supabase.from('admin_users').select('id').limit(1);
  if (error) {
    console.error('Admin check error:', error.message);
    return;
  }
  if (!data || data.length === 0) {
    const { error: insertError } = await supabase.from('admin_users').insert({
      username: 'admin',
      password_hash: 'admin123',
      full_name: 'Super Admin'
    });
    if (insertError) console.error('Default admin insert error:', insertError.message);
  }
}

// Setup Middleware
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'pk_rental_secret_9922',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Set EJS Engine
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

// Auth Guard Middleware
function requireAuth(req: any, res: any, next: any) {
  const admin = (req.session as any)?.admin;
  if (!admin) return res.redirect('/login');
  res.locals.admin = admin;
  next();
}

app.get('/login', (req, res) => {
  if ((req.session as any)?.admin) return res.redirect('/');
  res.render('auth/login', { error_msg: null });
});

app.post('/login', asyncHandler(async (req: any, res: any) => {
  const { username, password } = req.body;

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) throw error;

  // Current project stores admin123 as plain text in password_hash.
  // If you later switch to bcrypt, update this comparison.
  if (admin && admin.password_hash === password) {
    (req.session as any).admin = {
      id: admin.id,
      username: admin.username,
      role: 'Super Admin',
      full_name: admin.full_name || 'Super Admin'
    };
    await logActivity('Admin Login', `User ${admin.username} authorized successfully.`);
    req.session.save((err: any) => {
      if (err) console.error('Session save error:', err);
      res.redirect('/');
    });
  } else {
    res.render('auth/login', { error_msg: 'Incorrect username or password. Try admin / admin123' });
  }
}));

app.get('/logout', asyncHandler(async (req: any, res: any) => {
  const username = (req.session as any)?.admin?.username;
  if (username) await logActivity('Admin Logout', `User ${username} logged out.`);
  req.session.destroy(() => res.redirect('/login'));
}));

// -----------------------------------------
// DASHBOARD VIEW ROUTE
// -----------------------------------------
app.get('/', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();

  const d = new Date();
  const currentMonth = d.getMonth() + 1;
  const currentYear = d.getFullYear();

  const totalUnitsCount = db.units.length;
  const vacantUnitsCount = db.units.filter(u => String(u.status).toLowerCase() === 'vacant').length;
  const rentedUnitsCount = db.units.filter(u => String(u.status).toLowerCase() === 'rented').length;
  const expectedMonthlyRent = db.units.reduce((sum, u) => sum + toNumber(u.rent_amount), 0);

  const currentMonthPayments = db.rent_payments.filter(p => Number(p.rent_month) === currentMonth && Number(p.rent_year) === currentYear);
  const receivedRent = currentMonthPayments.reduce((sum, p) => sum + toNumber(p.paid_amount), 0);
  const pendingRentArrears = currentMonthPayments.reduce((sum, p) => sum + toNumber(p.pending_amount), 0);
  const vacancyRate = totalUnitsCount > 0 ? (vacantUnitsCount / totalUnitsCount) * 100 : 0;

  const overallStats = {
    expected: expectedMonthlyRent,
    received: receivedRent,
    pending: pendingRentArrears,
    vacancyRate,
    vacantUnits: vacantUnitsCount,
    rentedUnits: rentedUnitsCount,
    totalUnits: totalUnitsCount
  };

  const citiesData = db.cities.map(city => {
    const cityProperties = db.properties.filter(p => p.city_id === city.id);
    const propIds = cityProperties.map(p => p.id);
    const cityUnits = db.units.filter(u => propIds.includes(u.property_id));
    const unitIds = cityUnits.map(u => u.id);

    const countUnits = cityUnits.length;
    const countRented = cityUnits.filter(u => String(u.status).toLowerCase() === 'rented').length;
    const countVacant = cityUnits.filter(u => String(u.status).toLowerCase() === 'vacant').length;
    const expectedRent = cityUnits.reduce((sum, u) => sum + toNumber(u.rent_amount), 0);
    const receivedFromCity = db.rent_payments
      .filter(p => unitIds.includes(p.unit_id) && Number(p.rent_month) === currentMonth && Number(p.rent_year) === currentYear)
      .reduce((sum, p) => sum + toNumber(p.paid_amount), 0);

    return {
      id: city.id,
      name: city.name,
      province: city.province,
      propertyCount: cityProperties.length,
      unitCount: countUnits,
      rentedCount: countRented,
      vacantCount: countVacant,
      expectedRent,
      receivedRent: receivedFromCity
    };
  });

  res.render('dashboard', {
    overallStats,
    citiesData,
    activityLogs: db.activity_logs.slice().reverse(),
    success_msg: req.query.success_msg ? String(req.query.success_msg) : null
  });
}));

// -----------------------------------------
// CITY CRUD ROUTES
// -----------------------------------------
app.get('/cities', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  res.render('cities/list', { cities: db.cities });
}));

app.get('/cities/add', requireAuth, (req, res) => {
  res.render('cities/add');
});

app.post('/cities/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { name, province } = req.body;
  await insertOne('cities', { name, province });
  await logActivity('Create City', `Registered municipal region: ${name} (${province}).`);
  res.redirect('/cities');
}));

app.get('/cities/:id', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const city = db.cities.find(c => c.id === req.params.id);
  if (!city) return res.status(404).send('City not registered');

  const areas = db.areas.filter(a => a.city_id === city.id);
  const properties = db.properties.filter(p => p.city_id === city.id).map(p => {
    const area = db.areas.find(a => a.id === p.area_id);
    return { ...p, area_name: area ? area.name : 'Unknown' };
  });

  const propertyIds = properties.map(p => p.id);
  const cityUnits = db.units.filter(u => propertyIds.includes(u.property_id));
  const unitIds = cityUnits.map(u => u.id);
  const rentedCount = cityUnits.filter(u => String(u.status).toLowerCase() === 'rented').length;
  const vacantCount = cityUnits.filter(u => String(u.status).toLowerCase() === 'vacant').length;
  const pendingRent = db.rent_payments
    .filter(p => unitIds.includes(p.unit_id) && Number(p.pending_amount) > 0)
    .reduce((sum, py) => sum + toNumber(py.pending_amount), 0);

  res.render('cities/detail', { city, areas, properties, stats: { rentedCount, vacantCount, pendingRent } });
}));

app.get('/cities/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { data: city, error } = await supabase.from('cities').select('*').eq('id', req.params.id).maybeSingle();
  if (error) throw error;
  if (!city) return res.status(404).send('City not registered');
  res.render('cities/edit', { city });
}));

app.post('/cities/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { name, province } = req.body;
  await updateById('cities', req.params.id, { name, province });
  await logActivity('Update City', `Modified details of city ${name}.`);
  res.redirect('/cities');
}));

app.post('/cities/:id/delete', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { data: linkedProperties, error } = await supabase.from('properties').select('id').eq('city_id', req.params.id).limit(1);
  if (error) throw error;
  if (linkedProperties && linkedProperties.length > 0) {
    return res.status(400).send('Locked: Cannot remove city with active linked property registries.');
  }

  await supabase.from('areas').delete().eq('city_id', req.params.id);
  await deleteById('cities', req.params.id);
  await logActivity('Delete City', `Deleted municipal ID ${req.params.id}.`);
  res.redirect('/cities');
}));

// -----------------------------------------
// AREA CRUD ROUTES
// -----------------------------------------
app.get('/areas', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const areasWithCounts = db.areas.map(area => {
    const cityObj = db.cities.find(c => c.id === area.city_id);
    const propertyCount = db.properties.filter(p => p.area_id === area.id).length;
    return { ...area, city_name: cityObj ? cityObj.name : 'Unknown', propertyCount };
  });
  res.render('areas/list', { areas: areasWithCounts });
}));

app.get('/areas/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const p_city_id = req.query.city_id ? String(req.query.city_id) : undefined;
  res.render('areas/add', { cities: db.cities, p_city_id });
}));

app.post('/areas/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { name, city_id } = req.body;
  await insertOne('areas', { city_id, name });
  await logActivity('Create Area', `Mapped area ${name} under city ID ${city_id}.`);
  res.redirect(`/cities/${city_id}`);
}));

app.get('/areas/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const area = db.areas.find(a => a.id === req.params.id);
  if (!area) return res.status(404).send('Area not configured');
  res.render('areas/edit', { area, cities: db.cities });
}));

app.post('/areas/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { name, city_id } = req.body;
  await updateById('areas', req.params.id, { name, city_id });
  await logActivity('Update Area', `Updated sector ${name}.`);
  res.redirect('/areas');
}));

app.post('/areas/:id/delete', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { data: linkedProperties, error } = await supabase.from('properties').select('id').eq('area_id', req.params.id).limit(1);
  if (error) throw error;
  if (linkedProperties && linkedProperties.length > 0) {
    return res.status(400).send('Locked: Properties occupy this sector.');
  }
  await deleteById('areas', req.params.id);
  await logActivity('Delete Area', `Removed empty area ID ${req.params.id}.`);
  res.redirect('/areas');
}));

// -----------------------------------------
// PROPERTY CRUD ROUTES
// -----------------------------------------
app.get('/properties', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const filteredProperties = db.properties.map(p => {
    const city = db.cities.find(c => c.id === p.city_id);
    const area = db.areas.find(a => a.id === p.area_id);
    const floorCount = db.floors.filter(f => f.property_id === p.id).length;
    const propUnits = db.units.filter(u => u.property_id === p.id);
    const unitCount = propUnits.length;
    const rentedCount = propUnits.filter(u => String(u.status).toLowerCase() === 'rented').length;
    return {
      ...p,
      city_name: city ? city.name : 'Unknown',
      area_name: area ? area.name : 'Unknown',
      floorCount,
      unitCount,
      rentedCount
    };
  });
  res.render('properties/list', { properties: filteredProperties, cities: db.cities });
}));

app.get('/properties/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const p_city_id = req.query.city_id ? String(req.query.city_id) : undefined;
  res.render('properties/add', { cities: db.cities, areas: db.areas, p_city_id });
}));

app.post('/properties/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { name, city_id, area_id, property_type, address, description, status } = req.body;
  await insertOne('properties', {
    name,
    city_id,
    area_id,
    property_type,
    address,
    description: description || '',
    status: status || 'Active'
  });
  await logActivity('Register Property', `Added property node ${name} (${property_type}) in city ${city_id}.`);
  res.redirect('/properties');
}));

app.get('/properties/:id', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const propertyObj = db.properties.find(p => p.id === req.params.id);
  if (!propertyObj) return res.status(404).send('Property not tracked');

  const city = db.cities.find(c => c.id === propertyObj.city_id);
  const area = db.areas.find(a => a.id === propertyObj.area_id);
  const property = {
    ...propertyObj,
    city_name: city ? city.name : 'Unknown',
    area_name: area ? area.name : 'Unknown'
  };

  const floors = db.floors.filter(f => f.property_id === property.id).map(floor => {
    const floorUnits = db.units.filter(u => u.floor_id === floor.id);
    return { ...floor, units: floorUnits };
  });

  const units = db.units.filter(u => u.property_id === property.id);
  const expectSum = units.reduce((sum, u) => sum + toNumber(u.rent_amount), 0);

  const rentedSum = units.filter(u => {
    const hasActiveAgreement = db.rent_agreements.some(
      ag => ag.unit_id === u.id && String(ag.status).toLowerCase() === 'active'
    );

    return hasActiveAgreement || ['rented', 'pending'].includes(String(u.status || '').toLowerCase());
  }).length;

  const vacantSum = units.filter(u => {
    const hasActiveAgreement = db.rent_agreements.some(
      ag => ag.unit_id === u.id && String(ag.status).toLowerCase() === 'active'
    );

    return !hasActiveAgreement && String(u.status || '').toLowerCase() === 'vacant';
  }).length;

  res.render('properties/detail', {
    property,
    floors,
    rentSummary: { expected: expectSum, rented: rentedSum, vacant: vacantSum, total: units.length }
  });
}));


app.get('/properties/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const property = db.properties.find(p => p.id === req.params.id);
  if (!property) return res.status(404).send('Property not tracked');
  res.render('properties/edit', { property, cities: db.cities, areas: db.areas });
}));

app.post('/properties/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { name, city_id, area_id, property_type, address, description, status } = req.body;
  await updateById('properties', req.params.id, {
    name,
    city_id,
    area_id,
    property_type,
    address,
    description: description || '',
    status: status || 'Active'
  });
  await logActivity('Update Property', `Modified profiles for ${name}.`);
  res.redirect(`/properties/${req.params.id}`);
}));

app.post('/properties/:id/delete', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { data: linkedUnits, error } = await supabase.from('units').select('id').eq('property_id', req.params.id).limit(1);
  if (error) throw error;
  if (linkedUnits && linkedUnits.length > 0) {
    return res.status(400).send('Locked: Units reside under this property portfolio.');
  }
  await supabase.from('floors').delete().eq('property_id', req.params.id);
  await deleteById('properties', req.params.id);
  await logActivity('Delete Property', `Decompiled property node ID ${req.params.id}.`);
  res.redirect('/properties');
}));

// -----------------------------------------
// FLOOR ROUTES
// -----------------------------------------
app.post('/floors/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { property_id, name } = req.body;
  await insertOne('floors', { property_id, name });
  await logActivity('Create Floor Level', `Installed floor level ${name} on property ${property_id}.`);
  res.redirect(`/properties/${property_id}`);
}));

app.post('/floors/:id/delete', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { property_id } = req.body;
  const { data: linkedUnits, error } = await supabase.from('units').select('id').eq('floor_id', req.params.id).limit(1);
  if (error) throw error;
  if (linkedUnits && linkedUnits.length > 0) {
    return res.status(400).send('Locked: Rental units reside on this floor level.');
  }
  await deleteById('floors', req.params.id);
  await logActivity('Delete Floor', `Purged floor ID ${req.params.id}.`);
  res.redirect(`/properties/${property_id}`);
}));

// -----------------------------------------
// UNIT BLOCK ROUTES
// -----------------------------------------
app.get('/units', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const mappedUnits = db.units.map(unit => {
    const prop = db.properties.find(p => p.id === unit.property_id);
    const floor = db.floors.find(f => f.id === unit.floor_id);
    return {
      ...unit,
      property_name: prop ? prop.name : 'Unknown Property',
      floor_name: floor ? floor.name : 'Unknown Level'
    };
  });
  res.render('units/list', { units: mappedUnits });
}));

app.get('/units/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const p_prop_id = req.query.property_id ? String(req.query.property_id) : undefined;
  const p_floor_id = req.query.floor_id ? String(req.query.floor_id) : undefined;
  res.render('units/add', { properties: db.properties, floors: db.floors, p_prop_id, p_floor_id });
}));

app.post('/units/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { property_id, floor_id, name, unit_type, rent_amount, advance_amount, notes } = req.body;
  await insertOne('units', {
    property_id,
    floor_id,
    name,
    unit_type,
    rent_amount: toNumber(rent_amount),
    advance_amount: toNumber(advance_amount),
    status: 'Vacant',
    notes: notes || ''
  });
  await logActivity('Deploy Unit', `Deployed unit ${name} (${unit_type}) to property ${property_id}.`);
  res.redirect(`/properties/${property_id}`);
}));

app.get('/units/:id', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const unitObj = db.units.find(u => u.id === req.params.id);
  if (!unitObj) return res.status(404).send('Unit not deployed');

  const prop = db.properties.find(p => p.id === unitObj.property_id);
  const floor = db.floors.find(f => f.id === unitObj.floor_id);
  const unit = {
    ...unitObj,
    property_name: prop ? prop.name : 'Unknown Property',
    floor_name: floor ? floor.name : 'Unknown Level'
  };

  const activeAgreementObj = db.rent_agreements.find(ag => ag.unit_id === unit.id && ag.status === 'Active');
  let activeAgreement = null;
  if (activeAgreementObj) {
    const tenant = db.tenants.find(t => t.id === activeAgreementObj.tenant_id);
    activeAgreement = {
      ...activeAgreementObj,
      tenant_name: tenant ? tenant.name : 'Unknown Tenant',
      tenant_father_name: tenant ? tenant.father_name : '',
      tenant_cnic: tenant ? tenant.cnic : '',
      tenant_phone: tenant ? tenant.phone : '',
      tenant_emergency: tenant ? tenant.emergency_contact : ''
    };
  }

  const payments = db.rent_payments.filter(p => p.unit_id === unit.id).map(p => ({
    ...p,
    payment_date: new Date(p.payment_date).toLocaleDateString()
  }));

  res.render('units/detail', { unit, activeAgreement, payments });
}));

app.get('/units/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const unit = db.units.find(u => u.id === req.params.id);
  if (!unit) return res.status(404).send('Unit not tracking');
  res.render('units/edit', { unit, properties: db.properties, floors: db.floors });
}));

app.post('/units/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { property_id, floor_id, name, unit_type, rent_amount, advance_amount, status, notes } = req.body;
  await updateById('units', req.params.id, {
    property_id,
    floor_id,
    name,
    unit_type,
    rent_amount: toNumber(rent_amount),
    advance_amount: toNumber(advance_amount),
    status,
    notes: notes || ''
  });
  await logActivity('Update Unit Specs', `Modified details of unit card ${name}.`);
  res.redirect(`/units/${req.params.id}`);
}));

app.post('/units/:id/delete', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const hasActiveLease = db.rent_agreements.some(ag => ag.unit_id === req.params.id && ag.status === 'Active');
  if (hasActiveLease) return res.status(400).send('Locked: Tenant occupies this unit container.');

  const unitObj = db.units.find(u => u.id === req.params.id);
  const propId = unitObj ? unitObj.property_id : '';
  await deleteById('units', req.params.id);
  await logActivity('Purge Unit', `Removed rental unit ${req.params.id}.`);
  res.redirect(propId ? `/properties/${propId}` : '/properties');
}));

// -----------------------------------------
// TENANT PROFILE ROUTES
// -----------------------------------------
app.get('/tenants', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const mapped = db.tenants.map(t => {
    const isLeaseActive = db.rent_agreements.some(ag => ag.tenant_id === t.id && ag.status === 'Active');
    return { ...t, isLeaseActive };
  });
  res.render('tenants/list', { tenants: mapped });
}));

app.get('/tenants/add', requireAuth, (req, res) => {
  res.render('tenants/add');
});

app.post('/tenants/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { name, father_name, cnic, phone, address, emergency_contact, cnic_front_url, cnic_back_url, notes } = req.body;
  await insertOne('tenants', {
    name,
    father_name,
    cnic: cnic || null,
    phone,
    address: address || '',
    emergency_contact: emergency_contact || '',
    cnic_front_url: cnic_front_url || null,
    cnic_back_url: cnic_back_url || null,
    notes: notes || ''
  });
  await logActivity('Register Tenant', `Tenant profile created: ${name} (CNIC: ${cnic || 'N/A'}).`);
  res.redirect('/tenants');
}));

app.get('/tenants/:id', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const tenant = db.tenants.find(t => t.id === req.params.id);
  if (!tenant) return res.status(404).send('Tenant profile not found');

  const agreements = db.rent_agreements.filter(ag => ag.tenant_id === tenant.id).map(ag => {
    const unit = db.units.find(u => u.id === ag.unit_id);
    const prop = unit ? db.properties.find(p => p.id === unit.property_id) : null;
    return {
      ...ag,
      unit_name: unit ? unit.name : 'Unknown Unit',
      property_name: prop ? prop.name : 'Unknown Property'
    };
  });

  res.render('tenants/detail', { tenant, agreements });
}));

app.get('/tenants/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const tenant = db.tenants.find(t => t.id === req.params.id);
  if (!tenant) return res.status(404).send('Tenant profile untracked');
  res.render('tenants/edit', { tenant });
}));

app.post('/tenants/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { name, father_name, cnic, phone, address, emergency_contact, cnic_front_url, cnic_back_url, notes } = req.body;
  await updateById('tenants', req.params.id, {
    name,
    father_name,
    cnic: cnic || null,
    phone,
    address: address || '',
    emergency_contact: emergency_contact || '',
    cnic_front_url: cnic_front_url || null,
    cnic_back_url: cnic_back_url || null,
    notes: notes || ''
  });
  await logActivity('Update Tenant', `Saved changes for tenant ${name}.`);
  res.redirect(`/tenants/${req.params.id}`);
}));

app.post('/tenants/:id/delete', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const t = db.tenants.find(ten => ten.id === req.params.id);
  if (!t) return res.redirect('/tenants?error_msg=' + encodeURIComponent('Tenant not found.'));

  const activeAgreements = db.rent_agreements.filter(ag => ag.tenant_id === req.params.id);
  for (const ag of activeAgreements) {
    await updateById('rent_agreements', ag.id, { status: 'Ended' });
    await updateById('units', ag.unit_id, { status: 'Vacant' });
  }

  await deleteById('tenants', req.params.id);
  await logActivity('Delete Tenant', `Tenant profile trace ${req.params.id} (${t.name}) and corresponding active leases deleted fully.`);
  res.redirect('/tenants?success_msg=' + encodeURIComponent('Tenant account profile deleted. Active leases archived.'));
}));

// -----------------------------------------
// AGREEMENT OPERATIONS
// -----------------------------------------
app.get('/agreements', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const list = db.rent_agreements.map(ag => {
    const tenant = db.tenants.find(t => t.id === ag.tenant_id);
    const unit = db.units.find(u => u.id === ag.unit_id);
    const prop = unit ? db.properties.find(p => p.id === unit.property_id) : null;
    return {
      ...ag,
      tenant_name: tenant ? tenant.name : 'Unknown',
      unit_name: unit ? unit.name : 'Unknown',
      property_name: prop ? prop.name : 'Unknown'
    };
  });
  res.render('agreements/list', { agreements: list });
}));

app.get('/agreements/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const p_unit_id = req.query.unit_id ? String(req.query.unit_id) : undefined;
  const vacantUnits = db.units.filter(u => String(u.status).toLowerCase() === 'vacant').map(u => {
    const prop = db.properties.find(p => p.id === u.property_id);
    const floor = db.floors.find(f => f.id === u.floor_id);
    return {
      ...u,
      property_name: prop ? prop.name : 'Unknown',
      floor_name: floor ? floor.name : 'Unknown Level'
    };
  });
  res.render('agreements/add', { tenants: db.tenants, units: vacantUnits, p_unit_id });
}));

app.post('/agreements/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { tenant_id, unit_id, monthly_rent, advance_amount, start_date, end_date, due_day, agreement_doc_url, notes } = req.body;

  const newAgreement = await insertOne('rent_agreements', {
    tenant_id,
    unit_id,
    monthly_rent: toNumber(monthly_rent),
    advance_amount: toNumber(advance_amount),
    start_date,
    end_date,
    due_day: toNumber(due_day, 5),
    status: 'Active',
    agreement_doc_url: agreement_doc_url || null,
    notes: notes || ''
  });

  await updateById('units', unit_id, { status: 'Rented' });

  if (toNumber(advance_amount) > 0) {
    await insertOne('advance_payments', {
      tenant_id,
      unit_id,
      agreement_id: newAgreement.id,
      amount: toNumber(advance_amount),
      received_date: start_date || todayDate(),
      payment_method: 'Bank',
      notes: 'Initial Security Advance setup'
    });
  }

  await logActivity('Lease Created', `Activated lease inside unit ${unit_id}.`);
  res.redirect(`/units/${unit_id}`);
}));

app.get('/agreements/:id', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const agreement = db.rent_agreements.find(a => a.id === req.params.id);
  if (!agreement) return res.redirect('/agreements?error_msg=' + encodeURIComponent('Rent Agreement trace not found.'));
  const tenant = db.tenants.find(t => t.id === agreement.tenant_id);
  const unit = db.units.find(u => u.id === agreement.unit_id);
  res.render('agreements/detail', { agreement, tenant, unit });
}));

app.get('/agreements/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const agreement = db.rent_agreements.find(a => a.id === req.params.id);
  if (!agreement) return res.redirect('/agreements?error_msg=' + encodeURIComponent('Rent lease agreement not found.'));
  const tenant = db.tenants.find(t => t.id === agreement.tenant_id);
  const unit = db.units.find(u => u.id === agreement.unit_id);
  res.render('agreements/edit', { agreement, tenant, unit, error_msg: req.query.error_msg || null });
}));

app.post('/agreements/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const agreement = db.rent_agreements.find(a => a.id === req.params.id);
  if (!agreement) return res.redirect('/agreements?error_msg=' + encodeURIComponent('Lease agreement not found.'));

  const { monthly_rent, advance_amount, start_date, end_date, due_day, status, agreement_doc_url, notes } = req.body;
  await updateById('rent_agreements', req.params.id, {
    monthly_rent: toNumber(monthly_rent),
    advance_amount: toNumber(advance_amount),
    start_date: start_date || agreement.start_date,
    end_date: end_date || agreement.end_date,
    due_day: toNumber(due_day, agreement.due_day || 5),
    status: status || agreement.status,
    agreement_doc_url: agreement_doc_url || null,
    notes: notes || ''
  });

  await updateById('units', agreement.unit_id, {
    rent_amount: toNumber(monthly_rent),
    status: status === 'Ended' ? 'Vacant' : 'Rented'
  });

  await logActivity('Edit Agreement', `Rent agreement parameters modified for ID: ${req.params.id}`);
  res.redirect('/agreements?success_msg=' + encodeURIComponent('Rent agreement specifications synchronized successfully.'));
}));

app.get('/agreements/:id/end', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const ag = db.rent_agreements.find(a => a.id === req.params.id);
  if (!ag) return res.status(404).send('Agreement not tracked');
  await updateById('rent_agreements', ag.id, { status: 'Ended' });
  await updateById('units', ag.unit_id, { status: 'Vacant' });
  await logActivity('Terminate Lease', `Discharged tenant key connection inside unit ${ag.unit_id}.`);
  res.redirect(`/units/${ag.unit_id}`);
}));

app.post('/agreements/:id/delete', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const ag = db.rent_agreements.find(a => a.id === req.params.id);
  if (!ag) return res.redirect('/agreements?error_msg=' + encodeURIComponent('Specified lease contract not found.'));

  await updateById('units', ag.unit_id, { status: 'Vacant' });
  await deleteById('rent_agreements', req.params.id);
  await logActivity('Delete Agreement', `Rent Agreement contract ${req.params.id} manually deleted.`);
  res.redirect('/agreements?success_msg=' + encodeURIComponent('Rent contract lease deleted successfully.'));
}));

// -----------------------------------------
// RENT LEDGER COLLECTION ROUTES
// -----------------------------------------
app.get('/rent', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const { month, status } = req.query;

  let list = db.rent_payments.map(p => {
    const tenant = db.tenants.find(t => t.id === p.tenant_id);
    const unit = db.units.find(u => u.id === p.unit_id);
    const prop = unit ? db.properties.find(pr => pr.id === unit.property_id) : null;
    return {
      ...p,
      tenant_name: tenant ? tenant.name : 'Unknown',
      unit_name: unit ? unit.name : 'Unknown',
      property_name: prop ? prop.name : 'Unknown'
    };
  });

  if (month) list = list.filter(p => Number(p.rent_month) === Number(month));
  if (status) list = list.filter(p => String(p.status).toLowerCase() === String(status).toLowerCase());

  const stats = {
    totalCollected: list.reduce((sum, p) => sum + toNumber(p.paid_amount), 0),
    totalPending: list.reduce((sum, p) => sum + toNumber(p.pending_amount), 0)
  };

  res.render('rent/list', { payments: list, stats, selectedMonth: month || '', selectedStatus: status || '' });
}));

app.get('/rent/collect', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const p_unit_id = req.query.unit_id ? String(req.query.unit_id) : undefined;
  const activeAgreements = db.rent_agreements.filter(ag => ag.status === 'Active').map(ag => {
    const tenant = db.tenants.find(t => t.id === ag.tenant_id);
    const unit = db.units.find(u => u.id === ag.unit_id);
    return {
      ...ag,
      tenant_name: tenant ? tenant.name : 'Unknown',
      unit_name: unit ? unit.name : 'Unknown'
    };
  });
  res.render('rent/collect', { agreements: activeAgreements, p_unit_id });
}));

app.post('/rent/collect', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { agreement_id, rent_month, rent_year, total_rent, paid_amount, pending_amount, payment_method, payment_date, payment_proof_url, notes } = req.body;
  const db = await loadDb();
  const ag = db.rent_agreements.find(a => a.id === agreement_id);
  if (!ag) return res.status(404).send('Agreement not tracked');

  const paid = toNumber(paid_amount);
  const pending = toNumber(pending_amount);
  const required = toNumber(total_rent);

  let recStatus = 'Paid';
  if (pending > 0 && paid > 0) recStatus = 'Partial';
  else if (paid === 0) recStatus = 'Unpaid';

  await insertOne('rent_payments', {
    tenant_id: ag.tenant_id,
    unit_id: ag.unit_id,
    agreement_id,
    rent_month: toNumber(rent_month),
    rent_year: toNumber(rent_year),
    total_rent: required,
    paid_amount: paid,
    pending_amount: pending,
    status: recStatus,
    payment_date,
    payment_method,
    payment_proof_url: payment_proof_url || null,
    notes: notes || ''
  });

  await updateById('units', ag.unit_id, { status: recStatus === 'Paid' ? 'Rented' : 'Pending' });
  await logActivity('Collect Rent', `Collected monthly rent ₨ ${paid.toLocaleString()} for unit ${ag.unit_id}.`);
  res.redirect(`/units/${ag.unit_id}`);
}));

app.get('/rent/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const payment = db.rent_payments.find(p => p.id === req.params.id);
  if (!payment) return res.redirect('/rent?error_msg=' + encodeURIComponent('Monthly installment payment record not found.'));
  const tenant = db.tenants.find(t => t.id === payment.tenant_id);
  const unit = db.units.find(u => u.id === payment.unit_id);
  res.render('rent/edit', { payment, tenant, unit, error_msg: req.query.error_msg || null });
}));

app.post('/rent/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const payment = db.rent_payments.find(p => p.id === req.params.id);
  if (!payment) return res.redirect('/rent?error_msg=' + encodeURIComponent('Rent installment payment log trace not found.'));

  const { rent_month, rent_year, total_rent, paid_amount, status, payment_method, payment_date, notes } = req.body;
  const required = toNumber(total_rent);
  const collected = toNumber(paid_amount);
  const pending = Math.max(0, required - collected);

  await updateById('rent_payments', req.params.id, {
    rent_month: toNumber(rent_month, payment.rent_month),
    rent_year: toNumber(rent_year, payment.rent_year),
    total_rent: required,
    paid_amount: collected,
    pending_amount: pending,
    status: status || payment.status,
    payment_method: payment_method || payment.payment_method,
    payment_date: payment_date || payment.payment_date,
    notes: notes || ''
  });

  await updateById('units', payment.unit_id, { status: String(status || payment.status).toLowerCase() === 'paid' ? 'Rented' : 'Pending' });
  await logActivity('Edit Rent Payment', `Monthly installment and arrears re-balanced for track ID: ${req.params.id}`);
  res.redirect('/rent?success_msg=' + encodeURIComponent('Monthly installment collection ledger successfully reconciled.'));
}));

app.post('/rent/:id/delete', requireAuth, asyncHandler(async (req: any, res: any) => {
  await deleteById('rent_payments', req.params.id);
  await logActivity('Delete Rent Payment', `Rent payment entry trace node ${req.params.id} has been manually deleted.`);
  res.redirect('/rent?success_msg=' + encodeURIComponent('Ledger payment trace deleted and re-balanced.'));
}));

// -----------------------------------------
// ANALYTICS & REPORTS VIEW
// -----------------------------------------
app.get('/reports', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const citySummaries = db.cities.map(city => {
    const properties = db.properties.filter(p => p.city_id === city.id);
    const propIds = properties.map(p => p.id);
    const units = db.units.filter(u => propIds.includes(u.property_id));
    const unitIds = units.map(u => u.id);

    const rentedUnitsCount = units.filter(u => String(u.status).toLowerCase() === 'rented').length;
    const vacantUnitsCount = units.filter(u => String(u.status).toLowerCase() === 'vacant').length;

    const collectionsSum = db.rent_payments
      .filter(p => unitIds.includes(p.unit_id))
      .reduce((sum, p) => sum + toNumber(p.paid_amount), 0);

    const arrearsSum = db.rent_payments
      .filter(p => unitIds.includes(p.unit_id))
      .reduce((sum, p) => sum + toNumber(p.pending_amount), 0);

    return {
      name: city.name,
      propertyCount: properties.length,
      totalUnits: units.length,
      rentedUnits: rentedUnitsCount,
      vacantUnits: vacantUnitsCount,
      totalCollected: collectionsSum,
      pendingRentArrears: arrearsSum
    };
  });

  const criticalArrears = db.rent_payments.filter(p => toNumber(p.pending_amount) > 0).map(p => {
    const tenant = db.tenants.find(t => t.id === p.tenant_id);
    const unit = db.units.find(u => u.id === p.unit_id);
    const prop = unit ? db.properties.find(pr => pr.id === unit.property_id) : null;
    return {
      ...p,
      tenant_name: tenant ? tenant.name : 'Unknown Tenant',
      tenant_phone: tenant ? tenant.phone : 'N/A',
      unit_name: unit ? unit.name : 'Unknown',
      property_name: prop ? prop.name : 'Unknown'
    };
  });

  res.render('reports', { citySummaries, criticalArrears });
}));

app.get('/dashboard', requireAuth, (req, res) => res.redirect('/'));

app.get('/logs', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  res.render('logs', { logs: (db.activity_logs || []).slice().reverse() });
}));

// -----------------------------------------
// ADVANCE PAYMENTS TRACKER
// -----------------------------------------
app.get('/advance', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const advances = db.advance_payments.map(adv => {
    const tenant = db.tenants.find(t => t.id === adv.tenant_id);
    const unit = db.units.find(u => u.id === adv.unit_id);
    return {
      ...adv,
      tenant_name: tenant ? tenant.name : 'Unknown Tenant',
      unit_name: unit ? unit.name : 'Unknown Unit'
    };
  });
  res.render('advance/list', {
    advances,
    success_msg: req.query.success_msg || null,
    error_msg: req.query.error_msg || null
  });
}));

app.get('/advance/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const activeAgreements = db.rent_agreements.filter(ag => ag.status === 'Active').map(ag => {
    const tenant = db.tenants.find(t => t.id === ag.tenant_id);
    const unit = db.units.find(u => u.id === ag.unit_id);
    return {
      ...ag,
      tenant_name: tenant ? tenant.name : 'Unknown',
      unit_name: unit ? unit.name : 'Unknown'
    };
  });
  res.render('advance/add', { agreements: activeAgreements, error_msg: req.query.error_msg || null });
}));

app.post('/advance/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const { agreement_id, amount, received_date, payment_method, notes } = req.body;
  if (!agreement_id || !amount) {
    return res.redirect('/advance/add?error_msg=' + encodeURIComponent('Agreement and security amount are mandatory fields.'));
  }
  const ag = db.rent_agreements.find(a => a.id === agreement_id);
  if (!ag) return res.redirect('/advance/add?error_msg=' + encodeURIComponent('Specified lease contract not found in records.'));

  await insertOne('advance_payments', {
    tenant_id: ag.tenant_id,
    unit_id: ag.unit_id,
    agreement_id: ag.id,
    amount: toNumber(amount),
    received_date: received_date || todayDate(),
    payment_method: payment_method || 'Cash',
    notes: notes || ''
  });
  await logActivity('Collect Advance', `Advance security ₨ ${toNumber(amount).toLocaleString()} recorded inside logs.`);
  res.redirect('/advance?success_msg=' + encodeURIComponent('Security Deposit Advance payment successfully tracked.'));
}));

app.get('/advance/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const adv = db.advance_payments.find(a => a.id === req.params.id);
  if (!adv) return res.redirect('/advance?error_msg=' + encodeURIComponent('Security advance record trace not found.'));
  const activeAgreements = db.rent_agreements.map(ag => {
    const tenant = db.tenants.find(t => t.id === ag.tenant_id);
    const unit = db.units.find(u => u.id === ag.unit_id);
    return {
      ...ag,
      tenant_name: tenant ? tenant.name : 'Unknown',
      unit_name: unit ? unit.name : 'Unknown'
    };
  });
  res.render('advance/edit', { advance: adv, agreements: activeAgreements, error_msg: req.query.error_msg || null });
}));

app.post('/advance/:id/edit', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { amount, received_date, payment_method, notes } = req.body;
  if (!amount) return res.redirect(`/advance/${req.params.id}/edit?error_msg=` + encodeURIComponent('Advance amount is required.'));

  await updateById('advance_payments', req.params.id, {
    amount: toNumber(amount),
    received_date,
    payment_method,
    notes: notes || ''
  });
  await logActivity('Edit Advance', `Security Advance parameters modified for track ID: ${req.params.id}`);
  res.redirect('/advance?success_msg=' + encodeURIComponent('Advance deposit parameter trace updated.'));
}));

app.post('/advance/:id/delete', requireAuth, asyncHandler(async (req: any, res: any) => {
  await deleteById('advance_payments', req.params.id);
  await logActivity('Delete Advance', `Historical advance receipt ID ${req.params.id} has been manually deleted.`);
  res.redirect('/advance?success_msg=' + encodeURIComponent('Security advance receipt removed from active balances.'));
}));

// -----------------------------------------
// SMART DATA ENTRY ROUTE SYSTEM
// -----------------------------------------
app.get('/smart-entry', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  res.render('smart-entry', {
    cities: db.cities,
    areas: db.areas,
    properties: db.properties,
    units: db.units,
    tenants: db.tenants,
    activeTab: 'smart-entry',
    error_msg: null
  });
}));

app.post('/smart-entry', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  let {
    city_mode, city_id, new_city_name, new_city_province,
    area_mode, area_id, new_area_name,
    property_mode, property_id, new_property_name, new_property_type, new_property_address,
    unit_mode, unit_id, new_unit_name, new_unit_floor_name, new_unit_type, new_unit_rent_amount, new_unit_status,
    tenant_mode, tenant_id, new_tenant_name, new_tenant_father_name, new_tenant_cnic, new_tenant_phone, new_tenant_address, new_tenant_emergency_contact, new_tenant_notes,
    agreement_start_date, agreement_end_date, agreement_monthly_rent, agreement_advance_amount, agreement_notes,
    record_advance_payment, record_first_rent, payment_date, payment_method, payment_remarks
  } = req.body;

  const renderBack = (err: string) => {
    res.render('smart-entry', {
      cities: db.cities,
      areas: db.areas,
      properties: db.properties,
      units: db.units,
      tenants: db.tenants,
      activeTab: 'smart-entry',
      error_msg: err
    });
  };

  // 1. City
  let chosenCityId = city_id;
  if (city_mode === 'new') {
    if (!new_city_name || !new_city_name.trim()) return renderBack('City Name is required when adding a new city.');
    const existingCity = db.cities.find(c => String(c.name).toLowerCase() === new_city_name.trim().toLowerCase());
    if (existingCity) chosenCityId = existingCity.id;
    else {
      const newCity = await insertOne('cities', {
        name: new_city_name.trim(),
        province: new_city_province || 'Punjab'
      });
      chosenCityId = newCity.id;
      db.cities.push(newCity);
      await logActivity('Add City', `City ${newCity.name} created via Smart Entry.`);
    }
  } else if (!chosenCityId) return renderBack('Please select an existing city or select the option to create a new one.');

  // 2. Area
  let chosenAreaId = area_id;
  if (area_mode === 'new') {
    if (!new_area_name || !new_area_name.trim()) return renderBack('Area Name is required when adding a new area.');
    const existingArea = db.areas.find(a => String(a.name).toLowerCase() === new_area_name.trim().toLowerCase() && a.city_id === chosenCityId);
    if (existingArea) chosenAreaId = existingArea.id;
    else {
      const newArea = await insertOne('areas', {
        city_id: chosenCityId,
        name: new_area_name.trim()
      });
      chosenAreaId = newArea.id;
      db.areas.push(newArea);
      await logActivity('Add Area', `Area ${newArea.name} created via Smart Entry.`);
    }
  } else if (!chosenAreaId) return renderBack('Please select an existing area or select the option to create a new one.');

  // 3. Property
  let chosenPropertyId = property_id;
  if (property_mode === 'new') {
    if (!new_property_name || !new_property_name.trim()) return renderBack('Property Name is required when adding a new property.');
    const existingProp = db.properties.find(p => String(p.name).toLowerCase() === new_property_name.trim().toLowerCase() && p.city_id === chosenCityId && p.area_id === chosenAreaId);
    if (existingProp) chosenPropertyId = existingProp.id;
    else {
      const newProp = await insertOne('properties', {
        name: new_property_name.trim(),
        city_id: chosenCityId,
        area_id: chosenAreaId,
        property_type: new_property_type || 'Other',
        address: new_property_address || '',
        description: 'Auto-created via Smart Entry',
        status: 'Active'
      });
      chosenPropertyId = newProp.id;
      db.properties.push(newProp);
      await logActivity('Add Property', `Property ${newProp.name} created via Smart Entry.`);
    }
  } else if (!chosenPropertyId) return renderBack('Please select an existing property or select the option to create a new one.');

  // 4. Unit and floor
  let chosenUnitId = unit_id;
  if (unit_mode === 'new') {
    if (!new_unit_name || !new_unit_name.trim()) return renderBack('Unit Name/Number is required when adding a new unit.');
    const floorName = new_unit_floor_name || 'Ground Floor';
    let floor = db.floors.find(f => f.property_id === chosenPropertyId && String(f.name).toLowerCase() === floorName.trim().toLowerCase());
    if (!floor) {
      floor = await insertOne('floors', { property_id: chosenPropertyId, name: floorName.trim() });
      db.floors.push(floor);
    }

    const existingUnit = db.units.find(u => String(u.name).toLowerCase() === new_unit_name.trim().toLowerCase() && u.property_id === chosenPropertyId);
    if (existingUnit) chosenUnitId = existingUnit.id;
    else {
      const newUnit = await insertOne('units', {
        property_id: chosenPropertyId,
        floor_id: floor.id,
        name: new_unit_name.trim(),
        unit_type: new_unit_type || 'Apartment',
        rent_amount: toNumber(new_unit_rent_amount),
        advance_amount: toNumber(agreement_advance_amount),
        status: new_unit_status || 'Rented',
        notes: 'Created via Smart Entry'
      });
      chosenUnitId = newUnit.id;
      db.units.push(newUnit);
      await logActivity('Add Unit', `Unit ${newUnit.name} created via Smart Entry.`);
    }
  } else if (!chosenUnitId) return renderBack('Please select an existing unit or select the option to create a new one.');

  // 5. Tenant
  let chosenTenantId = tenant_id;
  if (tenant_mode === 'new') {
    if (!new_tenant_name || !new_tenant_name.trim()) return renderBack('Tenant Name is required when registering a new tenant.');
    let existingTenant = null;
    if (new_tenant_cnic && new_tenant_cnic.trim()) existingTenant = db.tenants.find(t => t.cnic === new_tenant_cnic.trim());
    if (!existingTenant && new_tenant_phone && new_tenant_phone.trim()) {
      existingTenant = db.tenants.find(t => t.phone === new_tenant_phone.trim() && String(t.name).toLowerCase() === new_tenant_name.trim().toLowerCase());
    }

    if (existingTenant) chosenTenantId = existingTenant.id;
    else {
      const newTenant = await insertOne('tenants', {
        name: new_tenant_name.trim(),
        father_name: new_tenant_father_name || '',
        cnic: new_tenant_cnic || null,
        phone: new_tenant_phone || '',
        address: new_tenant_address || '',
        emergency_contact: new_tenant_emergency_contact || '',
        notes: new_tenant_notes || ''
      });
      chosenTenantId = newTenant.id;
      db.tenants.push(newTenant);
      await logActivity('Add Tenant', `Tenant ${newTenant.name} registered via Smart Entry.`);
    }
  } else if (!chosenTenantId) return renderBack('Please select an existing tenant or select the option to register a new tenant.');

  // 6. End old active agreements for same unit
  const activeLeases = db.rent_agreements.filter(ag => ag.unit_id === chosenUnitId && ag.status === 'Active');
  for (const lease of activeLeases) {
    await updateById('rent_agreements', lease.id, { status: 'Ended' });
    await logActivity('Terminate Lease', `Auto-archived previous lease ${lease.id} during fresh Smart Entry transfer to new tenant.`);
  }
  await updateById('units', chosenUnitId, { status: 'Rented' });

  const unitForRent = db.units.find(u => u.id === chosenUnitId);
  const finalMonthlyRent = toNumber(agreement_monthly_rent, unitForRent ? toNumber(unitForRent.rent_amount) : 30000);
  const finalAdvanceAmount = toNumber(agreement_advance_amount);

  const newAgreement = await insertOne('rent_agreements', {
    tenant_id: chosenTenantId,
    unit_id: chosenUnitId,
    monthly_rent: finalMonthlyRent,
    advance_amount: finalAdvanceAmount,
    start_date: agreement_start_date || todayDate(),
    end_date: agreement_end_date || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    due_day: 5,
    status: 'Active',
    notes: agreement_notes || 'Authorized through Smart Entry wizard'
  });

  if (record_advance_payment === 'yes' && finalAdvanceAmount > 0) {
    await insertOne('advance_payments', {
      tenant_id: chosenTenantId,
      unit_id: chosenUnitId,
      agreement_id: newAgreement.id,
      amount: finalAdvanceAmount,
      received_date: payment_date || todayDate(),
      payment_method: payment_method || 'Cash',
      notes: payment_remarks || 'Advance deposit tracked fully through Smart Entry.'
    });
    await logActivity('Collect Advance', `Advance security ₨ ${finalAdvanceAmount.toLocaleString()} recorded for unit ${chosenUnitId}.`);
  }

  if (record_first_rent === 'yes' && finalMonthlyRent > 0) {
    const parsedDate = agreement_start_date ? new Date(agreement_start_date) : new Date();
    const rentMonth = parsedDate.getMonth() + 1;
    const rentYear = parsedDate.getFullYear();
    await insertOne('rent_payments', {
      tenant_id: chosenTenantId,
      unit_id: chosenUnitId,
      agreement_id: newAgreement.id,
      rent_month: rentMonth,
      rent_year: rentYear,
      total_rent: finalMonthlyRent,
      paid_amount: finalMonthlyRent,
      pending_amount: 0,
      status: 'Paid',
      payment_date: payment_date || todayDate(),
      payment_method: payment_method || 'Cash',
      notes: payment_remarks || 'First month rent paid inside Smart Entry wizard.'
    });
    await logActivity('Collect Rent', `Smart Entry auto-collected rent ₨ ${finalMonthlyRent.toLocaleString()} for Month ${rentMonth}/${rentYear}.`);
  }

  await logActivity('Smart Entry Success', `Unified entry successfully stored for unit ID ${chosenUnitId}.`);
  res.redirect('/?success_msg=' + encodeURIComponent('Smart Entry successfully processed! Linked property, unit, tenant, lease agreement and payments successfully.'));
}));

// -----------------------------------------
// ERROR HANDLER
// -----------------------------------------
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  const message = err?.message || 'Unexpected server error';
  if (res.headersSent) return next(err);
  res.status(500).send(`Server Error: ${message}`);
});

// Start Express Listener
// Start Express Listener only for local development
if (!process.env.VERCEL) {
  ensureDefaultAdmin().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Open http://localhost:${PORT}`);
    });
  });
}

export default app;
