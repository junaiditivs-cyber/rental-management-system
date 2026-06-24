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
const SUPABASE_ADMIN_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

const supabaseAdmin = SUPABASE_ADMIN_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ADMIN_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

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
  user_property_assignments: AnyRow[];
  user_permissions: AnyRow[];
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
    user_property_assignments,
user_permissions,
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
    selectAll('user_property_assignments'),
    selectAll('user_permissions'),
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
  user_property_assignments,
  user_permissions,
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
const PERMISSION_GROUPS = [
  {
    title: 'Dashboard',
    permissions: [
      { key: 'view_dashboard', label: 'Dashboard View' }
    ]
  },
  {
    title: 'Smart Entry',
    permissions: [
      { key: 'view_smart_entry', label: 'Smart Entry View' },
      { key: 'add_smart_entry', label: 'Smart Entry Add' }
    ]
  },
  {
    title: 'Cities',
    permissions: [
      { key: 'view_cities', label: 'Cities View' },
      { key: 'add_cities', label: 'Cities Add' },
      { key: 'edit_cities', label: 'Cities Edit' },
      { key: 'delete_cities', label: 'Cities Delete' }
    ]
  },
  {
    title: 'Areas',
    permissions: [
      { key: 'view_areas', label: 'Areas View' },
      { key: 'add_areas', label: 'Areas Add' },
      { key: 'edit_areas', label: 'Areas Edit' },
      { key: 'delete_areas', label: 'Areas Delete' }
    ]
  },
  {
    title: 'Properties',
    permissions: [
      { key: 'view_properties', label: 'Properties View' },
      { key: 'add_properties', label: 'Properties Add' },
      { key: 'edit_properties', label: 'Properties Edit' },
      { key: 'delete_properties', label: 'Properties Delete' }
    ]
  },
  {
    title: 'Floors',
    permissions: [
      { key: 'add_floors', label: 'Floors Add' },
      { key: 'delete_floors', label: 'Floors Delete' }
    ]
  },
  {
    title: 'Units',
    permissions: [
      { key: 'view_units', label: 'Units View' },
      { key: 'add_units', label: 'Units Add' },
      { key: 'edit_units', label: 'Units Edit' },
      { key: 'delete_units', label: 'Units Delete' }
    ]
  },
  {
    title: 'Tenants',
    permissions: [
      { key: 'view_tenants', label: 'Tenants View' },
      { key: 'add_tenants', label: 'Tenants Add' },
      { key: 'edit_tenants', label: 'Tenants Edit' },
      { key: 'delete_tenants', label: 'Tenants Delete' }
    ]
  },
  {
    title: 'Agreements',
    permissions: [
      { key: 'view_agreements', label: 'Agreements View' },
      { key: 'add_agreements', label: 'Agreements Add' },
      { key: 'edit_agreements', label: 'Agreements Edit' },
      { key: 'delete_agreements', label: 'Agreements Delete' },
      { key: 'end_agreements', label: 'Agreements End' }
    ]
  },
  {
    title: 'Rent',
    permissions: [
      { key: 'view_rent', label: 'Rent View' },
      { key: 'collect_rent', label: 'Rent Collect' },
      { key: 'edit_rent', label: 'Rent Edit' },
      { key: 'delete_rent', label: 'Rent Delete' }
    ]
  },
  {
    title: 'Advance',
    permissions: [
      { key: 'view_advance', label: 'Advance View' },
      { key: 'add_advance', label: 'Advance Add' },
      { key: 'edit_advance', label: 'Advance Edit' },
      { key: 'delete_advance', label: 'Advance Delete' }
    ]
  },
  {
    title: 'Reports & Logs',
    permissions: [
      { key: 'view_reports', label: 'Reports View' },
      { key: 'view_logs', label: 'Activity Logs View' }
    ]
  },
  {
    title: 'Users & Access',
    permissions: [
      { key: 'view_users', label: 'Users View' },
      { key: 'create_users', label: 'Users Create' },
      { key: 'edit_users', label: 'Users Edit' },
      { key: 'delete_users', label: 'Users Delete' },
      { key: 'assign_user_access', label: 'Users Assign Access' }
    ]
  }
];

function isSuperAdmin(admin: any) {
  return String(admin?.role || '').toLowerCase() === 'super admin';
}

function filterDbForAdmin(db: AppDb, admin: any): AppDb {
  if (isSuperAdmin(admin)) {
    return db;
  }

  const assignedPropertyIds = new Set(
    db.user_property_assignments
      .filter(a => a.user_id === admin?.id)
      .map(a => a.property_id)
  );

  const properties = db.properties.filter(p => assignedPropertyIds.has(p.id));
  const propertyIds = new Set(properties.map(p => p.id));

  const floors = db.floors.filter(f => propertyIds.has(f.property_id));
  const units = db.units.filter(u => propertyIds.has(u.property_id));
  const unitIds = new Set(units.map(u => u.id));

  const rent_agreements = db.rent_agreements.filter(ag => unitIds.has(ag.unit_id));
  const agreementIds = new Set(rent_agreements.map(ag => ag.id));

  const rent_payments = db.rent_payments.filter(
    p => unitIds.has(p.unit_id) || agreementIds.has(p.agreement_id)
  );

  const advance_payments = db.advance_payments.filter(
    a => unitIds.has(a.unit_id) || agreementIds.has(a.agreement_id)
  );

  const advancePaymentIds = new Set(advance_payments.map(a => a.id));

  const advance_adjustments = db.advance_adjustments.filter(
    a =>
      unitIds.has(a.unit_id) ||
      agreementIds.has(a.agreement_id) ||
      advancePaymentIds.has(a.advance_payment_id)
  );

  const tenantIds = new Set([
    ...rent_agreements.map(ag => ag.tenant_id),
    ...rent_payments.map(p => p.tenant_id),
    ...advance_payments.map(a => a.tenant_id)
  ].filter(Boolean));

  const tenants = db.tenants.filter(t => tenantIds.has(t.id));

  const cityIds = new Set(properties.map(p => p.city_id).filter(Boolean));
  const areaIds = new Set(properties.map(p => p.area_id).filter(Boolean));

  const cities = db.cities.filter(c => cityIds.has(c.id));
  const areas = db.areas.filter(a => areaIds.has(a.id));
return {
  ...db,
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
  user_property_assignments: db.user_property_assignments || [],
  user_permissions: db.user_permissions || [],
  activity_logs: []
};
}

