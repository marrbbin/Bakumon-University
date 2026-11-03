export type SubjectType = 'Battling' | 'Breeding' | 'Brewing' | 'Berry Farming';

export type ExperienceLevel =
  | 'Beginner (Fresh out of Nuvema)'
  | 'Intermediate (Gym Challenger)'
  | 'Advanced (Elite Four Caliber)';

export type UserRole = 'student' | 'admin' | 'guest';

export interface Enrollee {
  id: string;
  name: string;
  mcUsername?: string;
  handle: string; // Discord handle (e.g. @ash_ketchum)
  experienceLevel?: ExperienceLevel | string;
  timestamp: string;
  status?: string;
  notes?: string;
  userId?: string; // Supabase auth user UUID
  avatarUrl?: string;
}

export interface DiscordUser {
  id: string;
  email?: string;
  username: string;
  discriminator?: string;
  globalName?: string;
  avatar?: string;
  avatarUrl?: string;
  roles: string[]; // Guild role IDs
  effectiveRole: UserRole;
  isSimulated?: boolean;
}

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  discordGuildId: string;
  studentRoleId: string;
  adminRoleId: string;
}

export interface CurriculumModule {
  code: string;
  title: string;
  description: string;
  keyTakeaway: string;
}

export interface CurriculumSubject {
  id: SubjectType;
  title: string;
  departmentName: string;
  accentColor: string;
  borderColor: string;
  bgLight: string;
  summary: string;
  instructor: string;
  instructorTitle: string;
  image: string;
  modules: CurriculumModule[];
  learningOutcomes: string[];
}
