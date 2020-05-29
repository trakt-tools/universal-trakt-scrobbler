import { NetflixPage } from './netflix/NetflixPage';
import { NrkPage } from "./nrk/NrkPage";
import { TV2SumoPage } from "./tv2sumo/TV2SumoPage";
import { ViaplayPage } from './viaplay/ViaplayPage';

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
    id: 'viaplay',
    name: 'Viaplay',
    path: '/viaplay',
    page: ViaplayPage,
  },
  {
    id: 'sumo',
    name: 'TV 2 Sumo',
    path: '/tv2sumo',
    page: TV2SumoPage,
  },
];

export { streamingServices };
