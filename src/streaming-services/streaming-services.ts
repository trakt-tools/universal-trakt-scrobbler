export interface StreamingService {
	id: string;
	name: string;
	homePage: string;
	hostPatterns: string[];
	hasScrobbler: boolean;
	hasSync: boolean;
	hasAutoSync: boolean;
}

export const streamingServices: Record<string, StreamingService> = {
	// This will be automatically filled by Webpack during build
};
