import * as chai from 'chai';
import * as spies from 'chai-spies';
import * as _ from 'lodash';

import { KnexDatabaseConnector, DbClient, EntityBase } from '../app';

chai.use(spies);

const expect = chai.expect,
	CONN_HOST = 'localhost',
	CONN_USER = 'dbUser',
	CONN_PASS = 'secret',
	CONN_DB = 'randomDb',
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
					client: DbClient.POSTGRESQL,
					useNullAsDefault: true,
					connection: {
						host: CONN_HOST,
						user: CONN_USER,
						password: CONN_PASS,
						database: CONN_DB,
					}
				};
			dbConnector['_knex'] = chai.spy(() => {
				return {};
			});

			// Act
			dbConnector.addConnection({
				clientName: DbClient.POSTGRESQL,
				host: {
					address: CONN_HOST,
					user: CONN_USER,
					password: CONN_PASS,
					database: CONN_DB
				}
			});

			// Assert
			expect(dbConnector['_knex']).to.be.spy;
			expect(dbConnector['_knex']).to.have.been.called.with(expectedSettings);
		});
		
		it('should throw exception if there is no settings for database connection', async () => {
			// Arrange
			let dbConnector = new KnexDatabaseConnector(),
				exception = null,
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
			expect(exception).to.equal('No database settings!');
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

			dbConnector.addConnection({
				clientName: DbClient.SQLITE3,
				fileName: CONN_FILE
			});

			// dbConnector.addConnection({
			// 	clientName: DbClient.POSTGRESQL,
			// 	connectionString: CONN_STRING
			// });

			// Act
			await dbConnector.prepare<DummyEntity>(DummyEntity, (query) => {
				callMe();
				return Promise.resolve();
			});

			// Assert
			expect(callMe).to.be.called;
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

			dbConnector.addConnection({
				clientName: DbClient.POSTGRESQL,
				connectionString: CONN_STRING
			}, 'second');

			// Act
			await dbConnector.prepare<DummyEntity>(DummyEntity, (query) => {
				callMe();
				return Promise.resolve();
			}, 'first');

			// Assert
			expect(callMe).to.be.called.once;
			await dbConnector.dispose();
		});
		
		it('should bind entity class with new knex connection', async () => {
			// Arrange
			let dbConnector = new KnexDatabaseConnector(),
				callMe = chai.spy(),
				oldKnex = DummyEntity.knex(),
				newKnex = null;

			dbConnector.addConnection({
				clientName: DbClient.SQLITE3,
				fileName: CONN_FILE
			});

			dbConnector.addConnection({
				clientName: DbClient.SQLITE3,
				fileName: CONN_FILE
			});

			// dbConnector.addConnection({
			// 	clientName: DbClient.POSTGRESQL,
			// 	connectionString: CONN_STRING
			// });

			// Act
			await dbConnector.prepare<DummyEntity>(DummyEntity, (query, BoundDummyEntity) => {
				callMe();
				newKnex = BoundDummyEntity['knex']();
				return Promise.resolve();
			});

			// Assert
			expect(callMe).to.be.called;
			expect(oldKnex).not.to.equal(newKnex);
			await dbConnector.dispose();
		});
	}); // END describe 'prepare'
});