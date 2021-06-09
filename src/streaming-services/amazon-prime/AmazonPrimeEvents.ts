import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { AmazonPrimeParser } from './AmazonPrimeParser';

class _AmazonPrimeEvents extends ScrobbleEvents {
	constructor() {
		super(AmazonPrimeParser);
	}
}

export const AmazonPrimeEvents = new _AmazonPrimeEvents();
