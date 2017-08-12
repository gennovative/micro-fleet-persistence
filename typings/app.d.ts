/// <reference path="./global.d.ts" />

declare module 'back-lib-persistence/dist/app/Types' {
	export class Types {
	    static readonly DB_CONNECTOR: symbol;
	}

}
declare module 'back-lib-persistence/dist/app/bases/EntityBase' {
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
declare module 'back-lib-persistence/dist/app/connector/IDatabaseConnector' {
	/// <reference types="knex" />
	import * as knex from 'knex';
	import { QueryBuilder } from 'objection';
	import { AtomicSession } from 'back-lib-common-contracts';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	export interface KnexConnection extends knex {
	    /**
	     * Connection name.
	     */
	    customName: string;
	}
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
	    prepare<TEntity extends EntityBase>(EntityClass: any, callback: QueryCallback<TEntity>, atomicSession?: AtomicSession, ...names: string[]): Promise<any>[];
	}

}
declare module 'back-lib-persistence/dist/app/atom/AtomicSessionFlow' {
	import { AtomicSession } from 'back-lib-common-contracts';
	import { IDatabaseConnector } from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
	export type SessionTask = (session: AtomicSession, previousOutputs?: any[]) => Promise<any>;
	/**
	 * Provides method to execute queries on many database connections, but still make
	 * sure those queries are wrapped in transactions.
	 */
	export class AtomicSessionFlow {
	    protected _dbConnector: IDatabaseConnector;
	    	    	    	    	    	    /**
	     *
	     * @param {string[]} names Only executes the queries on connections with specified names.
	     */
	    constructor(_dbConnector: IDatabaseConnector, names: string[]);
	    /**
	     * Checks if it is possible to call "pipe()".
	     */
	    readonly isPipeClosed: boolean;
	    /**
	     * Returns a promise which resolves to the output of the last query
	     * on primary (first) connection.
	     * This method must be called at the end of the pipe chain.
	     */
	    closePipe(): Promise<any>;
	    /**
	     * Adds a task to session, it will be executed inside transaction of each connections
	     * This method is chainable and can only be called before `closePipe()` is invoked.
	     */
	    pipe(task: SessionTask): AtomicSessionFlow;
	    	    	    	    	    	    	}

}
declare module 'back-lib-persistence/dist/app/atom/AtomicSessionFactory' {
	import { IDatabaseConnector } from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
	import { AtomicSessionFlow } from 'back-lib-persistence/dist/app/atom/AtomicSessionFlow';
	/**
	 * Provides methods to create atomic sessions.
	 */
	export class AtomicSessionFactory {
	    protected _dbConnector: IDatabaseConnector;
	    constructor(_dbConnector: IDatabaseConnector);
	    /**
	     * Starts executing queries in transactions.
	     * @param {string[]} names Only executes the queries on connections with specified names.
	     */
	    startSession(...names: string[]): AtomicSessionFlow;
	}

}
declare module 'back-lib-persistence/dist/app/bases/RepositoryBase' {
	import * as moment from 'moment';
	import { PagedArray, IRepository, AtomicSession } from 'back-lib-common-contracts';
	import { IDatabaseConnector, QueryCallback } from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	export abstract class RepositoryBase<TEntity extends EntityBase, TModel extends IModelDTO> implements IRepository<TModel> {
	    protected _dbConnector: IDatabaseConnector;
	    isSoftDeletable: boolean;
	    isAuditable: boolean;
	    constructor(_dbConnector: IDatabaseConnector);
	    /**
	     * Gets current date time in UTC.
	     */
	    protected readonly utcNow: moment.Moment;
	    /**
	     * @see IRepository.countAll
	     */
	    countAll(atomicSession?: AtomicSession): Promise<number>;
	    /**
	     * @see IRepository.create
	     */
	    create(model: TModel, atomicSession?: AtomicSession): Promise<TModel>;
	    /**
	     * @see IRepository.delete
	     */
	    delete(id: BigSInt, atomicSession?: AtomicSession): Promise<number>;
	    /**
	     * @see IRepository.find
	     */
	    find(id: BigSInt, atomicSession?: AtomicSession): Promise<TModel>;
	    /**
	     * @see IRepository.page
	     */
	    page(pageIndex: number, pageSize: number, atomicSession?: AtomicSession): Promise<PagedArray<TModel>>;
	    /**
	     * @see IRepository.patch
	     */
	    patch(model: Partial<TModel>, atomicSession?: AtomicSession): Promise<number>;
	    /**
	     * @see IRepository.update
	     */
	    update(model: TModel, atomicSession?: AtomicSession): Promise<number>;
	    /**
	     * Executing an query that does something and doesn't expect return value.
	     * This kind of query is executed on all added connections.
	     * @return A promise that resolve to affected rows.
	     * @throws {[errorMsg, affectedRows]} When not all connections have same affected rows.
	     */
	    protected executeCommand(callback: QueryCallback<TEntity>, atomicSession?: AtomicSession, ...names: string[]): Promise<any>;
	    /**
	     * Executing an query that has returned value.
	     * This kind of query is executed on the primary (first) connection.
	     */
	    protected executeQuery(callback: QueryCallback<TEntity>, atomicSession?: AtomicSession, name?: string): Promise<any>;
	    /**
	     * @see IDatabaseConnector.query
	     */
	    protected abstract prepare(callback: QueryCallback<TEntity>, atomicSession?: AtomicSession, ...names: string[]): Promise<any>[];
	    protected abstract toEntity(from: TModel | TModel[] | Partial<TModel>, isPartial: boolean): TEntity & TEntity[];
	    protected abstract toDTO(from: TEntity | TEntity[] | Partial<TEntity>, isPartial: boolean): TModel & TModel[];
	}

}
declare module 'back-lib-persistence/dist/app/connector/KnexDatabaseConnector' {
	import { AtomicSession } from 'back-lib-common-contracts';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	import { IDatabaseConnector, IConnectionDetail, QueryCallback, KnexConnection } from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
	/**
	 * Provides settings from package
	 */
	export class KnexDatabaseConnector implements IDatabaseConnector {
	    	    	    constructor();
	    /**
	     * @see IDatabaseConnector.connections
	     */
	    readonly connections: KnexConnection[];
	    /**
	     * @see IDatabaseConnector.addConnection
	     */
	    addConnection(detail: IConnectionDetail, name?: string): void;
	    /**
	     * @see IDatabaseConnector.dispose
	     */
	    dispose(): Promise<void>;
	    /**
	     * @see IDatabaseConnector.prepare
	     */
	    prepare<TEntity extends EntityBase>(EntityClass: any, callback: QueryCallback<TEntity>, atomicSession?: AtomicSession, ...names: string[]): Promise<any>[];
	    	    	    	}

}
declare module 'back-lib-persistence' {
	import 'back-lib-persistence/dist/app/convert-utc';
	export * from 'back-lib-persistence/dist/app/atom/AtomicSessionFactory';
	export * from 'back-lib-persistence/dist/app/atom/AtomicSessionFlow';
	export * from 'back-lib-persistence/dist/app/bases/EntityBase';
	export * from 'back-lib-persistence/dist/app/bases/RepositoryBase';
	export * from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
	export * from 'back-lib-persistence/dist/app/connector/KnexDatabaseConnector';
	export * from 'back-lib-persistence/dist/app/Types';

}
