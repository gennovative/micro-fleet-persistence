/// <reference path="./global.d.ts" />
declare module '@micro-fleet/persistence/dist/app/atom/AtomicSession' {
	import objection from 'objection';
	import { KnexConnection } from '@micro-fleet/persistence/dist/app/connector/IDatabaseConnector';
	/**
	 * Wraps a database connection and transaction.
	 */
	export class AtomicSession {
	    knexConnection: KnexConnection;
	    knexTransaction: objection.Transaction;
	    constructor(knexConnection: KnexConnection, knexTransaction: objection.Transaction);
	}

}
declare module '@micro-fleet/persistence/dist/app/bases/ORMModelBase' {
	import { Model } from 'objection';
	export abstract class ORMModelBase extends Model {
	    /**
	     * @abstract
	     */
	    static readonly tableName: string;
	    /**
	     * [ObjectionJS] Array of primary column names.
	     * Should be overriden (['id', 'tenant_id']) for composite PK.
	     */
	    static readonly idColumn: string[];
	    /**
	     * Same with `idColumn`, but transform snakeCase to camelCase.
	     */
	    static readonly idProp: string[];
	    /**
	     * An array of non-primary unique column names.
	     */
	    static readonly uniqColumn: string[];
	    /**
	     * Same with `uniqColumn`, but transform snakeCase to camelCase.
	     */
	    static readonly uniqProp: string[];
	}

}
declare module '@micro-fleet/persistence/dist/app/interfaces' {
	import { PagedArray, Maybe, IdBase, SingleId } from '@micro-fleet/common';
	import { AtomicSession } from '@micro-fleet/persistence/dist/app/atom/AtomicSession';
	export enum SortType {
	    ASC = "asc",
	    DESC = "desc"
	}
	export enum FilterOperator {
	    CONTAINS = "con",
	    ENDS_WITH = "end",
	    STARTS_WITH = "start",
	    LESS_THAN = "lt",
	    LESS_OR_EQUAL = "le",
	    GREATER_THAN = "gt",
	    GREATER_OR_EQUAL = "ge",
	    EQUALS = "eq"
	}
	/**
	 * Stores a database connection detail.
	 */
	export type DbConnectionDetail = {
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
	    filePath?: string;
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
	};
	/**
	 * Options for repository's operations.
	 * Note that different operations care about different option properties.
	 * @deprecated
	 */
	export interface RepositoryOptions {
	    /**
	     * A transaction to which this operation is restricted.
	     */
	    atomicSession?: AtomicSession;
	}
	export interface RepositoryExistsOptions extends RepositoryOptions {
	    /**
	     * Whether to include records marked as archived.
	     * Default to `false`.
	     */
	    /**
	     * Whether to include records marked as soft-deleted.
	     * Default to `false`.
	     */
	    /**
	     * Tenant Id
	     */
	    tenantId?: string;
	}
	export interface RepositoryCountAllOptions extends RepositoryExistsOptions {
	}
	export interface RepositoryCreateOptions extends RepositoryOptions {
	}
	export interface RepositoryDeleteOptions extends RepositoryOptions {
	}
	export interface RepositoryFindOptions extends RepositoryExistsOptions {
	    /**
	     * Specifies relation entity to fetch, must follow Objection's
	     * [Object notation](https://vincit.github.io/objection.js/api/types/#relationexpression-object-notation)
	     *
	     * @example
	     *
	     *  ```
	     *  {
	     *    name: true,
	     *    address: true,
	     *  }
	     *  ```
	     *
	     *
	     * @example
	     *
	     *  ```
	     *  {
	     *    status: true,
	     *    staff: {
	     *      name: true,
	     *    },
	     *  }
	     *  ```
	     *
	     */
	    relations?: object;
	    /**
	     * Specifies field names to fetch. These fields must not be relation.
	     */
	    fields?: string[];
	}
	export interface RepositoryPageOptions extends RepositoryFindOptions {
	    pageIndex: number;
	    pageSize: number;
	    sortBy?: string;
	    sortType?: SortType;
	    filterBy?: string;
	    filterValue?: any;
	    filterOperator?: FilterOperator;
	}
	export interface RepositoryPatchOptions extends RepositoryOptions {
	}
	export interface RepositoryUpdateOptions extends RepositoryOptions {
	}
	/**
	 * Provides common CRUD operations.
	 */
	export interface IRepository<TDomain, TId extends IdBase = SingleId> {
	    /**
	     * Counts all records in a table.
	     */
	    countAll(options?: RepositoryCountAllOptions): Promise<number>;
	    /**
	     * Inserts one or more `model` to database.
	     *
	     * @param {DTO model} model The model to be inserted.
	     */
	    create(model: TDomain, options?: RepositoryCreateOptions): Promise<TDomain>;
	    /**
	     * Permanently deletes one record.
	     *
	     * @param {TId} id The id object.
	     */
	    deleteSingle(id: TId, options?: RepositoryDeleteOptions): Promise<number>;
	    /**
	     * Permanently deletes many records.
	     */
	    deleteMany(idList: TId[], options?: RepositoryDeleteOptions): Promise<number>;
	    /**
	     * Checks if a record exists or not.
	     *
	     * @param {DTO model} uniqPartial An object with non-primary unique properties.
	     */
	    exists(uniqPartial: Partial<TDomain>, options?: RepositoryExistsOptions): Promise<boolean>;
	    /**
	     * Selects only one record with `id`.
	     *
	     * @param {TId} id The ID object.
	     */
	    findById(id: TId, options?: RepositoryFindOptions): Promise<Maybe<TDomain>>;
	    /**
	     * Fetches a limited number of records at specified offset.
	     *
	     * @param {RepositoryPageOptions} options Page options.
	     */
	    page(options: RepositoryPageOptions): Promise<PagedArray<TDomain>>;
	    /**
	     * Updates new value for specified properties in `model`.
	     */
	    patch(model: Partial<TDomain>, options?: RepositoryPatchOptions): Promise<Maybe<TDomain>>;
	    /**
	     * Replaces a record with `model`.
	     */
	    update(model: TDomain, options?: RepositoryUpdateOptions): Promise<Maybe<TDomain>>;
	}

}
declare module '@micro-fleet/persistence/dist/app/connector/IDatabaseConnector' {
	import * as knex from 'knex';
	import { QueryBuilder, Model } from 'objection';
	import { Newable } from '@micro-fleet/common';
	import { AtomicSession } from '@micro-fleet/persistence/dist/app/atom/AtomicSession';
	import { ORMModelBase } from '@micro-fleet/persistence/dist/app/bases/ORMModelBase';
	import { DbConnectionDetail } from '@micro-fleet/persistence/dist/app/interfaces';
	export interface KnexConnection extends knex {
	}
	export type QueryCallbackReturn = QueryBuilder<any> | Promise<any>;
	/**
	 * Invoked when a request for getting query is replied.
	 * @param {QueryBuilder} queryBuilder A query that is bound to a connection.
	 * @param {Class} boundEntityClass A class that is bound to a connection.
	 */
	export type QueryCallback<TORM extends Model> = (queryBuilder: QueryBuilder<TORM>, boundEntityClass?: Newable) => QueryCallbackReturn;
	/**
	 * Helps with managing multiple database connections and executing same query with all
	 * of those connections.
	 */
	export interface IDatabaseConnector {
	    /**
	     * Gets the established database connection.
	     */
	    connection: KnexConnection;
	    /**
	     * Creates a new database connection.
	     * @param {IConnectionDetail} detail Credentials to make connection.
	     */
	    init(detail: DbConnectionDetail): this;
	    /**
	     * Closes all connections and destroys this connector.
	     */
	    dispose(): Promise<void>;
	    /**
	     * Executes same query on all managed connections. This connector binds connections
	     * to `EntityClass` and passes a queryable instance to `callback`.
	     *
	     * @param {class} ORMClass An ORM class to bind a connection.
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
	    prepare<TORM extends ORMModelBase>(ORMClass: Newable, callback: QueryCallback<TORM>, atomicSession?: AtomicSession): Promise<any>;
	}

}
declare module '@micro-fleet/persistence/dist/app/Types' {
	export class Types {
	    static readonly DB_ADDON = "persistence.DatabaseAddOn";
	    static readonly DB_CONNECTOR = "persistence.IDatabaseConnector";
	    static readonly ATOMIC_SESSION_FACTORY = "persistence.AtomicSessionFactory";
	}

}
declare module '@micro-fleet/persistence/dist/app/DatabaseAddOn' {
	import { IConfigurationProvider, IServiceAddOn } from '@micro-fleet/common';
	import { IDatabaseConnector } from '@micro-fleet/persistence/dist/app/connector/IDatabaseConnector';
	/**
	 * Initializes database connections.
	 */
	export class DatabaseAddOn implements IServiceAddOn {
	    	    	    readonly name: string;
	    constructor(_config: IConfigurationProvider, _dbConnector: IDatabaseConnector);
	    /**
	     * @see IServiceAddOn.init
	     */
	    init(): Promise<void>;
	    /**
	     * @see IServiceAddOn.deadLetter
	     */
	    deadLetter(): Promise<void>;
	    /**
	     * @see IServiceAddOn.dispose
	     */
	    dispose(): Promise<void>;
	    	    	}

}
declare module '@micro-fleet/persistence/dist/app/DatabaseSettings' {
	import { Maybe, SettingItem } from '@micro-fleet/common';
	import { DbConnectionDetail } from '@micro-fleet/persistence/dist/app/interfaces';
	/**
	 * Represents an array of database settings.
	 * @deprecated
	 */
	export class DatabaseSettings extends Array<SettingItem> {
	    /**
	     * Parses from connection detail.
	     * @param {DbConnectionDetail} detail Connection detail loaded from JSON data source.
	     */
	    static fromConnectionDetail(detail: DbConnectionDetail): Maybe<DatabaseSettings>;
	    constructor();
	}

}
declare module '@micro-fleet/persistence/dist/app/atom/AtomicSessionFlow' {
	import { IDatabaseConnector } from '@micro-fleet/persistence/dist/app/connector/IDatabaseConnector';
	import { AtomicSession } from '@micro-fleet/persistence/dist/app/atom/AtomicSession';
	export type SessionTask = (session: AtomicSession, previousOutput?: any) => Promise<any>;
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
	    constructor(_dbConnector: IDatabaseConnector);
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
	     * Adds a task to be executed inside transaction.
	     * This method is chainable and can only be called before `closePipe()` is invoked.
	     */
	    pipe(task: SessionTask): AtomicSessionFlow;
	    	    	    	    	    	}

}
declare module '@micro-fleet/persistence/dist/app/atom/AtomicSessionFactory' {
	import { IDatabaseConnector } from '@micro-fleet/persistence/dist/app/connector/IDatabaseConnector';
	import { AtomicSessionFlow } from '@micro-fleet/persistence/dist/app/atom/AtomicSessionFlow';
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
	    startSession(): AtomicSessionFlow;
	}

}
declare module '@micro-fleet/persistence/dist/app/bases/PgCrudRepositoryBase' {
	import { QueryBuilder } from 'objection';
	import { PagedArray, Maybe, SingleId, IdBase, Newable } from '@micro-fleet/common';
	import { AtomicSession } from '@micro-fleet/persistence/dist/app/atom/AtomicSession';
	import { IDatabaseConnector, QueryCallbackReturn, QueryCallback } from '@micro-fleet/persistence/dist/app/connector/IDatabaseConnector';
	import * as it from '@micro-fleet/persistence/dist/app/interfaces';
	import { ORMModelBase } from '@micro-fleet/persistence/dist/app/bases/ORMModelBase';
	export abstract class PgCrudRepositoryBase<TORM extends ORMModelBase, TDomain extends object, TId extends IdBase = SingleId> implements it.IRepository<TDomain, TId> {
	    protected _EntityClass: Newable;
	    protected _DomainClass: Newable;
	    protected _dbConnector: IDatabaseConnector;
	    /**
	     * EntityClass' primary key properties.
	     * Eg: ['id', 'tenantId']
	     */
	    	    constructor(_EntityClass: Newable, _DomainClass: Newable, _dbConnector: IDatabaseConnector);
	    /**
	     * @see IRepository.countAll
	     */
	    countAll(opts?: it.RepositoryCountAllOptions): Promise<number>;
	    protected _buildCountAllQuery(query: QueryBuilder<TORM>, opts: it.RepositoryCountAllOptions): QueryCallbackReturn;
	    /**
	     * @see IRepository.create
	     */
	    create(model: Partial<TDomain>, opts?: it.RepositoryCreateOptions): Promise<TDomain>;
	    protected _buildCreateQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, entity: TORM, opts: it.RepositoryCreateOptions): QueryCallbackReturn;
	    /**
	     * @see IRepository.deleteSingle
	     */
	    deleteSingle(id: TId, opts?: it.RepositoryDeleteOptions): Promise<number>;
	    protected _buildDeleteSingleQuery(query: QueryBuilder<TORM>, id: TId, opts: it.RepositoryDeleteOptions): QueryCallbackReturn;
	    /**
	     * @see IRepository.deleteMany
	     */
	    deleteMany(idList: TId[], opts?: it.RepositoryDeleteOptions): Promise<number>;
	    protected _buildDeleteManyQuery(query: QueryBuilder<TORM>, idList: TId[], opts: it.RepositoryDeleteOptions): QueryCallbackReturn;
	    /**
	     * @see IRepository.exists
	     */
	    exists(uniqPartial: Partial<TDomain>, opts?: it.RepositoryExistsOptions): Promise<boolean>;
	    protected _buildExistsQuery(query: QueryBuilder<TORM>, uniqPartial: Partial<TDomain>, opts: it.RepositoryExistsOptions): QueryCallbackReturn;
	    /**
	     * @see IRepository.findById
	     */
	    findById(id: TId, opts?: it.RepositoryFindOptions): Promise<Maybe<TDomain>>;
	    protected _buildFindByIdQuery(query: QueryBuilder<TORM>, id: TId, opts: it.RepositoryFindOptions): QueryCallbackReturn;
	    /**
	     * @see IRepository.page
	     */
	    page(opts: it.RepositoryPageOptions): Promise<PagedArray<TDomain>>;
	    protected _buildPageQuery(query: QueryBuilder<TORM>, opts: it.RepositoryPageOptions): QueryCallbackReturn;
	    /**
	     * @see IRepository.patch
	     */
	    patch(model: Partial<TDomain>, opts?: it.RepositoryPatchOptions): Promise<Maybe<TDomain>>;
	    protected _buildPatchQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, entity: TORM, opts: it.RepositoryPatchOptions): QueryCallbackReturn;
	    /**
	     * @see IRepository.update
	     */
	    update(model: TDomain, opts?: it.RepositoryUpdateOptions): Promise<Maybe<TDomain>>;
	    protected _buildUpdateQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, entity: TORM, opts: it.RepositoryUpdateOptions): QueryCallbackReturn;
	    protected executeQuery(callback: QueryCallback<TORM>, atomicSession?: AtomicSession): Promise<any>;
	    /**
	     * Translates from a DTO model to an entity model.
	     */
	    protected toEntity(domainModel: TDomain | Partial<TDomain>, isPartial: boolean): TORM;
	    /**
	     * Translates from DTO models to entity models.
	     */
	    protected toEntityMany(domainModels: TDomain[] | Partial<TDomain>[], isPartial: boolean): TORM[];
	    /**
	     * Translates from an entity model to a domain model.
	     */
	    protected toDomainModel(entity: TORM | Partial<TORM>, isPartial: boolean): TDomain;
	    /**
	     * Translates from entity models to domain models.
	     */
	    protected toDomainModelMany(entities: TORM[] | Partial<TORM>[], isPartial: boolean): TDomain[];
	}

}
declare module '@micro-fleet/persistence/dist/app/connector/KnexDatabaseConnector' {
	import { Newable } from '@micro-fleet/common';
	import { AtomicSession } from '@micro-fleet/persistence/dist/app/atom/AtomicSession';
	import { ORMModelBase } from '@micro-fleet/persistence/dist/app/bases/ORMModelBase';
	import { DbConnectionDetail } from '@micro-fleet/persistence/dist/app/interfaces';
	import { IDatabaseConnector, QueryCallback, KnexConnection } from '@micro-fleet/persistence/dist/app/connector/IDatabaseConnector';
	/**
	 * Provides settings from package
	 */
	export class KnexDatabaseConnector implements IDatabaseConnector {
	    	    	    constructor();
	    /**
	     * @see IDatabaseConnector.connection
	     */
	    readonly connection: KnexConnection;
	    /**
	     * @see IDatabaseConnector.init
	     */
	    init(detail: DbConnectionDetail): this;
	    /**
	     * @see IDatabaseConnector.dispose
	     */
	    dispose(): Promise<void>;
	    /**
	     * @see IDatabaseConnector.prepare
	     */
	    prepare<TORM extends ORMModelBase>(ORMClass: Newable, callback: QueryCallback<TORM>, atomicSession?: AtomicSession): Promise<any>;
	    	    	    	}

}
declare module '@micro-fleet/persistence/dist/app/register-addon' {
	import { DatabaseAddOn } from '@micro-fleet/persistence/dist/app/DatabaseAddOn';
	export function registerDbAddOn(): DatabaseAddOn;

}
declare module '@micro-fleet/persistence' {
	export * from '@micro-fleet/persistence/dist/app/atom/AtomicSessionFactory';
	export * from '@micro-fleet/persistence/dist/app/atom/AtomicSessionFlow';
	export * from '@micro-fleet/persistence/dist/app/atom/AtomicSession';
	export * from '@micro-fleet/persistence/dist/app/bases/ORMModelBase';
	export * from '@micro-fleet/persistence/dist/app/bases/PgCrudRepositoryBase';
	export * from '@micro-fleet/persistence/dist/app/connector/IDatabaseConnector';
	export * from '@micro-fleet/persistence/dist/app/connector/KnexDatabaseConnector';
	export * from '@micro-fleet/persistence/dist/app/DatabaseAddOn';
	export * from '@micro-fleet/persistence/dist/app/DatabaseSettings';
	export * from '@micro-fleet/persistence/dist/app/DatabaseAddOn';
	export * from '@micro-fleet/persistence/dist/app/interfaces';
	export * from '@micro-fleet/persistence/dist/app/register-addon';
	export * from '@micro-fleet/persistence/dist/app/Types';

}
declare module '@micro-fleet/persistence/dist/app/pg-type-parsers' {
	export {};

}
