export interface ServiceValues {
	id: string;
	name: string;
	homePage: string;
	hostPatterns: ReadonlyArray<string>;
	hasScrobbler: boolean;
	hasSync: boolean;
	hasAutoSync: boolean;
	limitations?: string[];
	/** Page that requires login for sync functionality. Falls back to homePage if not set. */
	loginPage?: string;
}

const services = new Map<string, Service>();

export const registerService = (id: string, service: Service): void => {
	services.set(id, service);
};

export const getService = (id: string): Service => {
	const service = services.get(id);
	if (!service) {
		throw new Error(`Service not registered for ${id}`);
	}
	return service;
};

export const getServices = (): Service[] => {
	return Array.from(services.values());
};

export class Service implements ServiceValues {
	readonly id: string;
	readonly name: string;
	readonly homePage: string;
	readonly hostPatterns: ReadonlyArray<string>;
	readonly hasScrobbler: boolean;
	readonly hasSync: boolean;
	readonly hasAutoSync: boolean;
	readonly limitations: string[];
	readonly loginPage: string;

	constructor(values: ServiceValues) {
		this.id = values.id;
		this.name = values.name;
		this.homePage = values.homePage;
		this.hostPatterns = Object.freeze(values.hostPatterns);
		this.hasScrobbler = values.hasScrobbler;
		this.hasSync = values.hasSync;
		this.hasAutoSync = values.hasAutoSync;
		this.limitations = values.limitations ?? [];
		this.loginPage = values.loginPage ?? values.homePage;

		registerService(this.id, this);
	}

	get path(): string {
		return `/${this.id}`;
	}
}
