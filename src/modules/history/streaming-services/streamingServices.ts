import { NetflixPage } from './netflix/NetflixPage';
import { NrkPage } from "./nrk/NrkPage";

const streamingServices = [
  {
    id: 'netflix',
    name: 'Netflix',
    path: '/netflix',
    page: NetflixPage,
  },
  {
    id: 'nrk',
    name: 'NRK',
    path: '/nrk',
    page: NrkPage,
  },
];

export { streamingServices };
