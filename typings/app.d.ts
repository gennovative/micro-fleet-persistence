/// <reference path="./global.d.ts" />

declare module 'back-lib-persistence/EntityBase' {
	import { Model } from 'objection';
	export abstract class EntityBase extends Model {
	    /**
	     * @abstract
	     */
	    static readonly tableName: string;
	    id: BigSInt;
	    /**
	     * This is called when an object is serialized to database format.
	     */
	    $formatDatabaseJson(json: any): any;
	    /**
	     * This is called when an object is read from database.
	     */
	    $parseDatabaseJson(json: any): Object;
	}

}
declare module 'back-lib-persistence/IDatabaseConnector' {
	import { QueryBuilder } from 'objection';
	import { EntityBase } from 'back-lib-persistence/EntityBase';
	/**
	 * Db driver names for `IConnectionDetail.clientName` property.
	 */
	export class DbClient {
	    /**
	     * Microsoft SQL Server
	     */
	    static readonly MSSQL: string;
	    /**
	     * MySQL
	     */
	    static readonly MYSQL: string;
	    /**
	     * PostgreSQL
	     */
	    static readonly POSTGRESQL: string;
	    /**
	     * SQLite 3
	     */
	    static readonly SQLITE3: string;
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
	        address: string;
	        /**
	         * Username to login database.
	         */
	        user: string;
	        /**
	         * Password to login database.
	         */
	        password: string;
	        /**
	         * Database name.
	         */
	        database: string;
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
	    prepare<TEntity extends EntityBase>(EntityClass: any, callback: QueryCallback<TEntity>, ...names: string[]): Promise<any>[];
	}

}
declare module 'back-lib-persistence/RepositoryBase' {
	import { PagedArray, IRepository } from 'back-lib-common-contracts';
	import { EntityBase } from 'back-lib-persistence/EntityBase';
	import { IDatabaseConnector, QueryCallback } from 'back-lib-persistence/IDatabaseConnector';
	export abstract class RepositoryBase<TEntity extends EntityBase, TModel extends IModelDTO> implements IRepository<TModel> {
	    protected _dbConnector: IDatabaseConnector;
	    isSoftDeletable: boolean;
	    isAuditable: boolean;
	    constructor(_dbConnector: IDatabaseConnector);
	    /**
	     * Gets current date time in UTC.
	     */
	    protected readonly utcNow: string;
	    /**
	     * @see IRepository.countAll
	     */
	    countAll(): Promise<number>;
	    /**
	     * @see IRepository.create
	     */
	    create(model: TModel): Promise<TModel>;
	    /**
	     * @see IRepository.delete
	     */
	    delete(id: BigSInt): Promise<number>;
	    /**
	     * @see IRepository.find
	     */
	    find(id: BigSInt): Promise<TModel>;
	    /**
	     * @see IRepository.page
	     */
	    page(pageIndex: number, pageSize: number): Promise<PagedArray<TModel>>;
	    /**
	     * @see IRepository.patch
	     */
	    patch(model: Partial<TModel>): Promise<number>;
	    /**
	     * @see IRepository.update
	     */
	    update(model: TModel): Promise<number>;
	    /**
	     * Executing an query that does something and doesn't expect return value.
	     * This kind of query is executed on all added connections.
	     * @return A promise that resolve to affected rows.
	     * @throws {[errorMsg, affectedRows]} When not all connections have same affected rows.
	     */
	    protected executeCommand(callback: QueryCallback<TEntity>, ...names: string[]): Promise<number & TEntity>;
	    /**
	     * Executing an query that has returned value.
	     * This kind of query is executed on the primary (first) connection.
	     */
	    protected executeQuery(callback: QueryCallback<TEntity>, name?: string): Promise<any>;
	    /**
	     * @see IDatabaseConnector.query
	     */
	    protected abstract prepare(callback: QueryCallback<TEntity>, ...names: string[]): Promise<any>[];
	    protected abstract toEntity(from: TModel | TModel[] | Partial<TModel>, isPartial: boolean): TEntity & TEntity[];
	    protected abstract toDTO(from: TEntity | TEntity[] | Partial<TEntity>, isPartial: boolean): TModel & TModel[];
	}

}
declare module 'back-lib-persistence/KnexDatabaseConnector' {
	import { EntityBase } from 'back-lib-persistence/EntityBase';
	import { IDatabaseConnector, IConnectionDetail, QueryCallback } from 'back-lib-persistence/IDatabaseConnector';
	/**
	 * Provides settings from package
	 */
	export class KnexDatabaseConnector implements IDatabaseConnector {
	    	    	    constructor();
	    addConnection(detail: IConnectionDetail, name?: string): void;
	    dispose(): Promise<void>;
	    prepare<TEntity extends EntityBase>(EntityClass: any, callback: QueryCallback<TEntity>, ...names: string[]): Promise<any>[];
	    	}

}
declare module 'back-lib-persistence/Types' {
	export class Types {
	    static readonly DB_CONNECTOR: symbol;
	}

}
declare module 'back-lib-persistence' {
	import 'back-lib-persistence/convert-utc';
	export * from 'back-lib-persistence/EntityBase';
	export * from 'back-lib-persistence/RepositoryBase';
	export * from 'back-lib-persistence/IDatabaseConnector';
	export * from 'back-lib-persistence/KnexDatabaseConnector';
	export * from 'back-lib-persistence/Types';

}