async function loadScopedDb(req: any): Promise<AppDb> {
  const db = await loadDb();
  const admin = (req.session as any)?.admin;
  return filterDbForAdmin(db, admin);
}

function requireSuperAdmin(req: any, res: any, next: any) {
  const admin = (req.session as any)?.admin;

  if (!admin || !isSuperAdmin(admin)) {
    return res.status(403).send('Forbidden: Super Admin access required.');
  }

  next();
}
function canAccess(req: any, permissionKey: string) {
  const admin = (req.session as any)?.admin;

  if (!admin) return false;
  if (isSuperAdmin(admin)) return true;

  const permissions = (req as any).userPermissions || new Set();
  return permissions.has(permissionKey);
}

function requirePermission(permissionKey: string) {
  return (req: any, res: any, next: any) => {
    if (!canAccess(req, permissionKey)) {
      return res.status(403).send('Forbidden: You do not have permission to access this action.');
    }

    next();
  };
}

async function ensureDefaultAdmin() {
  const { data, error } = await supabase.from('admin_users').select('id').limit(1);
  if (error) {
    console.error('Admin check error:', error.message);
    return;
  }
  if (!data || data.length === 0) {
  const { error: insertError } = await supabase.from('admin_users').insert({
  username: 'admin@gmail.com',
  password_hash: 'admin123',
  full_name: 'Super Admin',
  role: 'Super Admin'
});
    if (insertError) console.error('Default admin insert error:', insertError.message);
  }
}

// Setup Middleware
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  '/vendor/sortablejs',
  express.static(path.join(process.cwd(), 'node_modules', 'sortablejs'))
);
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


app.use(asyncHandler(async (req: any, res: any, next: any) => {
  const admin = (req.session as any)?.admin;

  if (!admin) {
    (req as any).userPermissions = new Set();
    res.locals.can = () => false;
    return next();
  }

  if (isSuperAdmin(admin)) {
    (req as any).userPermissions = new Set();
    res.locals.can = () => true;
    return next();
  }

  const { data, error } = await supabase
    .from('user_permissions')
    .select('permission_key')
    .eq('user_id', admin.id)
    .eq('is_allowed', true);

  if (error) throw error;

  const permissionSet = new Set((data || []).map(p => p.permission_key));

  (req as any).userPermissions = permissionSet;

  res.locals.can = (permissionKey: string) => {
    return permissionSet.has(permissionKey);
  };

  next();
}));

// Set EJS Engine
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

// Set EJS Engine


// Auth Guard Middleware
function requireAuth(req: any, res: any, next: any) {
  const admin = (req.session as any)?.admin;
  if (!admin) return res.redirect('/login');

  res.locals.admin = admin;
  res.locals.session = req.session;

  next();
}
app.get('/login', (req, res) => {
  if ((req.session as any)?.admin) return res.redirect('/');
  res.render('auth/login', { error_msg: null });
});

app.post('/login', asyncHandler(async (req: any, res: any) => {
  const rawUsername = String(req.body.username || '')
    .trim()
    .toLowerCase();

  const password = String(req.body.password || '');

  if (!rawUsername || !password) {
    return res.render('auth/login', {
      error_msg: 'Gmail address and password are required.'
    });
  }

  const gmailUsername = rawUsername.includes('@')
    ? rawUsername
    : `${rawUsername}@gmail.com`;

  const usernameWithoutDomain = gmailUsername.split('@')[0];

  const possibleUsernames = [
    gmailUsername,
    usernameWithoutDomain
  ];

  const { data: matchedAdmins, error } = await supabase
    .from('admin_users')
    .select('*')
    .in('username', possibleUsernames)
    .limit(2);

  if (error) {
    throw error;
  }

  const admins = matchedAdmins || [];

  const admin =
    admins.find(
      row =>
        String(row.username || '').trim().toLowerCase() === gmailUsername
    ) ||
    admins.find(
      row =>
        String(row.username || '').trim().toLowerCase() === usernameWithoutDomain
    ) ||
    null;

  if (!admin || String(admin.password_hash || '') !== password) {
    return res.render('auth/login', {
      error_msg: 'Incorrect Gmail address or password.'
    });
  }

  (req.session as any).admin = {
    id: admin.id,
    username: admin.username,
    role: admin.role || 'User',
    full_name: admin.full_name || admin.username
  };

  await logActivity(
    'Admin Login',
    `User ${admin.username} authorized successfully.`
  );

  req.session.save((sessionError: any) => {
    if (sessionError) {
      console.error('Session save error:', sessionError);

      return res.render('auth/login', {
        error_msg: 'Login session could not be saved. Please try again.'
      });
    }

    return res.redirect('/');
  });
}));
// -----------------------------------------
// USER MANAGEMENT AND PROPERTY ASSIGNMENTS
// -----------------------------------------
app.get('/users', requireAuth, requirePermission('view_users'), asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();

  const users = db.admin_users.map(user => {
    const assignedCount = (db.user_property_assignments || []).filter(a => a.user_id === user.id).length;
    const permissionCount = (db.user_permissions || []).filter(p => p.user_id === user.id && p.is_allowed).length;

    return {
      ...user,
      assignedCount,
      permissionCount
    };
  });

  res.render('users/list', {
    users,
    activeTab: 'users',
    success_msg: req.query.success_msg || null,
    error_msg: req.query.error_msg || null
  });
}));

app.get('/users/add', requireAuth, requirePermission('create_users'), (req: any, res: any) => {
  res.render('users/add', {
    activeTab: 'users',
    error_msg: null
  });
});

app.post('/users/add', requireAuth, requirePermission('create_users'), asyncHandler(async (req: any, res: any) => {
  const currentAdmin = (req.session as any)?.admin;
  const { full_name, username, password, role } = req.body;

  if (!username || !password) {
    return res.render('users/add', {
      activeTab: 'users',
      error_msg: 'Username and password are required.'
    });
  }

  const finalRole = isSuperAdmin(currentAdmin) ? (role || 'User') : 'User';

  const { data: existingUser, error: existingError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingUser) {
    return res.render('users/add', {
      activeTab: 'users',
      error_msg: 'This username already exists.'
    });
  }

  await insertOne('admin_users', {
    full_name: full_name || username,
    username,
    password_hash: password,
    role: finalRole
  });

  await logActivity('Create User', `Created user account: ${username}`);
  res.redirect('/users?success_msg=' + encodeURIComponent('User created successfully.'));
}));

