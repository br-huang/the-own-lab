import { Suggestion, SecurityInfo } from './shared';

export interface NavigationManager {
  resolveInput(input: string): Promise<{ type: 'url' | 'search'; resolved: string }>;
  getSuggestions(query: string): Promise<Suggestion[]>;
  getSecurityInfo(tabId: string): Promise<SecurityInfo>;
}
