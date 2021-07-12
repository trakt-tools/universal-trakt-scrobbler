import { Session } from '@common/Session';

const init = async () => {
	await Session.finishLogin();
};

void init();