app.get('/users/:id/edit', requireAuth, requirePermission('edit_users'), asyncHandler(async (req: any, res: any) => {
  const currentAdmin = (req.session as any)?.admin;
  const db = await loadDb();
  const user = db.admin_users.find(u => u.id === req.params.id);

  if (!user) {
    return res.redirect('/users?error_msg=' + encodeURIComponent('User not found.'));
  }

  if (user.role === 'Super Admin' && !isSuperAdmin(currentAdmin)) {
    return res.redirect('/users?error_msg=' + encodeURIComponent('Only Super Admin can edit Super Admin account.'));
  }

  res.render('users/edit', {
    user,
    activeTab: 'users',
    error_msg: null
  });
}));

app.post('/users/:id/edit', requireAuth, requirePermission('edit_users'), asyncHandler(async (req: any, res: any) => {
  const currentAdmin = (req.session as any)?.admin;
  const db = await loadDb();
  const user = db.admin_users.find(u => u.id === req.params.id);

  if (!user) {
    return res.redirect('/users?error_msg=' + encodeURIComponent('User not found.'));
  }

  if (user.role === 'Super Admin' && !isSuperAdmin(currentAdmin)) {
    return res.redirect('/users?error_msg=' + encodeURIComponent('Only Super Admin can edit Super Admin account.'));
  }

  const { full_name, username, password, role } = req.body;

  const payload: AnyRow = {
    full_name: full_name || username,
    username,
    role: isSuperAdmin(currentAdmin) ? (role || 'User') : (user.role || 'User')
  };

  if (password && String(password).trim()) {
    payload.password_hash = password;
  }

  await updateById('admin_users', req.params.id, payload);
  await logActivity('Update User', `Updated user account: ${username}`);

  res.redirect('/users?success_msg=' + encodeURIComponent('User updated successfully.'));
}));

app.post('/users/:id/delete', requireAuth, requirePermission('delete_users'), asyncHandler(async (req: any, res: any) => {
  const currentAdmin = (req.session as any)?.admin;
  const db = await loadDb();
  const user = db.admin_users.find(u => u.id === req.params.id);

  if (!user) {
    return res.redirect('/users?error_msg=' + encodeURIComponent('User not found.'));
  }

  if (currentAdmin?.id === req.params.id) {
    return res.redirect('/users?error_msg=' + encodeURIComponent('You cannot delete your own account.'));
  }

  if (user.role === 'Super Admin') {
    return res.redirect('/users?error_msg=' + encodeURIComponent('Super Admin account cannot be deleted.'));
  }

  await supabase.from('user_property_assignments').delete().eq('user_id', req.params.id);
  await supabase.from('user_permissions').delete().eq('user_id', req.params.id);

  await deleteById('admin_users', req.params.id);
  await logActivity('Delete User', `Deleted user account: ${user.username}`);

  res.redirect('/users?success_msg=' + encodeURIComponent('User deleted successfully.'));
}));

app.get('/users/:id/assign', requireAuth, requirePermission('assign_user_access'), asyncHandler(async (req: any, res: any) => {
  const currentAdmin = (req.session as any)?.admin;
  const db = await loadDb();
  const user = db.admin_users.find(u => u.id === req.params.id);

  if (!user) {
    return res.redirect('/users?error_msg=' + encodeURIComponent('User not found.'));
  }

  if (user.role === 'Super Admin' && !isSuperAdmin(currentAdmin)) {
    return res.redirect('/users?error_msg=' + encodeURIComponent('Only Super Admin can assign access to Super Admin.'));
  }

  const assignedPropertyIds = (db.user_property_assignments || [])
    .filter(a => a.user_id === user.id)
    .map(a => a.property_id);

  const assignedPermissionKeys = (db.user_permissions || [])
    .filter(p => p.user_id === user.id && p.is_allowed)
    .map(p => p.permission_key);

  const properties = db.properties.map(property => {
    const city = db.cities.find(c => c.id === property.city_id);
    const area = db.areas.find(a => a.id === property.area_id);

    return {
      ...property,
      city_name: city ? city.name : 'Unknown City',
      area_name: area ? area.name : 'Unknown Area',
      isAssigned: assignedPropertyIds.includes(property.id)
    };
  });

  res.render('users/assign', {
    user,
    properties,
    permissionGroups: PERMISSION_GROUPS,
    assignedPermissionKeys,
    activeTab: 'users',
    error_msg: null
  });
}));

app.post('/users/:id/assign', requireAuth, requirePermission('assign_user_access'), asyncHandler(async (req: any, res: any) => {
  const currentAdmin = (req.session as any)?.admin;
  const userId = req.params.id;

  let propertyIds = req.body.property_ids || [];
  let permissionKeys = req.body.permission_keys || [];

  if (!Array.isArray(propertyIds)) {
    propertyIds = [propertyIds];
  }

  if (!Array.isArray(permissionKeys)) {
    permissionKeys = [permissionKeys];
  }

  propertyIds = propertyIds.filter(Boolean);
  permissionKeys = permissionKeys.filter(Boolean);

  const db = await loadDb();
  const user = db.admin_users.find(u => u.id === userId);

  if (!user) {
    return res.redirect('/users?error_msg=' + encodeURIComponent('User not found.'));
  }

  if (user.role === 'Super Admin' && !isSuperAdmin(currentAdmin)) {
    return res.redirect('/users?error_msg=' + encodeURIComponent('Only Super Admin can assign access to Super Admin.'));
  }

  await supabase
    .from('user_property_assignments')
    .delete()
    .eq('user_id', userId);

  if (propertyIds.length > 0) {
    const propertyRows = propertyIds.map((propertyId: string) => ({
      user_id: userId,
      property_id: propertyId
    }));

    const { error: propertyError } = await supabase
      .from('user_property_assignments')
      .insert(propertyRows);

    if (propertyError) throw propertyError;
  }

  await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId);

  if (permissionKeys.length > 0) {
    const permissionRows = permissionKeys.map((permissionKey: string) => ({
      user_id: userId,
      permission_key: permissionKey,
      is_allowed: true
    }));

    const { error: permissionError } = await supabase
      .from('user_permissions')
      .insert(permissionRows);

    if (permissionError) throw permissionError;
  }

  await logActivity('Assign User Access', `Updated property and permission access for user: ${user.username}`);

  res.redirect('/users?success_msg=' + encodeURIComponent('User access updated successfully.'));
}));

