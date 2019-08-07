import * as knex from 'knex'
import { knexSnakeCaseMappers } from 'objection'
import { injectable, Guard, MinorException, constants as CmC, Newable } from '@micro-fleet/common'

import { AtomicSession } from '../atom/AtomicSession'
import { ORMModelBase } from '../bases/ORMModelBase'
import { DbConnectionDetail } from '../interfaces'
import { IDatabaseConnector, QueryCallback, KnexConnection } from './IDatabaseConnector'

/**
 * Provides settings from package
 */
@injectable()
export class KnexDatabaseConnector implements IDatabaseConnector {

    private _connection: KnexConnection
    private _knex: typeof knex // for unittest mocking

    constructor() {
        this._knex = knex
    }

    /**
     * @see IDatabaseConnector.connection
     */
    public get connection(): KnexConnection {
        return this._connection
    }

    /**
     * @see IDatabaseConnector.init
     */
    public init(detail: DbConnectionDetail): this {
        Guard.assertArgDefined('detail', detail)

        const settings = {
                client: detail.clientName,
                useNullAsDefault: true,
                connection: this._buildConnSettings(detail),
                ...knexSnakeCaseMappers(),
            }

        if (detail.clientName === CmC.DbClient.POSTGRESQL) {
            require('../pg-type-parsers')
        }
        this._connection = this._knex(settings)
        return this
    }

    /**
     * @see IDatabaseConnector.dispose
     */
    public async dispose(): Promise<void> {
        this._connection.destroy()
        this._connection = null
        this._knex = null
    }

    /**
     * @see IDatabaseConnector.prepare
     */
    public prepare<TORM extends ORMModelBase>(ORMClass: Newable, callback: QueryCallback<TORM>,
            atomicSession?: AtomicSession): Promise<any> {
        Guard.assertIsNotEmpty(this._connection, 'Must call addConnection() before executing any query.')
        if (atomicSession) {
            return this._prepareTransactionalQuery(ORMClass, callback, atomicSession)
        }
        return this._prepareSimpleQuery(ORMClass, callback)
    }


    private _buildConnSettings(detail: DbConnectionDetail): any {
        // 1st priority: connect to a local file.
        if (detail.filePath) {
            return { filename: detail.filePath }
        }

        // 2nd priority: connect with a connection string.
        if (detail.connectionString) {
            return detail.connectionString
        }

        // Last priority: connect with host credentials.
        if (detail.host) {
            return {
                host: detail.host.address,
                user: detail.host.user,
                password: detail.host.password,
                database: detail.host.database,
            }
        }
        throw new MinorException('No database settings!')
    }

    private _prepareSimpleQuery<TORM extends ORMModelBase>(EntityClass: Newable, callback: QueryCallback<TORM>): Promise<any> {
        const BoundClass: any = EntityClass['bindKnex'](this._connection)
        const query = BoundClass['query']()
        return callback(query, BoundClass) as Promise<any>
    }

    private _prepareTransactionalQuery<TORM extends ORMModelBase>(EntityClass: Newable, callback: QueryCallback<TORM>,
            atomicSession?: AtomicSession): Promise<any> {
        const BoundClass: any = EntityClass['bindKnex'](atomicSession.knexConnection)
        return callback(BoundClass['query'](atomicSession.knexTransaction), BoundClass) as Promise<any>
    }

}
