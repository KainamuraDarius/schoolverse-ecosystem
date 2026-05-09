/**
 * Undo/Redo Manager for Whiteboard
 * Manages history of whiteboard operations
 */

export interface HistoryState<T> {
  state: T;
  timestamp: number;
}

export class UndoRedoManager<T> {
  private history: HistoryState<T>[] = [];
  private currentIndex: number = -1;
  private maxStates: number = 50;

  constructor(initialState: T, maxStates: number = 50) {
    this.maxStates = maxStates;
    this.push(initialState);
  }

  /**
   * Push a new state to the history
   */
  push(state: T): void {
    // Remove any states after the current index (for redo after undo)
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new state
    this.history.push({
      state: JSON.parse(JSON.stringify(state)),
      timestamp: Date.now(),
    });

    // Limit history size
    if (this.history.length > this.maxStates) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  /**
   * Undo to the previous state
   */
  undo(): T | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex].state;
    }
    return null;
  }

  /**
   * Redo to the next state
   */
  redo(): T | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex].state;
    }
    return null;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current state
   */
  getCurrentState(): T {
    return this.history[this.currentIndex].state;
  }

  /**
   * Clear history
   */
  clear(initialState: T): void {
    this.history = [
      {
        state: JSON.parse(JSON.stringify(initialState)),
        timestamp: Date.now(),
      },
    ];
    this.currentIndex = 0;
  }

  /**
   * Get history size
   */
  getHistorySize(): number {
    return this.history.length;
  }

  /**
   * Get current index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }
}