// -----------------------------------------
// CHANGE PASSWORD ROUTES
// -----------------------------------------
app.get('/change-password', requireAuth, (req: any, res: any) => {
  res.render('auth/change-password', {
    activeTab: 'change-password',
    error_msg: null,
    success_msg: null
  });
});

app.post('/change-password', requireAuth, asyncHandler(async (req: any, res: any) => {
  const admin = (req.session as any)?.admin;
  const { current_password, new_password, confirm_password } = req.body;

  if (!current_password || !new_password || !confirm_password) {
    return res.render('auth/change-password', {
      activeTab: 'change-password',
      error_msg: 'All password fields are required.',
      success_msg: null
    });
  }

  if (String(new_password).length < 6) {
    return res.render('auth/change-password', {
      activeTab: 'change-password',
      error_msg: 'New password must be at least 6 characters.',
      success_msg: null
    });
  }

  if (new_password !== confirm_password) {
    return res.render('auth/change-password', {
      activeTab: 'change-password',
      error_msg: 'New password and confirm password do not match.',
      success_msg: null
    });
  }

  const { data: user, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', admin.id)
    .maybeSingle();

  if (error) throw error;

  if (!user) {
    return res.render('auth/change-password', {
      activeTab: 'change-password',
      error_msg: 'User account not found.',
      success_msg: null
    });
  }

  if (user.password_hash !== current_password) {
    return res.render('auth/change-password', {
      activeTab: 'change-password',
      error_msg: 'Current password is incorrect.',
      success_msg: null
    });
  }

  await updateById('admin_users', admin.id, {
    password_hash: new_password
  });

  await logActivity('Change Password', `User ${admin.username} changed their password.`);

  res.render('auth/change-password', {
    activeTab: 'change-password',
    error_msg: null,
    success_msg: 'Password changed successfully. Please use your new password next time.'
  });
}));
// Logout route
app.get('/logout', requireAuth, asyncHandler(async (req: any, res: any) => {
  const username = (req.session as any)?.admin?.username;
  if (username) await logActivity('Admin Logout', `User ${username} logged out.`);
  req.session.destroy(() => res.redirect('/login'));
}));


// -----------------------------------------
// NORMAL USER PAGE / ACTION PERMISSION GUARD
// -----------------------------------------
type RoutePermissionRule = {
  method: string;
  path: string;
  permission: string;
};

const NORMAL_USER_ROUTE_PERMISSIONS: RoutePermissionRule[] = [
  // Dashboard
  { method: 'GET', path: '/', permission: 'view_dashboard' },
  { method: 'GET', path: '/dashboard', permission: 'view_dashboard' },

  // Smart Entry
  { method: 'GET', path: '/smart-entry', permission: 'view_smart_entry' },
  { method: 'POST', path: '/smart-entry', permission: 'add_smart_entry' },

  // Cities
 // Cities
{ method: 'GET', path: '/cities', permission: 'view_cities' },
{ method: 'GET', path: '/cities/add', permission: 'add_cities' },
{ method: 'POST', path: '/cities/add', permission: 'add_cities' },
{ method: 'GET', path: '/cities/:id/edit', permission: 'edit_cities' },
{ method: 'POST', path: '/cities/:id/edit', permission: 'edit_cities' },

{ method: 'GET', path: '/cities/:id/delete-confirm', permission: 'delete_cities' },
{ method: 'POST', path: '/cities/:id/delete', permission: 'delete_cities' },

{ method: 'GET', path: '/cities/:id', permission: 'view_cities' },
  // Areas
  { method: 'GET', path: '/areas', permission: 'view_areas' },
  { method: 'GET', path: '/areas/add', permission: 'add_areas' },
  { method: 'POST', path: '/areas/add', permission: 'add_areas' },
  { method: 'GET', path: '/areas/:id/edit', permission: 'edit_areas' },
  { method: 'POST', path: '/areas/:id/edit', permission: 'edit_areas' },
  { method: 'POST', path: '/areas/:id/delete', permission: 'delete_areas' },

  // Properties
  { method: 'GET', path: '/properties', permission: 'view_properties' },
  { method: 'GET', path: '/properties/add', permission: 'add_properties' },
  { method: 'POST', path: '/properties/add', permission: 'add_properties' },
  { method: 'GET', path: '/properties/:id/edit', permission: 'edit_properties' },
  { method: 'POST', path: '/properties/:id/edit', permission: 'edit_properties' },
  { method: 'POST', path: '/properties/:id/delete', permission: 'delete_properties' },
  { method: 'GET', path: '/properties/:id', permission: 'view_properties' },

  // Floors
  { method: 'POST', path: '/floors/add', permission: 'add_floors' },
  { method: 'POST', path: '/floors/reorder', permission: 'edit_units' },
  { method: 'POST', path: '/floors/:id/delete', permission: 'delete_floors' },

  // Units
  { method: 'GET', path: '/units', permission: 'view_units' },
  { method: 'GET', path: '/units/add', permission: 'add_units' },
  { method: 'POST', path: '/units/add', permission: 'add_units' },
  { method: 'POST', path: '/units/reorder', permission: 'edit_units' },
  { method: 'GET', path: '/units/:id/edit', permission: 'edit_units' },
  { method: 'POST', path: '/units/:id/edit', permission: 'edit_units' },
  
  { method: 'POST', path: '/units/:id/delete', permission: 'delete_units' },
  { method: 'GET', path: '/units/:id', permission: 'view_units' },

  // Tenants
  { method: 'GET', path: '/tenants', permission: 'view_tenants' },
  { method: 'GET', path: '/tenants/add', permission: 'add_tenants' },
  { method: 'POST', path: '/tenants/add', permission: 'add_tenants' },
  { method: 'GET', path: '/tenants/:id/edit', permission: 'edit_tenants' },
  { method: 'POST', path: '/tenants/:id/edit', permission: 'edit_tenants' },
  { method: 'POST', path: '/tenants/:id/delete', permission: 'delete_tenants' },
  { method: 'GET', path: '/tenants/:id', permission: 'view_tenants' },

  // Agreements
  { method: 'GET', path: '/agreements', permission: 'view_agreements' },
  { method: 'GET', path: '/agreements/add', permission: 'add_agreements' },
  { method: 'POST', path: '/agreements/add', permission: 'add_agreements' },
  { method: 'GET', path: '/agreements/:id/edit', permission: 'edit_agreements' },
  { method: 'POST', path: '/agreements/:id/edit', permission: 'edit_agreements' },
  { method: 'GET', path: '/agreements/:id/end', permission: 'end_agreements' },
  { method: 'POST', path: '/agreements/:id/delete', permission: 'delete_agreements' },
  { method: 'GET', path: '/agreements/:id', permission: 'view_agreements' },

  // Rent
  { method: 'GET', path: '/rent', permission: 'view_rent' },
  { method: 'GET', path: '/rent/collect', permission: 'collect_rent' },
  { method: 'POST', path: '/rent/collect', permission: 'collect_rent' },
  { method: 'GET', path: '/rent/:id/partial', permission: 'collect_rent' },
{ method: 'POST', path: '/rent/:id/partial', permission: 'collect_rent' },
  { method: 'GET', path: '/rent/:id/edit', permission: 'edit_rent' },
  { method: 'POST', path: '/rent/:id/edit', permission: 'edit_rent' },
  { method: 'POST', path: '/rent/:id/delete', permission: 'delete_rent' },

  // Advance
  { method: 'GET', path: '/advance', permission: 'view_advance' },
  { method: 'GET', path: '/advance/add', permission: 'add_advance' },
  { method: 'POST', path: '/advance/add', permission: 'add_advance' },
  { method: 'GET', path: '/advance/:id/edit', permission: 'edit_advance' },
  { method: 'POST', path: '/advance/:id/edit', permission: 'edit_advance' },
  { method: 'POST', path: '/advance/:id/delete', permission: 'delete_advance' },

  // Reports / Logs
  { method: 'GET', path: '/reports', permission: 'view_reports' },
  { method: 'GET', path: '/logs', permission: 'view_logs' }
];

function routeMatches(pattern: string, actualPath: string) {
  const patternParts = pattern.split('/').filter(Boolean);
  const actualParts = actualPath.split('/').filter(Boolean);

  if (patternParts.length !== actualParts.length) return false;

  return patternParts.every((part, index) => {
    return part.startsWith(':') || part === actualParts[index];
  });
}

app.use((req: any, res: any, next: any) => {
  const admin = (req.session as any)?.admin;

  if (!admin) return next();

  // Super Admin always has full access
  if (isSuperAdmin(admin)) return next();

  const matchedRule = NORMAL_USER_ROUTE_PERMISSIONS.find(rule => {
    return rule.method === req.method && routeMatches(rule.path, req.path);
  });

  // If route is not listed here, continue.
  // Main security routes are listed above.
  if (!matchedRule) return next();

  if (!canAccess(req, matchedRule.permission)) {
    return res.status(403).send('Forbidden: You do not have permission to access this page or action.');
  }

  next();
});
// -----------------------------------------
// DASHBOARD VIEW ROUTE
// -----------------------------------------
app.get('/', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadScopedDb(req);

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
  const totalAdvanceReceived = db.advance_payments.reduce((sum, a) => sum + toNumber(a.amount), 0);

  const currentMonthAdvanceReceived = db.advance_payments
    .filter(a => {
      if (!a.received_date) return false;

      const receivedDate = new Date(a.received_date);
      if (Number.isNaN(receivedDate.getTime())) return false;

      return (
        receivedDate.getMonth() + 1 === currentMonth &&
        receivedDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, a) => sum + toNumber(a.amount), 0);

  const vacancyRate =
    totalUnitsCount > 0
      ? (vacantUnitsCount / totalUnitsCount) * 100
      : 0;

  const overallStats = {
  expected: expectedMonthlyRent,
  received: receivedRent,
  pending: pendingRentArrears,
  advanceReceived: totalAdvanceReceived,
  advanceThisMonth: currentMonthAdvanceReceived,
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
app.get(
  '/cities',
  requireAuth,
  asyncHandler(async (req: any, res: any) => {
    const db = await loadScopedDb(req);

    const cities = db.cities.map(city => ({
      ...city,
      areasCount: db.areas.filter(
        area => String(area.city_id) === String(city.id)
      ).length,

      propertiesCount: db.properties.filter(
        property => String(property.city_id) === String(city.id)
      ).length
    }));

    res.render('cities/list', {
      cities,
      activeTab: 'cities',

      success_msg: req.query.success_msg
        ? String(req.query.success_msg)
        : null,

      error_msg: req.query.error_msg
        ? String(req.query.error_msg)
        : null
    });
  })
);

app.get('/cities/add', requireAuth, (req, res) => {
  res.render('cities/add');
});

app.post('/cities/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { name, province } = req.body;
  await insertOne('cities', { name, province });
  await logActivity('Create City', `Registered municipal region: ${name} (${province}).`);
  res.redirect('/cities');
}));

app.get(
  '/cities/:id/delete-confirm',
  requireAuth,
  requirePermission('delete_cities'),
  requireSuperAdmin,
  asyncHandler(async (req: any, res: any) => {
    const db = await loadDb();

    const city = db.cities.find(
      row => String(row.id) === String(req.params.id)
    );

    if (!city) {
      return res.redirect(
        '/cities?error_msg=' +
        encodeURIComponent('City not found.')
      );
    }

    const properties = db.properties.filter(
      property =>
        String(property.city_id) === String(city.id)
    );

    const propertyIds = new Set(
      properties.map(property => String(property.id))
    );

    const floors = db.floors.filter(
      floor =>
        propertyIds.has(String(floor.property_id))
    );

    const units = db.units.filter(
      unit =>
        propertyIds.has(String(unit.property_id))
    );

    const unitIds = new Set(
      units.map(unit => String(unit.id))
    );

    const agreements = db.rent_agreements.filter(
      agreement =>
        unitIds.has(String(agreement.unit_id))
    );

    const agreementIds = new Set(
      agreements.map(agreement => String(agreement.id))
    );

    const rentPayments = db.rent_payments.filter(
      payment =>
        unitIds.has(String(payment.unit_id)) ||
        agreementIds.has(String(payment.agreement_id))
    );

    const advancePayments = db.advance_payments.filter(
      payment =>
        unitIds.has(String(payment.unit_id)) ||
        agreementIds.has(String(payment.agreement_id))
    );

    const tenantIds = new Set(
      [
        ...agreements.map(
          agreement => String(agreement.tenant_id || '')
        ),

        ...rentPayments.map(
          payment => String(payment.tenant_id || '')
        ),

        ...advancePayments.map(
          payment => String(payment.tenant_id || '')
        )
      ].filter(Boolean)
    );

    res.render('cities/delete-confirm', {
      city,

      summary: {
        areas: db.areas.filter(
          area =>
            String(area.city_id) === String(city.id)
        ).length,

        properties: properties.length,
        floors: floors.length,
        units: units.length,
        agreements: agreements.length,
        rentPayments: rentPayments.length,
        advancePayments: advancePayments.length,
        tenants: tenantIds.size
      },

      activeTab: 'cities',

      error_msg: req.query.error_msg
        ? String(req.query.error_msg)
        : null,

      success_msg: null
    });
  })
);
app.get(
  '/cities/:id',
  requireAuth,
  asyncHandler(async (req: any, res: any) => {
    const db = await loadScopedDb(req);

    const cityBase = db.cities.find(
      city => String(city.id) === String(req.params.id)
    );

    if (!cityBase) {
      return res.status(404).send('City not registered');
    }

    const areas = db.areas.filter(
      area =>
        String(area.city_id) === String(cityBase.id)
    );

    const properties = db.properties
      .filter(
        property =>
          String(property.city_id) === String(cityBase.id)
      )
      .map(property => {
        const area = db.areas.find(
          row =>
            String(row.id) === String(property.area_id)
        );

        return {
          ...property,
          area_name: area ? area.name : 'Unknown'
        };
      });

    const city = {
      ...cityBase,
      areasCount: areas.length,
      propertiesCount: properties.length
    };

    const propertyIds = properties.map(
      property => String(property.id)
    );

    const cityUnits = db.units.filter(
      unit =>
        propertyIds.includes(String(unit.property_id))
    );

    const unitIds = cityUnits.map(
      unit => String(unit.id)
    );

    const rentedCount = cityUnits.filter(
      unit =>
        String(unit.status || '').toLowerCase() === 'rented'
    ).length;

    const vacantCount = cityUnits.filter(
      unit =>
        String(unit.status || '').toLowerCase() === 'vacant'
    ).length;

    const pendingRent = db.rent_payments
      .filter(
        payment =>
          unitIds.includes(String(payment.unit_id)) &&
          Number(payment.pending_amount) > 0
      )
      .reduce(
        (sum, payment) =>
          sum + toNumber(payment.pending_amount),
        0
      );

    res.render('cities/detail', {
      city,
      areas,
      properties,

      stats: {
        rentedCount,
        vacantCount,
        pendingRent
      },

      activeTab: 'cities',

      success_msg: req.query.success_msg
        ? String(req.query.success_msg)
        : null,

      error_msg: req.query.error_msg
        ? String(req.query.error_msg)
        : null
    });
  })
);

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

app.post(
  '/cities/:id/delete',
  requireAuth,
  requirePermission('delete_cities'),
  requireSuperAdmin,
  asyncHandler(async (req: any, res: any) => {
    const cityId = String(req.params.id);

    const confirmationName = String(
      req.body.confirmation_name || ''
    ).trim();

    if (!supabaseAdmin) {
      return res.redirect(
        `/cities/${cityId}/delete-confirm?error_msg=` +
        encodeURIComponent(
          'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is missing from the server environment.'
        )
      );
    }

    const db = await loadDb();

    const city = db.cities.find(
      row => String(row.id) === cityId
    );

    if (!city) {
      return res.redirect(
        '/cities?error_msg=' +
        encodeURIComponent('City not found.')
      );
    }

    const actualCityName = String(city.name || '').trim();

    if (
      confirmationName.toLowerCase() !==
      actualCityName.toLowerCase()
    ) {
      return res.redirect(
        `/cities/${cityId}/delete-confirm?error_msg=` +
        encodeURIComponent(
          'City name confirmation did not match.'
        )
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      'delete_city_cascade',
      {
        p_city_id: cityId,
        p_confirmation_name: confirmationName
      }
    );

    if (error) {
      console.error('Full city delete error:', error);

      return res.redirect(
        `/cities/${cityId}/delete-confirm?error_msg=` +
        encodeURIComponent(
          error.message || 'Full city deletion failed.'
        )
      );
    }

    await logActivity(
      'Full City Delete',
      `Deleted city ${city.name} and all linked rental data. ` +
      `Summary: ${JSON.stringify(data?.deleted || {})}`
    );

    return res.redirect(
      '/cities?success_msg=' +
      encodeURIComponent(
        `City ${city.name} and all linked rental data were deleted successfully.`
      )
    );
  })
);
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
  res.render('properties/list', {
    properties: filteredProperties,
    cities: db.cities,
    success_msg: req.query.success_msg ? String(req.query.success_msg) : null,
    error_msg: req.query.error_msg ? String(req.query.error_msg) : null
  });
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

  const floors = db.floors
    .filter(f => f.property_id === property.id)
    .sort((a, b) => {
      const orderA = Number(a.sort_order || 0);
      const orderB = Number(b.sort_order || 0);

      if (orderA !== orderB) return orderA - orderB;

      return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    })
    .map(floor => {
      const floorUnits = db.units
        .filter(u => u.floor_id === floor.id && u.property_id === property.id)
        .sort((a, b) => {
          const orderA = Number(a.sort_order || 0);
          const orderB = Number(b.sort_order || 0);

          if (orderA !== orderB) return orderA - orderB;

          return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
            numeric: true,
            sensitivity: 'base'
          });
        });

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
    rentSummary: {
      expected: expectSum,
      rented: rentedSum,
      vacant: vacantSum,
      total: units.length
    },
    success_msg: req.query.success_msg ? String(req.query.success_msg) : null,
    error_msg: req.query.error_msg ? String(req.query.error_msg) : null
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

app.post(
  '/properties/:id/delete',
  requireAuth,
  asyncHandler(async (req: any, res: any) => {
    const propertyId = String(req.params.id);

    const { data: linkedUnits, error: unitsError } = await supabase
      .from('units')
      .select('id, name, status')
      .eq('property_id', propertyId);

    if (unitsError) {
      throw unitsError;
    }

    if (linkedUnits && linkedUnits.length > 0) {
      return res.redirect(
        `/properties/${propertyId}?error_msg=` +
        encodeURIComponent(
          `Property delete nahi ho sakti. Pehle is property ki ${linkedUnits.length} unit(s) remove karein.`
        )
      );
    }

    const { error: floorsError } = await supabase
      .from('floors')
      .delete()
      .eq('property_id', propertyId);

    if (floorsError) {
      throw floorsError;
    }

    await deleteById('properties', propertyId);

    await logActivity(
      'Delete Property',
      `Deleted empty property ID ${propertyId}.`
    );

    return res.redirect(
      '/properties?success_msg=' +
      encodeURIComponent('Property deleted successfully.')
    );
  })
);  
// -----------------------------------------
// FLOOR ROUTES
// -----------------------------------------
app.post('/floors/add', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();
  const { property_id, name } = req.body;

  const propertyFloors = db.floors.filter(
    floor => String(floor.property_id) === String(property_id)
  );

  const nextSortOrder = propertyFloors.length > 0
    ? Math.max(...propertyFloors.map(floor => Number(floor.sort_order || 0))) + 1
    : 1;

  await insertOne('floors', {
    property_id,
    name,
    sort_order: nextSortOrder
  });

  await logActivity('Create Floor Level', `Installed floor level ${name} on property ${property_id}.`);
  res.redirect(`/properties/${property_id}`);
}));

app.post(
  '/floors/reorder',
  requireAuth,
  requirePermission('edit_units'),
  asyncHandler(async (req: any, res: any) => {
    const db = await loadScopedDb(req);

    const propertyId = String(req.body.property_id || '').trim();
    const orderedFloorIds = Array.isArray(req.body.ordered_floor_ids)
      ? req.body.ordered_floor_ids
          .map((id: any) => String(id).trim())
          .filter(Boolean)
      : [];

    if (!propertyId || orderedFloorIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Property and floor order are required.'
      });
    }

    const property = db.properties.find(
      propertyRow => String(propertyRow.id) === propertyId
    );

    if (!property) {
      return res.status(403).json({
        success: false,
        message: 'Property access denied.'
      });
    }

    const propertyFloors = db.floors.filter(
      floor => String(floor.property_id) === propertyId
    );

    const validFloorIds = new Set(
      propertyFloors.map(floor => String(floor.id))
    );

    const uniqueOrderedIds = [...new Set(orderedFloorIds)];

    const orderIsValid =
      uniqueOrderedIds.length === propertyFloors.length &&
      uniqueOrderedIds.every(floorId => validFloorIds.has(floorId));

    if (!orderIsValid) {
      return res.status(400).json({
        success: false,
        message: 'Submitted section order does not match this property.'
      });
    }

    await Promise.all(
      uniqueOrderedIds.map((floorId, index) =>
        updateById('floors', floorId, {
          sort_order: index + 1
        })
      )
    );

    await logActivity(
      'Reorder Property Sections',
      `Reordered ${uniqueOrderedIds.length} section(s) inside property ${propertyId}.`
    );

    return res.json({
      success: true,
      message: 'Section order saved successfully.'
    });
  })
);

