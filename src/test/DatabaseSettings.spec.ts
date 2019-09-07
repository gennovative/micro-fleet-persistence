import { expect } from 'chai'

import { Maybe, constants } from '@micro-fleet/common'

import { DbConnectionDetail, DatabaseSettings } from '../app'

const { Database: D, DbClient } = constants

describe('DatabaseSettings', () => {
    describe('constructor', () => {
        it('Should create an instance with no setting', () => {
            // Act
            const target = new DatabaseSettings()

            // Assert
            expect(Number.isInteger(target.length)).to.be.true
            expect(target.length).to.equal(0)
        })
    })

    describe('fromConnectionDetail', () => {
        it('Should parse host details', () => {
            // Arrange
            const detail: DbConnectionDetail = {
                    clientName: DbClient.POSTGRESQL,
                    host: {
                        address: 'remotehost',
                        user: 'root',
                        password: 'secret',
                        database: 'northwind',
                    },
                }

            // Act
            const parseResult: Maybe<DatabaseSettings> = DatabaseSettings.fromConnectionDetail(detail)

            // Assert
            expect(parseResult.isJust).to.be.true

            const settings: DatabaseSettings = parseResult.tryGetValue(null)
            expect(settings.length).to.equal(5)
            expect(settings[0].name).to.equal(D.DB_ENGINE)
            expect(settings[0].value).to.equal(detail.clientName)
            expect(settings[1].name).to.equal(D.DB_HOST)
            expect(settings[1].value).to.equal(detail.host.address)
            expect(settings[2].name).to.equal(D.DB_USER)
            expect(settings[2].value).to.equal(detail.host.user)
            expect(settings[3].name).to.equal(D.DB_PASSWORD)
            expect(settings[3].value).to.equal(detail.host.password)
            expect(settings[4].name).to.equal(D.DB_NAME)
            expect(settings[4].value).to.equal(detail.host.database)
        })

        it('Should parse file path', () => {
            // Arrange
            const detail: DbConnectionDetail = {
                clientName: DbClient.SQLITE3,
                filePath: '/var/data/storage.sqlite3',
            }

            // Act
            const parseResult: Maybe<DatabaseSettings> = DatabaseSettings.fromConnectionDetail(detail)

            // Assert
            expect(parseResult.isJust).to.be.true

            const settings: DatabaseSettings = parseResult.tryGetValue(null)
            expect(settings.length).to.equal(2)
            expect(settings[0].name).to.equal(D.DB_ENGINE)
            expect(settings[0].value).to.equal(detail.clientName)
            expect(settings[1].name).to.equal(D.DB_FILE)
            expect(settings[1].value).to.equal(detail.filePath)
        })

        it('Should parse connection string', () => {
            // Arrange
            const detail: DbConnectionDetail = {
                    clientName: DbClient.MYSQL,
                    connectionString: 'mysql://user@pass',
                }

            // Act
            const parseResult: Maybe<DatabaseSettings> = DatabaseSettings.fromConnectionDetail(detail)

            // Assert
            expect(parseResult.isJust).to.be.true

            const settings: DatabaseSettings = parseResult.tryGetValue(null)
            expect(settings.length).to.equal(2)
            expect(settings[0].name).to.equal(D.DB_ENGINE)
            expect(settings[0].value).to.equal(detail.clientName)
            expect(settings[1].name).to.equal(D.DB_CONN_STRING)
            expect(settings[1].value).to.equal(detail.connectionString)
        })

        it('Should return empty result if engine name is not specified', () => {
            // Arrange
            const detail: DbConnectionDetail = {
                    clientName: DbClient.MYSQL,
                    connectionString: 'mysql://user@pass',
                }
            delete detail.clientName

            // Act
            const parseResult: Maybe<DatabaseSettings> = DatabaseSettings.fromConnectionDetail(detail)

            // Assert
            expect(parseResult.isJust).to.be.false
        })

        it('Should return empty result if no connection option is specified', () => {
            // Arrange
            const detail: DbConnectionDetail = {
                    clientName: DbClient.MYSQL,
                }

            // Act
            const parseResult: Maybe<DatabaseSettings> = DatabaseSettings.fromConnectionDetail(detail)

            // Assert
            expect(parseResult.isJust).to.be.false
        })
    }) // END describe 'fromConnectionDetail'
})
