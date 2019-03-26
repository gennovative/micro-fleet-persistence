import * as knex from 'knex'
import { QueryBuilder, Model } from 'objection'
import { DbConnectionDetail } from '@micro-fleet/common'

import { AtomicSession } from '../atom/AtomicSession'
import { EntityBase } from '../bases/EntityBase'


export interface KnexConnection extends knex {
    /**
     * Connection name.
     */
    // customName: string
}

export type QueryCallbackReturn = QueryBuilder<any> | Promise<any>

/**
 * Invoked when a request for getting query is replied.
 * @param {QueryBuilder} queryBuilder A query that is bound to a connection.
 * @param {Class} boundEntityClass A class that is bound to a connection.
 */
export type QueryCallback<TEntity extends Model> = (queryBuilder: QueryBuilder<TEntity>,
    boundEntityClass?: Newable) => QueryCallbackReturn

/**
 * Helps with managing multiple database connections and executing same query with all
 * of those connections.
 */
export interface IDatabaseConnector {
    /**
     * Gets the established database connection.
     */
    connection: KnexConnection

    /**
     * Creates a new database connection.
     * @param {IConnectionDetail} detail Credentials to make connection.
     */
    init(detail: DbConnectionDetail): void

    /**
     * Closes all connections and destroys this connector.
     */
    dispose(): Promise<void>

    /**
     * Executes same query on all managed connections. This connector binds connections
     * to `EntityClass` and passes a queryable instance to `callback`.
     *
     * @param {class} EntityClass An entity class to bind a connection.
     * @param {QueryCallback} callback A callback to invoke each time a connection is bound.
     * @param {AtomicSession} atomicSession A session which provides transaction to execute queries on.
     * @example
     *     connector.init({...})
     *     const result = await connector.prepare(AccountEntity, (query) => {
     *         return query.insert({ name: 'Example' })
     *     })
     *
     * @return {Promise} A promise returned by the `callback`.
     */
    prepare<TEntity extends EntityBase>(EntityClass: Newable, callback: QueryCallback<TEntity>, atomicSession?: AtomicSession): Promise<any>
}
