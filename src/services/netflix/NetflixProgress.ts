/**
 * The configured completion threshold can be 0, so unknown progress cannot use 0 as a fallback.
 * A negative value remains hidden and unselectable in both manual and automatic history sync.
 */
export const UNKNOWN_NETFLIX_PROGRESS = -1;

export interface NetflixHistoryProgress {
	bookmark?: number;
	duration?: number;
}

export interface NetflixPlaybackMetadata {
	bookmark?: {
		offset?: number | null;
	} | null;
	runtime?: number | null;
}

export const calculateNetflixProgress = (
	bookmark: number | null | undefined,
	duration: number | null | undefined
): number | undefined => {
	if (
		typeof bookmark !== 'number' ||
		!Number.isFinite(bookmark) ||
		typeof duration !== 'number' ||
		!Number.isFinite(duration) ||
		duration <= 0
	) {
		return;
	}

	const progress = Math.min(100, Math.max(0, (bookmark / duration) * 100));

	// Item values are stored with two decimal places. Floor to that precision so rounding cannot
	// promote a value just below the user's completion threshold to the threshold itself.
	return Math.floor(progress * 100) / 100;
};

export const getNetflixHistoryProgress = (
	bookmark: number | null | undefined,
	duration: number | null | undefined
): number => calculateNetflixProgress(bookmark, duration) ?? UNKNOWN_NETFLIX_PROGRESS;

export const mergeNetflixHistoryProgress = (
	historyProgress: NetflixHistoryProgress,
	metadata: NetflixPlaybackMetadata
): NetflixHistoryProgress => {
	const bookmark = metadata.bookmark?.offset;
	const duration = metadata.runtime;
	if (
		typeof bookmark === 'number' &&
		typeof duration === 'number' &&
		calculateNetflixProgress(bookmark, duration) !== undefined
	) {
		return { bookmark, duration };
	}
	return {
		bookmark: historyProgress.bookmark,
		duration: historyProgress.duration,
	};
};
