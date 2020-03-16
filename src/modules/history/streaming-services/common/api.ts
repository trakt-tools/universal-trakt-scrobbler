export interface Api {
  loadHistory(nextPage: number, nextVisualPage: number, itemsToLoad: number): Promise<void>
}