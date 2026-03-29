export interface Question {
  id: number;
  question: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  image_url: string | null;
}

export interface AppConfig {
  id: number;
  name: string;
  slug: string;
  supported_locales: string[];
}

export interface ContentCategory {
  id: number;
  name: string;
  slug: string;
}
