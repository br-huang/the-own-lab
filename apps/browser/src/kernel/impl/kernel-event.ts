import { KernelEvent } from '../interfaces/shared';

export class KernelEventEmitter<T> implements KernelEvent<T> {
  private listeners: Set<(data: T) => void> = new Set();

  subscribe(callback: (data: T) => void): () => void {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  }

  emit(data: T): void {
    for (const listener of this.listeners) {
      listener(data);
    }
  }
}
