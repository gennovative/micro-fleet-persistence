import * as knex from 'knex';
import { QueryBuilder } from 'objection';
import { DbClient } from 'back-lib-common-constants';
import { AtomicSession, IConnectionDetail } from 'back-lib-common-contracts';

import { EntityBase } from '../bases/EntityBase';


export interface KnexConnection extends knex {
	/**
	 * Connection name.
	 */
	customName: string;
}

/**
 * Invoked when a request for getting query is replied.
 * @param {QueryBuilder} queryBuilder A query that is bound to a connection.
 * @param {Class extends Model} boundEntityClass A class that is bound to a connection.
 */
export type QueryCallback<TEntity> = (queryBuilder: QueryBuilder<TEntity>, boundEntityClass?) => Promise<any>;

/**
 * Helps with managing multiple database connections and executing same query with all
 * of those connections.
 */
export interface IDatabaseConnector {
	/**
	 * Gets list of established database connections.
	 * Each item is a Knex instance.
	 */
	connections: KnexConnection[];

	/**
	 * Makes a new database connection then adds to managed list.
	 * @param {IConnectionDetail} detail Credentials to make connection.
	 * @param {string} name Optionally give a name to the connection, for later reference.
	 * 	If not given, the position index of connection in the managed list will be assigned as name.
	 */
	addConnection(detail: IConnectionDetail, name?: string): void;

	/**
	 * Closes all connections and destroys this connector.
	 */
	dispose(): Promise<void>;
	
	/**
	 * Executes same query on all managed connections. This connector binds connections 
	 * to `EntityClass` and passes a queryable instance to `callback`.
	 * 
	 * @param {class} EntityClass An entity class to bind a connection.
	 * @param {AtomicSession} atomicSession A session which provides transaction to execute queries on.
	 * @param {QueryCallback} callback A callback to invoke each time a connection is bound.
	 * @param {string[]} names Optionally filters out and only executes the query on connections with specified names.
	 * @example
	 * 	// Must add at least one connection.
	 * 	connector.addConnection({...});
	 * 
	 * 	// Executes same query on all connections.
	 * 	let promises = connector.query(AccountEntity, (query) => {
	 * 		return query.insert({ name: 'Example' })
	 * 	});
	 * 
	 * 	// Waits for operations on all connections to complete.
	 * 	let results = await Promise.all(promises);
	 * 
	 * 	// Only waits for the primary connection that we care most.
	 * 	let result = await promises[0];
	 * @return {Promise[]} An array of promises returned by all above callbacks.
	 */
	prepare<TEntity extends EntityBase>(EntityClass, callback: QueryCallback<TEntity>, atomicSession?: AtomicSession, ...names: string[]): Promise<any>[];
}