app.post(
  '/floors/:id/delete',
  requireAuth,
  asyncHandler(async (req: any, res: any) => {
    const propertyId = String(req.body.property_id || '').trim();
    const floorId = String(req.params.id || '').trim();

    const { data: linkedUnits, error } = await supabase
      .from('units')
      .select('id')
      .eq('floor_id', floorId)
      .limit(1);

    if (error) throw error;

    if (linkedUnits && linkedUnits.length > 0) {
      const target = propertyId
        ? `/properties/${propertyId}`
        : '/properties';

      return res.redirect(
        target +
        '?error_msg=' +
        encodeURIComponent(
          'Section delete nahi ho sakta. Pehle is section ki tamam units remove karein.'
        )
      );
    }

    await deleteById('floors', floorId);
    await logActivity('Delete Floor', `Purged floor ID ${floorId}.`);

    const target = propertyId
      ? `/properties/${propertyId}`
      : '/properties';

    return res.redirect(
      target +
      '?success_msg=' +
      encodeURIComponent('Section deleted successfully.')
    );
  })
);

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
  const db = await loadDb();
  const { property_id, floor_id, name, unit_type, rent_amount, advance_amount, notes } = req.body;

  const sameFloorUnits = db.units.filter(u => u.property_id === property_id && u.floor_id === floor_id);
  const nextSortOrder = sameFloorUnits.length > 0
    ? Math.max(...sameFloorUnits.map(u => Number(u.sort_order || 0))) + 1
    : 1;

  await insertOne('units', {
    property_id,
    floor_id,
    name,
    unit_type,
    rent_amount: toNumber(rent_amount),
    advance_amount: toNumber(advance_amount),
    status: 'Vacant',
    sort_order: nextSortOrder,
    notes: notes || ''
  });

  await logActivity('Deploy Unit', `Deployed unit ${name} (${unit_type}) to property ${property_id}.`);
  res.redirect(`/properties/${property_id}`);
}));



