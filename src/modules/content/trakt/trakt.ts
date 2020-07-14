import { Session } from '../../../services/Session';

const init = async () => {
	await Session.finishLogin();
};

void init();
