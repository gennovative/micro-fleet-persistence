import { DbClient } from '../app';

export default {
	clientName: DbClient.POSTGRESQL,
	host: {
		address: 'localhost',
		user: 'postgres',
		password: 'postgres',
		database: 'unittest'
	}
};