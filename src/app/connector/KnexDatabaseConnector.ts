import * as knex from 'knex'
import { injectable, Guard, MinorException, DbConnectionDetail,
    constants as CmC } from '@micro-fleet/common'

import { AtomicSession } from '../atom/AtomicSession'
import { EntityBase } from '../bases/EntityBase'
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
    public init(detail: DbConnectionDetail): void {
        Guard.assertArgDefined('detail', detail)

        const settings = {
                client: detail.clientName,
                useNullAsDefault: true,
                connection: this._buildConnSettings(detail),
            }

        if (detail.clientName === CmC.DbClient.POSTGRESQL) {
            require('../pg-type-parsers')
        }
        this._connection = this._knex(settings)
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
    public prepare<TEntity extends EntityBase>(EntityClass: Newable, callback: QueryCallback<TEntity>,
            atomicSession?: AtomicSession): Promise<any> {
        Guard.assertIsNotEmpty(this._connection, 'Must call addConnection() before executing any query.')
        if (atomicSession) {
            return this._prepareTransactionalQuery(EntityClass, callback, atomicSession)
        }
        return this._prepareSimpleQuery(EntityClass, callback)
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

    private _prepareSimpleQuery<TEntity extends EntityBase>(EntityClass: Newable, callback: QueryCallback<TEntity>): Promise<any> {
        const BoundClass: any = EntityClass['bindKnex'](this._connection)
        const query = BoundClass['query']()
        return callback(query, BoundClass) as Promise<any>
    }

    private _prepareTransactionalQuery<TEntity extends EntityBase>(EntityClass: Newable, callback: QueryCallback<TEntity>,
            atomicSession?: AtomicSession): Promise<any> {
        const BoundClass: any = EntityClass['bindKnex'](atomicSession.knexConnection)
        return callback(BoundClass['query'](atomicSession.knexTransaction), BoundClass) as Promise<any>
    }

}