app.post(
  '/units/reorder',
  requireAuth,
  requirePermission('edit_units'),
  asyncHandler(async (req: any, res: any) => {
    const db = await loadScopedDb(req);

    const propertyId = String(req.body.property_id || '').trim();
    const floorId = String(req.body.floor_id || '').trim();

    const orderedUnitIds = Array.isArray(req.body.ordered_unit_ids)
      ? req.body.ordered_unit_ids
          .map((id: any) => String(id).trim())
          .filter(Boolean)
      : [];

    if (!propertyId || !floorId || orderedUnitIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Property, floor and ordered units are required.'
      });
    }

    const property = db.properties.find(
      propertyRow => String(propertyRow.id) === propertyId
    );

    const floor = db.floors.find(
      floorRow =>
        String(floorRow.id) === floorId &&
        String(floorRow.property_id) === propertyId
    );

    if (!property || !floor) {
      return res.status(403).json({
        success: false,
        message: 'Property or floor access denied.'
      });
    }

    const floorUnits = db.units.filter(
      unit =>
        String(unit.property_id) === propertyId &&
        String(unit.floor_id) === floorId
    );

    const validUnitIds = new Set(
      floorUnits.map(unit => String(unit.id))
    );

    const uniqueOrderedIds = [...new Set(orderedUnitIds)];

    const orderIsValid =
      uniqueOrderedIds.length === floorUnits.length &&
      uniqueOrderedIds.every(unitId => validUnitIds.has(unitId));

    if (!orderIsValid) {
      return res.status(400).json({
        success: false,
        message: 'Submitted shop order does not match this floor.'
      });
    }

    await Promise.all(
      uniqueOrderedIds.map((unitId, index) =>
        updateById('units', unitId, {
          sort_order: index + 1
        })
      )
    );

    await logActivity(
      'Reorder Units',
      `Reordered ${uniqueOrderedIds.length} units on floor ${floorId}.`
    );

    return res.json({
      success: true,
      message: 'Shop order saved successfully.'
    });
  })
);

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

  res.render('units/detail', {
    unit,
    activeAgreement,
    payments,
    success_msg: req.query.success_msg ? String(req.query.success_msg) : null,
    error_msg: req.query.error_msg ? String(req.query.error_msg) : null
  });
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

