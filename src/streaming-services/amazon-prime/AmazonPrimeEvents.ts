import { AmazonPrimeParser } from '@/amazon-prime/AmazonPrimeParser';
import { ScrobbleEvents } from '@common/ScrobbleEvents';

class _AmazonPrimeEvents extends ScrobbleEvents {
	constructor() {
		super(AmazonPrimeParser);
	}
}

export const AmazonPrimeEvents = new _AmazonPrimeEvents();
