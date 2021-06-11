import { registerScrobbleEvents } from '../common/common';
import { ScrobbleEvents } from '../common/ScrobbleEvents';
import { AmazonPrimeParser } from './AmazonPrimeParser';

class _AmazonPrimeEvents extends ScrobbleEvents {
	constructor() {
		super(AmazonPrimeParser);
	}
}

export const AmazonPrimeEvents = new _AmazonPrimeEvents();

registerScrobbleEvents('amazon-prime', AmazonPrimeEvents);
