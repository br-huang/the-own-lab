import { NavigationManager } from '../interfaces/navigation';
import { Suggestion, SecurityInfo } from '../interfaces/shared';
import { DEFAULT_SEARCH_ENGINE } from '../../shared/constants';

export class ElectronNavigationManager implements NavigationManager {
  async resolveInput(input: string): Promise<{ type: 'url' | 'search'; resolved: string }> {
    const trimmed = input.trim();

    if (/^https?:\/\//i.test(trimmed)) {
      return { type: 'url', resolved: trimmed };
    }
    if (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(\/.*)?$/.test(trimmed)) {
      return { type: 'url', resolved: `https://${trimmed}` };
    }
    if (/^localhost(:\d+)?(\/.*)?$/.test(trimmed)) {
      return { type: 'url', resolved: `http://${trimmed}` };
    }

    return { type: 'search', resolved: `${DEFAULT_SEARCH_ENGINE}${encodeURIComponent(trimmed)}` };
  }

  async getSuggestions(_query: string): Promise<Suggestion[]> {
    return [];
  }

  async getSecurityInfo(_tabId: string): Promise<SecurityInfo> {
    return { protocol: 'https', isSecure: true };
  }
}
