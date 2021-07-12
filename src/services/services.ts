export interface Service {
	id: string;
	name: string;
	homePage: string;
	hostPatterns: string[];
	hasScrobbler: boolean;
	hasSync: boolean;
	hasAutoSync: boolean;
}

export const services: Record<string, Service> = {
	// This will be automatically filled by Webpack during build
};
