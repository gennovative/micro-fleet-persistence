import * as chai from 'chai';
import * as spies from 'chai-spies';
import * as _ from 'lodash';
import { MinorException } from 'back-lib-common-util';

import { KnexDatabaseConnector, DbClient, EntityBase } from '../app';
import DB_DETAILS from './database-details';

chai.use(spies);

const expect = chai.expect,
	CONN_FILE = `${process.cwd()}/database-adapter-test.sqlite`,
	CONN_STRING = 'msql://localhost@user:pass',
	DB_TABLE = 'userdata';


class DummyEntity extends EntityBase {
	/**
	 * @override
	 */
	static get tableName(): string {
		return DB_TABLE;
	}
}

describe('KnexDatabaseConnector', () => {

	describe('addConnection', () => {
		it('should configure connection with file name settings', async () => {
			// Arrange
			let dbConnector = new KnexDatabaseConnector(),
				expectedSettings;

			expectedSettings = {
					client: DbClient.SQLITE3,
					useNullAsDefault: true,
					connection: { 
						filename: CONN_FILE
					}
				};

			// Spy on this method, because we need the real function be called.
			dbConnector['_knex'] = chai.spy(() => {
				return {};
			});

			// Act
			dbConnector.addConnection({
				clientName: DbClient.SQLITE3,
				fileName: CONN_FILE
			});

			// Assert
			expect(dbConnector['_knex']).to.be.spy;
			expect(dbConnector['_knex']).to.have.been.called.with(expectedSettings);
		});

		it('should configure connection with connection string', async () => {
			// Arrange
			let dbConnector = new KnexDatabaseConnector(),
				expectedSettings = {
					client: DbClient.POSTGRESQL,
					useNullAsDefault: true,
					connection: CONN_STRING
				};
			dbConnector['_knex'] = chai.spy(() => {
				return {};
			});

			// Act
			dbConnector.addConnection({
				clientName: DbClient.POSTGRESQL,
				connectionString: CONN_STRING
			});

			// Assert
			expect(dbConnector['_knex']).to.be.spy;
			expect(dbConnector['_knex']).to.have.been.called.with(expectedSettings);
		});

		it('should configure connection with host credentials', async () => {
			// Arrange
			let dbConnector = new KnexDatabaseConnector(),
				expectedSettings = {
					client: DB_DETAILS.clientName,
					useNullAsDefault: true,
					connection: {
						host: DB_DETAILS.host.address,
						user: DB_DETAILS.host.user,
						password: DB_DETAILS.host.password,
						database: DB_DETAILS.host.database
					}
				};

			dbConnector['_knex'] = chai.spy(() => {
				return {};
			});

			// Act KnexDatabaseConnector.spec.js
			dbConnector.addConnection(DB_DETAILS);

			// Assert
			expect(dbConnector['_knex']).to.be.spy;
			expect(dbConnector['_knex']).to.have.been.called.with(expectedSettings);
		});

		it('should throw exception if there is no settings for database connection', async () => {
			// Arrange
			let dbConnector = new KnexDatabaseConnector(),
				exception: MinorException = null,
				isSuccess = false;
			dbConnector['_knex'] = chai.spy(() => {
				return {};
			});

			// Act
			try {
				dbConnector.addConnection({
					clientName: DbClient.MSSQL
				});
				isSuccess = true;
			} catch (ex) {
				exception = ex;
			}

			// Assert
			expect(isSuccess).to.be.false;
			expect(exception).to.be.not.null;
			expect(exception).to.be.instanceOf(MinorException);
			expect(exception.message).to.equal('No database settings!');
		});
	}); // END describe 'addConnection'

	describe('dispose', () => {
		it('should release all resources', async () => {
			// Arrange
			let dbConnector = new KnexDatabaseConnector(),
				callMe = chai.spy();

			dbConnector.addConnection({
				clientName: DbClient.SQLITE3,
				fileName: CONN_FILE
			});

			// Act
			await dbConnector.dispose();

			// Assert
			_.forOwn(dbConnector, (value, key) => {
				callMe();
				expect(dbConnector[key], key).to.be.null;
			});
			expect(callMe).to.be.called;
		});
	}); // END describe 'dispose'

	describe('prepare', () => {
		it('should execute query with all connections', async () => {
			// Arrange
			let dbConnector = new KnexDatabaseConnector(),
				callMe = chai.spy();

			dbConnector.addConnection({
				clientName: DbClient.SQLITE3,
				fileName: CONN_FILE
			});

			// dbConnector.addConnection({
			// 	clientName: DbClient.SQLITE3,
			// 	fileName: CONN_FILE
			// });

			dbConnector.addConnection(DB_DETAILS);

			// Act
			await dbConnector.prepare<DummyEntity>(DummyEntity, (query) => {
				callMe();
				return Promise.resolve();
			});

			// Assert
			expect(callMe).to.be.called.twice;
			await dbConnector.dispose();
		});

		it('should execute query with named connections', async () => {
			// Arrange
			let dbConnector = new KnexDatabaseConnector(),
				callMe = chai.spy();

			dbConnector.addConnection({
				clientName: DbClient.SQLITE3,
				fileName: CONN_FILE
			}, 'first');

			// dbConnector.addConnection({
			// 	clientName: DbClient.SQLITE3,
			// 	fileName: CONN_FILE
			// }, 'second');

			dbConnector.addConnection(DB_DETAILS, 'second');

			// Act
			await dbConnector.prepare<DummyEntity>(DummyEntity, (query) => {
				callMe();
				return Promise.resolve();
			}, null, 'first');

			// Assert
			expect(callMe).to.be.called.once;
			await dbConnector.dispose();
		});

		it('should bind entity class with each added knex connection', async () => {
			// Arrange
			let dbConnector = new KnexDatabaseConnector(),
				callMe = chai.spy(),
				oldKnex = DummyEntity.knex(),
				newKnex = null;

			dbConnector.addConnection({
				clientName: DbClient.SQLITE3,
				fileName: CONN_FILE
			});

			// dbConnector.addConnection({
			// 	clientName: DbClient.SQLITE3,
			// 	fileName: CONN_FILE
			// });

			dbConnector.addConnection(DB_DETAILS);

			// Act
			await dbConnector.prepare<DummyEntity>(DummyEntity, (query, BoundDummyEntity) => {
				callMe();
				newKnex = BoundDummyEntity['knex']();
				// Assert
				expect(oldKnex).not.to.equal(newKnex);
				return Promise.resolve();
			});

			// Assert
			expect(callMe).to.be.called.twice;
			await dbConnector.dispose();
		});
	}); // END describe 'prepare'
});