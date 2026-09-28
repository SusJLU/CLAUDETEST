export type Lang = 'nl' | 'en';
export type Group = 'beef' | 'lamb' | 'poultry' | 'game' | 'pork' | 'duck' | 'other';
export type Priority = 'hot' | 'warm' | 'cold';
export type AttachmentType = 'card' | 'photo' | 'voice' | 'page'; // page = photo of handwritten notes
export type TabId = 'today' | 'notes' | 'follow' | 'summary';

export interface Note {
  id: string;
  company: string;
  country: string;
  hall: string;
  stand: string;
  contact: string;
  role: string;
  groups: Group[]; // one or more product groups
  otherGroup: string; // free text when groups includes 'other'
  priority: Priority;
  day: number; // 0–4 → 17–21 Oct 2026
  time: string; // HH:MM
  createdBy: string; // user initials
  text: string;
  price: string;
  meetingId: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  syncedAt: string | null; // reserved for future server sync
}

export interface Task {
  id: string;
  noteId: string;
  text: string;
  owner: string;
  dueDate: string; // YYYY-MM-DD
  done: boolean;
  createdAt: string;
}

export interface Meeting {
  id: string;
  day: number;
  time: string;
  company: string;
  stand: string;
  contact: string;
  noteId: string | null;
  createdAt: string;
}

export interface Attachment {
  id: string;
  noteId: string;
  type: AttachmentType;
  uri: string; // file:// inside the app's document directory
  durationSec: number | null;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
}

export interface Settings {
  lang: Lang;
  showPrices: boolean;
  me: string; // initials of the person using this phone
}

export interface ExportLog {
  [day: number]: string; // HH:MM of last export per day
}
