import * as chai from 'chai';
import * as spies from 'chai-spies';
import * as _ from 'lodash';

import { IConfigurationProvider, DbConnectionDetail, 
	constants, CriticalException, Maybe } from '@micro-fleet/common';
import { IDatabaseConnector, QueryCallback,
	EntityBase, DatabaseAddOn, AtomicSession, KnexConnection } from '../app';

import DB_DETAILS from './database-details';

chai.use(spies);

const { DbClient, DbSettingKeys: S } = constants;
const expect = chai.expect,
	MODE_FILE = 'file',
	MODE_STRING = 'string',
	MODE_CREDENTIALS = 'credentials',
	CONN_FILE = `${process.cwd()}/database-addon-test.sqlite`,
	CONN_STRING = 'msql://localhost@user:pass';

class MockConfigAddOn implements IConfigurationProvider {
	
	public readonly name: string = 'MockConfigProvider';

	constructor(private _mode: string = MODE_CREDENTIALS) {
	}

	get enableRemote(): boolean {
		return true;
	}

	public get(key: string): Maybe<number | boolean | string> {
		if (MODE_FILE == this._mode) {
			switch (key) {
				case S.DB_ENGINE: return new Maybe(DbClient.SQLITE3);
				case S.DB_FILE: return new Maybe(CONN_FILE);
				default: return new Maybe;
			}
		} else if (MODE_STRING == this._mode) {
			switch (key) {
				case S.DB_ENGINE: return new Maybe(DbClient.POSTGRESQL);
				case S.DB_CONN_STRING: return new Maybe(CONN_STRING);
				default: return new Maybe;
			}
		} else if (MODE_CREDENTIALS  == this._mode) {
			switch (key) {
				case S.DB_ENGINE: return new Maybe(DB_DETAILS.clientName);
				case S.DB_ADDRESS: return new Maybe(DB_DETAILS.host.address);
				case S.DB_USER: return new Maybe(DB_DETAILS.host.user);
				case S.DB_PASSWORD: return new Maybe(DB_DETAILS.host.password);
				case S.DB_NAME: return new Maybe(DB_DETAILS.host.database);
				default: return new Maybe;
			}
		}
		return new Maybe;
	}

	public deadLetter(): Promise<void> {
		return Promise.resolve();
	}

	public fetch(): Promise<boolean> {
		return Promise.resolve(true);
	}

	public init(): Promise<void> {
		return Promise.resolve();
	}

	public dispose(): Promise<void> {
		return Promise.resolve();
	}

	public onUpdate(listener: (delta: string[]) => void) {
	}
}

class MockDbConnector implements IDatabaseConnector {
	private _connection: KnexConnection;

	public get connection(): KnexConnection {
		return this._connection;
	}

	public init(detail: DbConnectionDetail): void {
	}

	public dispose(): Promise<void> {
		return Promise.resolve();
	}

	public prepare<TEntity extends EntityBase>(EntityClass: any, callback: QueryCallback<TEntity>, atomicSession?: AtomicSession): Promise<any> {
		return Promise.resolve();
	}
}

describe('DatabaseAddOn', function () {
	// this.timeout(60000);

	describe('init', () => {
		it('should call connector.init to configure database connection with database file', async () => {
			// Arrange
			const dbAddOn = new DatabaseAddOn(new MockConfigAddOn(MODE_FILE), new MockDbConnector());
			const addConnSpy = chai.spy.on(dbAddOn['_dbConnector'], 'init');
			
			// Act
			await dbAddOn.init();

			// Assert
			expect(addConnSpy).to.be.spy;
			expect(addConnSpy).to.have.been.called.once;
		});

		it('should call connector.init to configure database connection with connection string', async () => {
			// Arrange
			let dbAddOn = new DatabaseAddOn(new MockConfigAddOn(MODE_STRING), new MockDbConnector()),
				addConnSpy = chai.spy.on(dbAddOn['_dbConnector'], 'init');
			
			// Act
			await dbAddOn.init();

			// Assert
			expect(addConnSpy).to.be.spy;
			expect(addConnSpy).to.have.been.called.once;
		});

		it('should call connector.init to configure database connection with remote database', async () => {
			// Arrange
			let dbAddOn = new DatabaseAddOn(new MockConfigAddOn(MODE_CREDENTIALS), new MockDbConnector()),
				addConnSpy = chai.spy.on(dbAddOn['_dbConnector'], 'init');
			
			// Act
			await dbAddOn.init();

			// Assert
			expect(addConnSpy).to.be.spy;
			expect(addConnSpy).to.have.been.called.once;
		});

		it('should throw exception if there is no settings for database connection', async () => {
			// Arrange
			let dbAddOn = new DatabaseAddOn(new MockConfigAddOn(''), new MockDbConnector()),
				exception: CriticalException = null,
				isSuccess = false;

			// Act
			try {
				await dbAddOn.init();
				isSuccess = true;
			} catch (ex) {
				exception = ex;
			}

			// Assert
			expect(isSuccess).to.be.false;
			expect(exception).to.exist;
			expect(exception).to.be.instanceOf(CriticalException);
			expect(exception.message).to.equal('No database settings!');
		});
	}); // describe 'init'
	
	describe('dispose', () => {
		it('should release all resources', async () => {
			// Arrange
			let dbAddOn = new DatabaseAddOn(new MockConfigAddOn(MODE_FILE), new MockDbConnector()),
				callMe = chai.spy();

			// Act
			await dbAddOn.init();
			await dbAddOn.dispose();

			// Assert
			_.forOwn(dbAddOn, (value, key) => {
				callMe();
				expect(dbAddOn[key], key).to.be.null;
			});
			expect(callMe).to.be.called;
		});
	}); // describe 'dispose'
});