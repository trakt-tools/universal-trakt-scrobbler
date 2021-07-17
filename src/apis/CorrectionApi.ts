import { BrowserStorage } from '@common/BrowserStorage';
import { Messaging } from '@common/Messaging';
import { Requests } from '@common/Requests';
import { Shared } from '@common/Shared';
import { Item } from '@models/Item';

export interface Suggestion {
	type: 'episode' | 'movie';
	id: number;
	title: string;

	/**
	 * How many submissions the suggestion had.
	 *
	 * A high count indicates that the suggestion is probably correct.
	 */
	count: number;
}

export interface SuggestionsDatabaseResponse {
	result: Partial<Record<string, Suggestion[]>>;
}

class _CorrectionApi {
	readonly DATABASE_URL = `${Shared.DATABASE_URL}/correction`;
	readonly SUGGESTIONS_DATABASE_URL = `${this.DATABASE_URL}/suggestions`;

	/**
	 * Returns a Trakt URL for a suggestion.
	 */
	getSuggestionUrl(suggestion: Suggestion) {
		return `https://trakt.tv/${suggestion.type}s/${suggestion.id.toString()}`;
	}

	/**
	 * Loads suggestions for items from the database.
	 *
	 * If all suggestions have already been loaded, returns the same parameter array, otherwise returns a new array for immutability.
	 */
	async loadSuggestions(items: Item[]): Promise<Item[]> {
		if (!BrowserStorage.options.sendReceiveSuggestions) {
			return items;
		}
		const hasLoadedSuggestions = !items.some((item) => typeof item.suggestions === 'undefined');
		if (hasLoadedSuggestions) {
			return items;
		}
		const newItems = items.map((item) => item.clone());
		const cache = await Messaging.toBackground({
			action: 'get-cache',
			key: 'suggestions',
		});
		try {
			const itemsToFetch: Item[] = [];
			for (const item of newItems) {
				if (typeof item.suggestions !== 'undefined') {
					continue;
				}
				const databaseId = item.getDatabaseId();
				const suggestions = cache[databaseId];
				if (typeof suggestions !== 'undefined') {
					item.suggestions = suggestions;
				} else {
					itemsToFetch.push(item);
				}
			}
			if (itemsToFetch.length > 0) {
				try {
					const databaseIds = itemsToFetch.map((item) => item.getDatabaseId()).join(',');
					const response = await Requests.send({
						method: 'GET',
						url: `${this.SUGGESTIONS_DATABASE_URL}?ids=${databaseIds}`,
					});
					const json = JSON.parse(response) as SuggestionsDatabaseResponse;
					for (const item of itemsToFetch) {
						const databaseId = item.getDatabaseId();
						const suggestions = json.result[databaseId];
						item.suggestions = suggestions?.sort((a, b) => {
							if (a.count > b.count) {
								return -1;
							}
							if (b.count > a.count) {
								return 1;
							}
							return 0;
						});
					}
				} catch (err) {
					// Do nothing
				}
			}
		} catch (err) {
			// Do nothing
		}
		// Set all undefined suggestions to `null` so that we don't try to load them again
		for (const item of newItems) {
			const databaseId = item.getDatabaseId();
			item.suggestions = item.suggestions || null;
			cache[databaseId] = item.suggestions;
		}
		await Messaging.toBackground({
			action: 'set-cache',
			key: 'suggestions',
			value: cache,
		});
		return newItems;
	}

	/**
	 * Saves a suggestion for an item in the database.
	 */
	async saveSuggestion(item: Item, suggestion: Suggestion): Promise<void> {
		if (!BrowserStorage.options.sendReceiveSuggestions) {
			return;
		}
		await Requests.send({
			method: 'PUT',
			url: this.SUGGESTIONS_DATABASE_URL,
			body: {
				corrections: [
					{
						id: item.getDatabaseId(),
						suggestions: [
							{
								...suggestion,
								count: 1,
							},
						],
					},
				],
			},
		});
	}
}

export const CorrectionApi = new _CorrectionApi();