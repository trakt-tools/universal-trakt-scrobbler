import { NetflixPage } from './netflix/NetflixPage';

const streamingServices = [
  {
    id: 'netflix',
    name: 'Netflix',
    path: '/netflix',
    page: NetflixPage,
  },
];

export { streamingServices };