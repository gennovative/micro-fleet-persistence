import { constants } from '@micro-fleet/common';
const { DbClient } = constants;

export default {
	clientName: DbClient.POSTGRESQL,
	host: {
		address: 'localhost',
		user: 'postgres',
		password: 'postgres',
		database: 'unittest-persistence'
	}
};