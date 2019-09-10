import * as chai from 'chai'
import * as spies from 'chai-spies'
import { constants, MinorException } from '@micro-fleet/common'

import { KnexDatabaseConnector, ORMModelBase } from '../app'
import DB_DETAILS from './database-details'

chai.use(spies)

const { DbClient } = constants
const expect = chai.expect,
    CONN_FILE = `${process.cwd()}/database-adapter-test.sqlite`,
    CONN_STRING = 'msql://localhost@user:pass',
    DB_TABLE = 'unittestOne.userdata'


class DummyEntity extends ORMModelBase {
    /**
     * @override
     */
    static get tableName(): string {
        return DB_TABLE
    }
}

describe('KnexDatabaseConnector', function () {
    // tslint:disable-next-line:no-invalid-this
    this.timeout(5000)
    // this.timeout(60000) // For debugging

    describe('init', () => {
        it('should configure connection with file name settings', () => {
            // Arrange
            const dbConnector = new KnexDatabaseConnector()
            const expectedSettings = {
                    client: DbClient.SQLITE3,
                    useNullAsDefault: true,
                    connection: {
                        filename: CONN_FILE,
                    },
                }

            // Spy on this method, because we need the real function be called.
            dbConnector['_knex'] = <any>chai.spy((settings: any) => {
                expect(settings.client).to.equal(expectedSettings.client)
                expect(settings.useNullAsDefault).to.equal(expectedSettings.useNullAsDefault)
                expect(settings.connection.filename).to.equal(expectedSettings.connection.filename)
                return {}
            })

            // Act
            dbConnector.init({
                clientName: DbClient.SQLITE3,
                filePath: CONN_FILE,
            })

            // Assert
            expect(dbConnector['_knex']).to.be.spy
            expect(dbConnector['_knex']).to.have.been.called.once
        })

        it('should configure connection with connection string', () => {
            // Arrange
            const dbConnector = new KnexDatabaseConnector()
            const expectedSettings = {
                    client: DbClient.POSTGRESQL,
                    useNullAsDefault: true,
                    connection: CONN_STRING,
                }
            dbConnector['_knex'] = <any>chai.spy((settings: any) => {
                expect(settings.client).to.equal(expectedSettings.client)
                expect(settings.useNullAsDefault).to.equal(expectedSettings.useNullAsDefault)
                expect(settings.connection).to.equal(expectedSettings.connection)
                return {}
            })

            // Act
            dbConnector.init({
                clientName: DbClient.POSTGRESQL,
                connectionString: CONN_STRING,
            })

            // Assert
            expect(dbConnector['_knex']).to.be.spy
            expect(dbConnector['_knex']).to.have.been.called.once
        })

        it('should configure connection with host credentials', () => {
            // Arrange
            const dbConnector = new KnexDatabaseConnector(),
                expectedSettings = {
                    client: DB_DETAILS.clientName,
                    useNullAsDefault: true,
                    connection: {
                        host: DB_DETAILS.host.address,
                        user: DB_DETAILS.host.user,
                        password: DB_DETAILS.host.password,
                        database: DB_DETAILS.host.database,
                    },
                }

            dbConnector['_knex'] = <any>chai.spy((settings: any) => {
                expect(settings.client).to.equal(expectedSettings.client)
                expect(settings.useNullAsDefault).to.equal(expectedSettings.useNullAsDefault)
                expect(settings.connection.host).to.equal(expectedSettings.connection.host)
                expect(settings.connection.user).to.equal(expectedSettings.connection.user)
                expect(settings.connection.password).to.equal(expectedSettings.connection.password)
                expect(settings.connection.database).to.equal(expectedSettings.connection.database)
                return {}
            })

            // Act KnexDatabaseConnector.spec.js
            dbConnector.init(DB_DETAILS)

            // Assert
            expect(dbConnector['_knex']).to.be.spy
            expect(dbConnector['_knex']).to.have.been.called.once
        })

        it('should throw exception if there is no settings for database connection', () => {
            // Arrange
            const dbConnector = new KnexDatabaseConnector()
            let exception: MinorException = null,
                isSuccess = false
            dbConnector['_knex'] = <any>chai.spy(() => {
                return {}
            })

            // Act
            try {
                dbConnector.init({
                    clientName: DbClient.MSSQL,
                })
                isSuccess = true
            } catch (ex) {
                exception = ex
            }

            // Assert
            expect(isSuccess).to.be.false
            expect(exception).to.be.not.null
            expect(exception).to.be.instanceOf(MinorException)
            expect(exception.message).to.equal('No database settings!')
        })
    }) // END describe 'init'

    describe('dispose', () => {
        it('should release all resources', async () => {
            // Arrange
            const dbConnector = new KnexDatabaseConnector()
            const callMe = chai.spy()

            dbConnector.init({
                clientName: DbClient.SQLITE3,
                filePath: CONN_FILE,
            })

            // Act
            await dbConnector.dispose()

            // Assert
            // tslint:disable-next-line:prefer-const
            for (let key in dbConnector) {
                callMe()
                expect(dbConnector[key], key).to.be.null
            }
            expect(callMe).to.be.called
        })
    }) // END describe 'dispose'

    describe('prepare', () => {
        it('should execute query with established connection', async () => {
            // Arrange
            const dbConnector = new KnexDatabaseConnector()
            const callMe = chai.spy()

            dbConnector.init(DB_DETAILS)

            // Act
            await dbConnector.prepare<DummyEntity>(DummyEntity, (query) => {
                callMe()
                return <any>Promise.resolve()
            })

            // Assert
            expect(callMe).to.be.called.once
            await dbConnector.dispose()
        })

        it('should bind entity class with each added knex connection', async () => {
            // Arrange
            const dbConnector = new KnexDatabaseConnector(),
                callMe = chai.spy(),
                oldKnex = DummyEntity.knex()
            let newKnex = null

            dbConnector.init(DB_DETAILS)

            // Act
            await dbConnector.prepare<DummyEntity>(DummyEntity, (query, BoundDummyEntity) => {
                callMe()
                newKnex = BoundDummyEntity['knex']()
                // Assert
                expect(oldKnex).not.to.equal(newKnex)
                return <any>Promise.resolve()
            })

            // Assert
            expect(callMe).to.be.called.once
            await dbConnector.dispose()
        })
    }) // END describe 'prepare'
})
