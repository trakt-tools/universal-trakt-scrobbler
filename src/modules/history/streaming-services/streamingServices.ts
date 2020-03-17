import { NetflixPage } from './netflix/NetflixPage';
import { NrkPage } from "./nrk/NrkPage";
import { TV2SumoPage } from "./tv2sumo/TV2SumoPage";

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
  {
    id: 'sumo',
    name: 'TV 2 Sumo',
    path: '/tv2sumo',
    page: TV2SumoPage,
  },
];

export { streamingServices };