app.post(
  '/units/:id/delete',
  requireAuth,
  asyncHandler(async (req: any, res: any) => {
    const db = await loadDb();
    const unitId = String(req.params.id || '').trim();
    const unitObj = db.units.find(unit => String(unit.id) === unitId);

    if (!unitObj) {
      return res.redirect(
        '/properties?error_msg=' +
        encodeURIComponent('Unit not found.')
      );
    }

    const hasActiveLease = db.rent_agreements.some(
      agreement =>
        String(agreement.unit_id) === unitId &&
        String(agreement.status || '').toLowerCase() === 'active'
    );

    if (hasActiveLease) {
      return res.redirect(
        `/units/${unitId}?error_msg=` +
        encodeURIComponent(
          'Unit delete nahi ho sakti kyun ke is par active tenant agreement maujood hai.'
        )
      );
    }

    await deleteById('units', unitId);
    await logActivity('Purge Unit', `Removed rental unit ${unitId}.`);

    return res.redirect(
      `/properties/${unitObj.property_id}?success_msg=` +
      encodeURIComponent('Unit deleted successfully.')
    );
  })
);



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

// Later partial / remaining rent payment
app.get('/rent/:id/partial', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();

  const payment = db.rent_payments.find(p => p.id === req.params.id);
  if (!payment) {
    return res.redirect('/rent?error_msg=' + encodeURIComponent('Rent payment record not found.'));
  }

  const tenant = db.tenants.find(t => t.id === payment.tenant_id);
  const unit = db.units.find(u => u.id === payment.unit_id);

  res.render('rent/partial', {
    payment,
    tenant,
    unit,
    error_msg: req.query.error_msg || null
  });
}));

