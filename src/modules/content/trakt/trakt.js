import { Session } from '../../../services/Session';

init();

async function init() {
  await Session.finishLogin();
}