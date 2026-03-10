import { supabase } from './supabase';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

export interface User {
  id: number;
  email: string;
  phone: string | null;
  first_name: string;
  is_member: boolean;
  trial_started_at: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  phone?: string;
  first_name: string;
  password: string;
}

// Trial duration in days
const TRIAL_DAYS = 7;

// ============ USER OPERATIONS ============

function hashPassword(password: string): string {
  // Try bcryptjs first (works on production), fall back to scrypt (Node 24)
  try {
    const bcrypt = require('bcryptjs');
    return bcrypt.hashSync(password, 10);
  } catch {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }
}

function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const derivedKey = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, derivedKey);
}

export async function createUser(input: CreateUserInput): Promise<User> {
  // Check if email already exists
  const existing = await getUserByEmail(input.email);
  if (existing) {
    throw new Error('Email already registered');
  }

  // Hash password
  const password_hash = hashPassword(input.password);

  const { data, error } = await supabase
    .from('users')
    .insert({
      email: input.email.toLowerCase().trim(),
      phone: input.phone || null,
      first_name: input.first_name.trim(),
      password_hash,
      is_member: false,
      trial_started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create account');
  }

  return sanitizeUser(data);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error getting user:', error);
    return null;
  }

  return sanitizeUser(data);
}

export async function getUserById(id: number): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return sanitizeUser(data);
}

export async function verifyPassword(email: string, password: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !data) return null;

  // Support both scrypt (salt:hash) and bcrypt ($2b$...) formats
  let isValid = false;
  if (data.password_hash.includes(':')) {
    // Scrypt format
    isValid = verifyPasswordHash(password, data.password_hash);
  } else if (data.password_hash.startsWith('$2')) {
    // Bcrypt format — try bcryptjs first (works on production Node 18/20),
    // fall back to Python subprocess (for local Node 24 where bcryptjs hangs)
    try {
      const bcrypt = require('bcryptjs');
      isValid = await bcrypt.compare(password, data.password_hash);
    } catch {
      // bcryptjs failed (likely Node 24) — try Python fallback
      try {
        const { execSync } = require('child_process');
        const pw = Buffer.from(password).toString('base64');
        const hash = Buffer.from(data.password_hash).toString('base64');
        const result = execSync(
          `python3 -c "import bcrypt,base64; pw=base64.b64decode('${pw}'); h=base64.b64decode('${hash}'); print(bcrypt.checkpw(pw, h))"`,
          { timeout: 5000 }
        ).toString().trim();
        isValid = result === 'True';
      } catch {
        isValid = false;
      }
    }
  }
  if (!isValid) return null;

  // Update last login
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.id);

  return sanitizeUser(data);
}

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(sanitizeUser);
}

export async function updateUserMemberStatus(userId: number, isMember: boolean): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      is_member: isMember,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }
}

export async function deleteUser(userId: number): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
}

// ============ TRIAL LOGIC ============

export function getTrialStatus(user: User): {
  isActive: boolean;
  daysRemaining: number;
  hasAccess: boolean;
} {
  // Members always have access
  if (user.is_member) {
    return { isActive: false, daysRemaining: 0, hasAccess: true };
  }

  const trialStart = new Date(user.trial_started_at);
  const now = new Date();
  const diffTime = now.getTime() - trialStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, TRIAL_DAYS - diffDays);
  const isActive = daysRemaining > 0;

  return {
    isActive,
    daysRemaining,
    hasAccess: isActive,
  };
}

export function isTrialExpired(user: User): boolean {
  if (user.is_member) return false;
  const status = getTrialStatus(user);
  return !status.hasAccess;
}

// ============ STATS ============

export async function getUserStats(): Promise<{
  total: number;
  members: number;
  activeTrials: number;
  expiredTrials: number;
}> {
  const users = await getAllUsers();

  let members = 0;
  let activeTrials = 0;
  let expiredTrials = 0;

  for (const user of users) {
    if (user.is_member) {
      members++;
    } else {
      const status = getTrialStatus(user);
      if (status.isActive) {
        activeTrials++;
      } else {
        expiredTrials++;
      }
    }
  }

  return {
    total: users.length,
    members,
    activeTrials,
    expiredTrials,
  };
}

// Remove password_hash from user object
function sanitizeUser(data: Record<string, unknown>): User {
  return {
    id: data.id as number,
    email: data.email as string,
    phone: data.phone as string | null,
    first_name: data.first_name as string,
    is_member: Boolean(data.is_member),
    trial_started_at: data.trial_started_at as string,
    last_login_at: data.last_login_at as string | null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}
