import * as chai from 'chai'
import * as spies from 'chai-spies'

import { IConfigurationProvider, constants, CriticalException,
    Maybe } from '@micro-fleet/common'

import { IDatabaseConnector, QueryCallback, DbConnectionDetail,
    ORMModelBase, DatabaseAddOn, AtomicSession, KnexConnection } from '../app'
import DB_DETAILS from './database-details'


chai.use(spies)

const { DbClient, Database: D } = constants
const expect = chai.expect,
    MODE_FILE = 'file',
    MODE_STRING = 'string',
    MODE_CREDENTIALS = 'credentials',
    CONN_FILE = `${process.cwd()}/database-addon-test.sqlite`,
    CONN_STRING = 'msql://localhost@user:pass'

class MockConfigAddOn implements IConfigurationProvider {

    public readonly name: string = 'MockConfigProvider'
    public configFilePath: string

    constructor(private _mode: string = MODE_CREDENTIALS) {
    }

    get enableRemote(): boolean {
        return true
    }

    public get(key: string): Maybe<number | boolean | string> {
        if (MODE_FILE == this._mode) {
            switch (key) {
                case D.DB_ENGINE: return Maybe.Just(DbClient.SQLITE3)
                case D.DB_FILE: return Maybe.Just(CONN_FILE)
                default: return Maybe.Nothing()
            }
        } else if (MODE_STRING == this._mode) {
            switch (key) {
                case D.DB_ENGINE: return Maybe.Just(DbClient.POSTGRESQL)
                case D.DB_CONN_STRING: return Maybe.Just(CONN_STRING)
                default: return Maybe.Nothing()
            }
        } else if (MODE_CREDENTIALS  == this._mode) {
            switch (key) {
                case D.DB_ENGINE: return Maybe.Just(DB_DETAILS.clientName)
                case D.DB_HOST: return Maybe.Just(DB_DETAILS.host.address)
                case D.DB_USER: return Maybe.Just(DB_DETAILS.host.user)
                case D.DB_PASSWORD: return Maybe.Just(DB_DETAILS.host.password)
                case D.DB_NAME: return Maybe.Just(DB_DETAILS.host.database)
                default: return Maybe.Nothing()
            }
        }
        return Maybe.Nothing()
    }

    public deadLetter(): Promise<void> {
        return Promise.resolve()
    }

    public fetch(): Promise<boolean> {
        return Promise.resolve(true)
    }

    public init(): Promise<void> {
        return Promise.resolve()
    }

    public dispose(): Promise<void> {
        return Promise.resolve()
    }

    public onUpdate(listener: (delta: string[]) => void) {
        // Empty
    }
}

class MockDbConnector implements IDatabaseConnector {
    private _connection: KnexConnection

    public get connection(): KnexConnection {
        return this._connection
    }

    public init(detail: DbConnectionDetail): this {
        return this
    }

    public dispose(): Promise<void> {
        return Promise.resolve()
    }

    public prepare<TORM extends ORMModelBase>(EntityClass: any, callback: QueryCallback<TORM>,
            atomicSession?: AtomicSession): Promise<any> {
        return Promise.resolve()
    }
}

describe('DatabaseAddOn', function () {
    // this.timeout(60000)

    describe('init', () => {
        it('should call connector.init to configure database connection with database file', async () => {
            // Arrange
            // const dbAddOn = new DatabaseAddOn(new MockConfigAddOn(MODE_FILE), new MockDbConnector())
            const connector = new MockDbConnector()
            const addConnSpy = chai.spy.on(connector, 'init')
            const dbAddOn = new DatabaseAddOn(
                new MockConfigAddOn(MODE_FILE),
                connector,
            )

            // Act
            await dbAddOn.init()

            // Assert
            expect(addConnSpy).to.be.spy
            expect(addConnSpy).to.have.been.called.once
        })

        it('should call connector.init to configure database connection with connection string', async () => {
            // Arrange
            const connector = new MockDbConnector()
            const addConnSpy = chai.spy.on(connector, 'init')
            const dbAddOn = new DatabaseAddOn(
                new MockConfigAddOn(MODE_STRING),
                connector,
            )

            // Act
            await dbAddOn.init()

            // Assert
            expect(addConnSpy).to.be.spy
            expect(addConnSpy).to.have.been.called.once
        })

        it('should call connector.init to configure database connection with remote database', async () => {
            // Arrange
            const connector = new MockDbConnector()
            const addConnSpy = chai.spy.on(connector, 'init')
            const dbAddOn = new DatabaseAddOn(
                new MockConfigAddOn(MODE_CREDENTIALS),
                connector,
            )

            // Act
            await dbAddOn.init()

            // Assert
            expect(addConnSpy).to.be.spy
            expect(addConnSpy).to.have.been.called.once
        })

        it('should throw exception if there is no settings for database connection', async () => {
            // Arrange
            const connector = new MockDbConnector()
            const dbAddOn = new DatabaseAddOn(
                new MockConfigAddOn(''),
                connector,
            )

            let isSuccess = false
            let exception: CriticalException = null

            // Act
            try {
                await dbAddOn.init()
                isSuccess = true
            } catch (ex) {
                exception = ex
            }

            // Assert
            expect(isSuccess).to.be.false
            expect(exception).to.exist
            expect(exception).to.be.instanceOf(CriticalException)
            expect(exception.message).to.equal('No database settings!')
        })
    }) // describe 'init'

    describe('dispose', () => {
        it('should release all resources', async () => {
            // Arrange
            const callMe = chai.spy()
            const dbAddOn = new DatabaseAddOn(
                new MockConfigAddOn(MODE_FILE),
                new MockDbConnector(),
            )

            // Act
            await dbAddOn.init()
            await dbAddOn.dispose()

            // Assert
            // tslint:disable-next-line:prefer-const
            for ( let key in dbAddOn) {
                if ('name' === key) { continue }
                callMe()
                expect(dbAddOn[key], key).to.be.null
            }
            expect(callMe).to.be.called
        })
    }) // describe 'dispose'
})
