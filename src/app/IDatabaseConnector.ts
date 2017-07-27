import { QueryBuilder } from 'objection';

import { EntityBase } from './EntityBase';


/**
 * Db driver names for `IConnectionDetail.clientName` property.
 */
export class DbClient {
	/**
	 * Microsoft SQL Server
	 */
	public static readonly MSSQL = 'mssql';
	
	/**
	 * MySQL
	 */
	public static readonly MYSQL = 'mysql';
	
	/**
	 * PostgreSQL
	 */
	public static readonly POSTGRESQL = 'pg';
	
	/**
	 * SQLite 3
	 */
	public static readonly SQLITE3 = 'sqlite3';
}

/**
 * Stores a database connection detail.
 */
export interface IConnectionDetail {
	/**
	 * Database driver name, should use constants in class DbClient. 
	 * Eg: DbClient.SQLITE3, DbClient.POSTGRESQL, ...
	 */
	clientName: string;

	/**
	 * Connection string for specified `clientName`.
	 */
	connectionString?: string;

	/**
	 * Absolute path to database file name.
	 */
	fileName?: string;

	host?: {
		/**
		 * IP Address or Host name.
		 */
		address: string,

		/**
		 * Username to login database.
		 */
		user: string,

		/**
		 * Password to login database.
		 */
		password: string,

		/**
		 * Database name.
		 */
		database: string
	};
}

/**
 * Invoked when a request for getting query is replied.
 * @param queryBuilder {QueryBuilder} A query that is bound to a connection.
 * @param boundEntityClass {Class extends Model} A class that is bound to a connection.
 */
export type QueryCallback<TEntity> = (queryBuilder: QueryBuilder<TEntity>, boundEntityClass?) => Promise<any>;

/**
 * Helps with managing multiple database connections and executing same query with all
 * of those connections.
 */
export interface IDatabaseConnector {
	/**
	 * Makes a new database connection then adds to managed list.
	 * @param detail {IConnectionDetail} Credentials to make connection.
	 * @param name {string} Optionally give a name to the connection, for later reference.
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
	 * @param EntityClass {Class} An entity class to bind a connection.
	 * @param callback {QueryCallback} A callback to invoke each time a connection is bound.
	 * @param names {string[]} Optionally filters out and only executes the query on connections with specified names.
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
	prepare<TEntity extends EntityBase>(EntityClass, callback: QueryCallback<TEntity>, ...names: string[]): Promise<any>[];
}
