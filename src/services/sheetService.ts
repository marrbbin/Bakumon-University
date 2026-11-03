import { Enrollee } from '../types';

const STORAGE_KEY = 'bakumon_enrollees_store';
const ENDPOINT_KEY = 'bakumon_sheets_endpoint';
const SHEET_WEB_LINK_KEY = 'bakumon_sheet_web_link';

export const INITIAL_STUDENTS: Enrollee[] = [
  {
    id: 'BKU-5001',
    name: 'Hilbert Black',
    mcUsername: 'Hilbert',
    handle: '@hilbert_nawawa',
    timestamp: '2026-10-28 14:22',
    status: 'Enrolled',
    notes: 'Mastering EV/IV spreads and botanical farming.',
  },
  {
    id: 'BKU-5002',
    name: 'Hilda White',
    mcUsername: 'Hilda',
    handle: '@hilda_subway',
    timestamp: '2026-10-29 09:15',
    status: 'Enrolled',
    notes: 'Daycare breeding mechanics and team synergy.',
  },
  {
    id: 'BKU-5003',
    name: 'Cheren Schrenk',
    mcUsername: 'Cheren',
    handle: '@cheren_aspertia',
    timestamp: '2026-10-30 11:40',
    status: 'Enrolled',
    notes: 'Analyzing mathematical damage rolls and speed tiers.',
  },
  {
    id: 'BKU-5004',
    name: 'Bianca Belle',
    mcUsername: 'Bianca',
    handle: '@bianca_daycare',
    timestamp: '2026-10-31 16:05',
    status: 'Enrolled',
    notes: 'Beginner trainer ready to learn from square one!',
  },
  {
    id: 'BKU-5005',
    name: 'Red Champion',
    mcUsername: 'Red',
    handle: '@red_kanto',
    timestamp: '2026-11-01 08:30',
    status: 'Enrolled',
    notes: 'Silent tactician focused on competitive mastery.',
  },
  {
    id: 'BKU-5006',
    name: 'Ash Ketchum',
    mcUsername: 'Ash',
    handle: '@ash_pallets',
    timestamp: '2026-11-02 13:12',
    status: 'Enrolled',
    notes: 'Aiming to become the absolute very best!',
  },
];

/**
 * Gets configured Google Sheets API URL.
 */
export const getSheetEndpointUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(ENDPOINT_KEY);
    if (custom && custom.trim().length > 0) {
      return custom.trim();
    }
  }
  const envUrl = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_GOOGLE_SHEETS_API_URL;
  return envUrl ? envUrl.trim() : '';
};

/**
 * Updates stored Google Sheets API URL in localStorage.
 */
export const setSheetEndpointUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    if (!url || url.trim().length === 0) {
      localStorage.removeItem(ENDPOINT_KEY);
    } else {
      localStorage.setItem(ENDPOINT_KEY, url.trim());
    }
  }
};

/**
 * Gets the direct Google Spreadsheet web link (for opening in browser).
 */
export const getSheetWebUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(SHEET_WEB_LINK_KEY);
    if (custom && custom.trim().length > 0) {
      return custom.trim();
    }
  }
  return '';
};

/**
 * Sets the direct Google Spreadsheet web link.
 */
export const setSheetWebUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    if (!url || url.trim().length === 0) {
      localStorage.removeItem(SHEET_WEB_LINK_KEY);
    } else {
      localStorage.setItem(SHEET_WEB_LINK_KEY, url.trim());
    }
  }
};

/**
 * Retrieves cached local students from localStorage.
 */
export const getLocalEnrollees = (): Enrollee[] => {
  if (typeof window === 'undefined') return INITIAL_STUDENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STUDENTS));
      return INITIAL_STUDENTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse local student registry', err);
    return INITIAL_STUDENTS;
  }
};

/**
 * Persists an enrollee into local storage.
 */
export const saveLocalEnrollee = (student: Enrollee): Enrollee[] => {
  const current = getLocalEnrollees();
  const updated = [student, ...current.filter((s) => s.id !== student.id)];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
};

/**
 * Clears or resets database to default.
 */
export const resetDatabase = (): Enrollee[] => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STUDENTS));
  }
  return INITIAL_STUDENTS;
};

/**
 * Generates CSV string from enrollees list for 1-click download/import.
 */
