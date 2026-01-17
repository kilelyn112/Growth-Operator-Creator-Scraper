import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

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

export async function createUser(input: CreateUserInput): Promise<User> {
  // Check if email already exists
  const existing = await getUserByEmail(input.email);
  if (existing) {
    throw new Error('Email already registered');
  }

  // Hash password
  const password_hash = await bcrypt.hash(input.password, 10);

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

  const isValid = await bcrypt.compare(password, data.password_hash);
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
