export interface CustomField {
  name: string;
  value: string;
}

export interface UserProfile {
  discordId: string;
  displayName: string;
  iconUrl?: string;
  bio?: string;
  urls: string[];
  customFields: CustomField[];
  lastUpdated: Date;
  themeColor: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
}

export type ProfileCommandType = 'set' | 'update' | 'field' | 'show';
export type FieldCommandType = 'add' | 'remove' | 'edit' | 'list'; 