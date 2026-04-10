export interface KernelEvent<T> {
  subscribe(callback: (data: T) => void): () => void;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FindOpts {
  forward?: boolean;
  matchCase?: boolean;
}

export interface FindResult {
  matches: number;
  activeMatch: number;
}

export interface Suggestion {
  type: 'history' | 'bookmark' | 'tab' | 'search';
  title: string;
  url: string;
  relevance: number;
}

export interface SecurityInfo {
  protocol: 'https' | 'http' | 'file' | 'other';
  certificate?: { issuer: string; validTo: Date };
  isSecure: boolean;
}