export const exportEnrolleesToCsv = (students: Enrollee[]): string => {
  const headers = ['id', 'name', 'mcUsername', 'handle', 'timestamp', 'status', 'notes'];
  const rows = students.map((s) => [
    `"${s.id}"`,
    `"${(s.name || '').replace(/"/g, '""')}"`,
    `"${(s.mcUsername || '').replace(/"/g, '""')}"`,
    `"${(s.handle || '').replace(/"/g, '""')}"`,
    `"${(s.timestamp || '').replace(/"/g, '""')}"`,
    `"${(s.status || '').replace(/"/g, '""')}"`,
    `"${(s.notes || '').replace(/"/g, '""')}"`,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
};

/**
 * Fetches the live list of enrolled students.
 * Tries the Google Sheets API wrapper first (if configured), falling back to local registry.
 */
export const fetchEnrollees = async (): Promise<{ data: Enrollee[]; source: 'google_sheets' | 'local_storage'; endpoint: string }> => {
  const endpoint = getSheetEndpointUrl();

  if (!endpoint) {
    return {
      data: getLocalEnrollees(),
      source: 'local_storage',
      endpoint: '',
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    
    // Support SheetDB array [{...}], Stein [{...}], Google Apps Script { data: [...] }, or wrapped object
    const rawList: Array<Record<string, unknown>> = Array.isArray(json) 
      ? json 
      : Array.isArray(json.data) 
        ? json.data 
        : Array.isArray(json.records)
          ? json.records
          : [];

    if (rawList.length === 0) {
      return {
        data: getLocalEnrollees(),
        source: 'local_storage',
        endpoint,
      };
    }

    // Normalize entries
    const normalized: Enrollee[] = rawList.map((row, index) => {
      const nameVal = String(row.name || row.Name || row.trainer_name || row['Trainer Name'] || 'Enrolled Student');
      const mcUserVal = String(row.mcUsername || row.mc_username || row['MC Username'] || row.skin || nameVal);
      return {
        id: String(row.id || row.ID || `BKU-${5000 + index + 1}`),
        name: nameVal,
        mcUsername: mcUserVal,
        handle: String(row.handle || row.Handle || row.discord || row['Discord Handle'] || '@student'),
        timestamp: String(row.timestamp || row.Timestamp || new Date().toISOString().slice(0, 16).replace('T', ' ')),
        status: String(row.status || row.Status || 'Enrolled'),
        notes: String(row.notes || row.Notes || row.statement || ''),
      };
    });

    return {
      data: normalized,
      source: 'google_sheets',
      endpoint,
    };
  } catch (error) {
    console.warn('Google Sheets API GET failed, using local registry fallback:', error);
    return {
      data: getLocalEnrollees(),
      source: 'local_storage',
      endpoint,
    };
  }
};

/**
 * Submits an enrollee record to Google Sheets API and local storage.
 */
export const submitEnrollee = async (
  enrolleeData: { name: string; mcUsername?: string; handle: string; notes?: string }
): Promise<{ success: boolean; enrollee: Enrollee; target: 'google_sheets' | 'local_storage'; message: string }> => {
  const newId = `BKU-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const mcUser = enrolleeData.mcUsername?.trim() || enrolleeData.name.trim();

  const newStudent: Enrollee = {
    id: newId,
    name: enrolleeData.name.trim(),
    mcUsername: mcUser,
    handle: enrolleeData.handle.trim(),
    timestamp,
    status: 'Enrolled',
    notes: enrolleeData.notes?.trim() || '',
  };

  // Save to local cache
  saveLocalEnrollee(newStudent);

  const endpoint = getSheetEndpointUrl();

  if (!endpoint) {
    return {
      success: true,
      enrollee: newStudent,
      target: 'local_storage',
      message: 'Student registered in Local Campus Registry. To have records write straight to your live Google Spreadsheet, click "⚙️ Sheet Endpoint" and link your SheetDB or Apps Script URL!',
    };
  }

  try {
    const payload = {
      data: [
        {
          id: newStudent.id,
          name: newStudent.name,
          mcUsername: newStudent.mcUsername,
          handle: newStudent.handle,
          timestamp: newStudent.timestamp,
          status: newStudent.status,
          notes: newStudent.notes,
        },
      ],
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Sheet API responded with ${response.status}: ${response.statusText}`);
    }

    return {
      success: true,
      enrollee: newStudent,
      target: 'google_sheets',
      message: `Student successfully appended as a new row in your connected Google Sheet database!`,
    };
  } catch (error) {
    console.warn('POST to Google Sheets wrapper failed, stored in local registry:', error);
    return {
      success: true,
      enrollee: newStudent,
      target: 'local_storage',
      message: 'Network request to remote Google Sheet timed out. Record saved in local campus registry and visible on Live Roster.',
    };
  }
};

/**
 * Tests connection to a Google Sheets API endpoint.
 */
export const testSheetConnection = async (testUrl: string): Promise<{ ok: boolean; message: string; rowCount?: number }> => {
  if (!testUrl || !testUrl.startsWith('http')) {
    return { ok: false, message: 'Please enter a valid HTTP/HTTPS API URL (e.g. SheetDB or Google Apps Script Web App endpoint).' };
  }
  try {
    const res = await fetch(testUrl, { method: 'GET' });
    if (!res.ok) {
      return { ok: false, message: `Server returned status ${res.status}: ${res.statusText}` };
    }
    const data = await res.json();
    const count = Array.isArray(data) 
      ? data.length 
      : Array.isArray(data.data) 
        ? data.data.length 
        : Array.isArray(data.records)
          ? data.records.length
          : 1;
    return { ok: true, message: `Connection confirmed! Google Sheet endpoint is active and returned ${count} record(s).`, rowCount: count };
  } catch (err) {
    return { ok: false, message: `Connection failed: ${err instanceof Error ? err.message : String(err)}` };
  }
};