app.post('/rent/:id/partial', requireAuth, asyncHandler(async (req: any, res: any) => {
  const db = await loadDb();

  const payment = db.rent_payments.find(p => p.id === req.params.id);
  if (!payment) {
    return res.redirect('/rent?error_msg=' + encodeURIComponent('Rent payment record not found.'));
  }

  const { received_amount, payment_method, payment_date, payment_proof_url, notes } = req.body;

  const totalRent = toNumber(payment.total_rent);
  const oldPaid = toNumber(payment.paid_amount);
  const oldPending = toNumber(payment.pending_amount);
  const receivedNow = toNumber(received_amount);

  if (receivedNow <= 0) {
    return res.redirect(`/rent/${payment.id}/partial?error_msg=` + encodeURIComponent('Received amount must be greater than 0.'));
  }

  if (receivedNow > oldPending) {
    return res.redirect(`/rent/${payment.id}/partial?error_msg=` + encodeURIComponent('Received amount cannot be greater than pending balance.'));
  }

  const newPaid = oldPaid + receivedNow;
  const newPending = Math.max(0, totalRent - newPaid);
  const newStatus = newPending === 0 ? 'Paid' : 'Partial';

  const oldNotes = payment.notes || '';
  const laterPaymentNote = `[${payment_date}] Later partial received: Rs ${receivedNow.toLocaleString()} via ${payment_method}.${notes ? ' Note: ' + notes : ''}`;

  await updateById('rent_payments', payment.id, {
    paid_amount: newPaid,
    pending_amount: newPending,
    status: newStatus,
    payment_date: payment.payment_date,
    payment_method: payment_method || payment.payment_method,
    payment_proof_url: payment_proof_url || payment.payment_proof_url || null,
    notes: oldNotes ? `${oldNotes}\n${laterPaymentNote}` : laterPaymentNote
  });

  await updateById('units', payment.unit_id, {
    status: newStatus === 'Paid' ? 'Rented' : 'Pending'
  });

  await logActivity('Later Partial Rent', `Received later partial rent Rs ${receivedNow.toLocaleString()} for unit ${payment.unit_id}.`);

  res.redirect('/rent?success_msg=' + encodeURIComponent('Later partial payment received and ledger updated successfully.'));
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
    payment_date: payment.payment_date,
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
      const propertyFloors = db.floors.filter(
        existingFloor => String(existingFloor.property_id) === String(chosenPropertyId)
      );

      const nextFloorSortOrder = propertyFloors.length > 0
        ? Math.max(...propertyFloors.map(existingFloor => Number(existingFloor.sort_order || 0))) + 1
        : 1;

      floor = await insertOne('floors', {
        property_id: chosenPropertyId,
        name: floorName.trim(),
        sort_order: nextFloorSortOrder
      });

      db.floors.push(floor);
    }

    const existingUnit = db.units.find(u => String(u.name).toLowerCase() === new_unit_name.trim().toLowerCase() && u.property_id === chosenPropertyId);
    if (existingUnit) chosenUnitId = existingUnit.id;
    else {
      const sameFloorUnits = db.units.filter(
        unit =>
          String(unit.property_id) === String(chosenPropertyId) &&
          String(unit.floor_id) === String(floor.id)
      );

      const nextSortOrder =
        sameFloorUnits.length > 0
          ? Math.max(
              ...sameFloorUnits.map(unit => Number(unit.sort_order || 0))
            ) + 1
          : 1;

      const newUnit = await insertOne('units', {
        property_id: chosenPropertyId,
        floor_id: floor.id,
        name: new_unit_name.trim(),
        unit_type: new_unit_type || 'Apartment',
        rent_amount: toNumber(new_unit_rent_amount),
        advance_amount: toNumber(agreement_advance_amount),
        status: new_unit_status || 'Rented',
        sort_order: nextSortOrder,
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