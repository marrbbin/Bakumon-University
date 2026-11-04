import { Enrollee } from '../types';

/**
 * BAKUMON UNIVERSITY - STUDENT ENROLLEES DATA STORE
 * 
 * This file serves as the visible and editable data store for student enrollees.
 * You can view, add, modify, or remove default enrolled students right here.
 */

export const LOCAL_ENROLLEES_STORE_KEY = 'bakumon_supabase_enrollees_cache';

export const DEFAULT_INITIAL_STUDENTS: Enrollee[] = [
  {
    id: 'BKU-5001',
    name: 'Hilbert Black',
    mcUsername: 'Hilbert',
    handle: '@hilbert_nawawa',
    experienceLevel: 'Advanced (Elite Four Caliber)',
    timestamp: '2026-10-28 14:22',
    status: 'Enrolled',
    notes: 'Mastering EV/IV spreads and botanical farming.',
    userId: 'user-hilbert-001',
  },
  {
    id: 'BKU-5002',
    name: 'Hilda White',
    mcUsername: 'Hilda',
    handle: '@hilda_subway',
    experienceLevel: 'Intermediate (Gym Challenger)',
    timestamp: '2026-10-29 09:15',
    status: 'Enrolled',
    notes: 'Daycare breeding mechanics and team synergy.',
    userId: 'user-hilda-002',
  },
  {
    id: 'BKU-5003',
    name: 'Cheren Schrenk',
    mcUsername: 'Cheren',
    handle: '@cheren_aspertia',
    experienceLevel: 'Advanced (Elite Four Caliber)',
    timestamp: '2026-10-30 11:40',
    status: 'Enrolled',
    notes: 'Analyzing mathematical damage rolls and speed tiers.',
    userId: 'user-cheren-003',
  },
  {
    id: 'BKU-5004',
    name: 'Bianca Belle',
    mcUsername: 'Bianca',
    handle: '@bianca_daycare',
    experienceLevel: 'Beginner (Fresh out of Nuvema)',
    timestamp: '2026-10-31 16:05',
    status: 'Enrolled',
    notes: 'Beginner trainer ready to learn from square one!',
    userId: 'user-bianca-004',
  },
];

/**
 * Get all enrollees currently held in the local cache/store.
 * Falls back to DEFAULT_INITIAL_STUDENTS if empty.
 */
export const getLocalEnrolleesStore = (): Enrollee[] => {
  try {
    const raw = localStorage.getItem(LOCAL_ENROLLEES_STORE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_ENROLLEES_STORE_KEY, JSON.stringify(DEFAULT_INITIAL_STUDENTS));
      return DEFAULT_INITIAL_STUDENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_INITIAL_STUDENTS;
  } catch (err) {
    console.warn('Failed to parse enrollees from localStorage, using initial students:', err);
    return DEFAULT_INITIAL_STUDENTS;
  }
};

/**
 * Persist the entire enrollees array into the store.
 */
export const saveLocalEnrolleesStore = (list: Enrollee[]): void => {
  try {
    localStorage.setItem(LOCAL_ENROLLEES_STORE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to write enrollees to localStorage store:', err);
  }
};

/**
 * Add a new enrollee to the front of the local store.
 */
export const addLocalEnrollee = (newStudent: Enrollee): Enrollee[] => {
  const current = getLocalEnrolleesStore();
  const updated = [newStudent, ...current.filter((s) => s.id !== newStudent.id)];
  saveLocalEnrolleesStore(updated);
  return updated;
};

/**
 * Remove an enrollee by ID from the local store.
 */
export const removeLocalEnrollee = (id: string): Enrollee[] => {
  const current = getLocalEnrolleesStore();
  const updated = current.filter((s) => s.id !== id);
  saveLocalEnrolleesStore(updated);
  return updated;
};

/**
 * Check if a student with the specified userId is already in the store.
 */
export const findLocalEnrolleeByUserId = (userId: string): Enrollee | undefined => {
  const list = getLocalEnrolleesStore();
  return list.find((s) => s.userId === userId);
};
