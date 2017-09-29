/// <reference path="./global.d.ts" />

declare module 'back-lib-persistence/dist/app/bases/EntityBase' {
	import { Model } from 'objection';
	export abstract class EntityBase extends Model {
	    /**
	     * @abstract
	     */
	    static readonly tableName: string;
	    /**
	     * [ObjectionJS] Array of primary column names.
	     */
	    static readonly idColumn: string[];
	    /**
	     * An array of non-primary unique column names.
	     */
	    static readonly uniqColumn: any[];
	    /**
	     * Same with `idColumn`, but transform snakeCase to camelCase.
	     * Should be overiden (['id', 'tenantId']) for composite PK.
	     */
	    static readonly idProp: string[];
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
	import { AtomicSession, IConnectionDetail } from 'back-lib-common-contracts';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
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
	    prepare<TEntity extends EntityBase>(EntityClass: any, callback: QueryCallback<TEntity>, atomicSession?: AtomicSession, ...names: string[]): Promise<any>[];
	}

}
declare module 'back-lib-persistence/dist/app/Types' {
	export class Types {
	    static readonly DB_ADDON: symbol;
	    static readonly DB_CONNECTOR: symbol;
	    static readonly ATOMIC_SESSION_FACTORY: symbol;
	}

}
declare module 'back-lib-persistence/dist/app/DatabaseAddOn' {
	import { IConfigurationProvider } from 'back-lib-common-contracts';
	import { IDatabaseConnector } from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
	/**
	 * Initializes database connections.
	 */
	export class DatabaseAddOn implements IServiceAddOn {
	    	    	    constructor(_configProvider: IConfigurationProvider, _dbConnector: IDatabaseConnector);
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
declare module 'back-lib-persistence/dist/app/atom/AtomicSessionFlow' {
	import { AtomicSession } from 'back-lib-common-contracts';
	import { IDatabaseConnector } from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
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
declare module 'back-lib-persistence/dist/app/bases/IQueryBuilder' {
	import { QueryBuilder, QueryBuilderSingle } from 'objection';
	import * as cc from 'back-lib-common-contracts';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	export interface IQueryBuilder<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType, TUk = NameUk> {
	    buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryCountAllOptions): QueryBuilder<TEntity>;
	    buildDeleteHard(pk: TPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>): QueryBuilderSingle<number>;
	    buildExists(uniqVals: any, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryExistsOptions): QueryBuilder<TEntity>;
	    buildFind(pk: TPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryFindOptions): QueryBuilder<TEntity>;
	    buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryPageOptions): QueryBuilder<TEntity>;
	    buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryPatchOptions): QueryBuilder<number>;
	    buildRecoverOpts(pk: TPk, prevOpts: cc.RepositoryRecoverOptions, rawOpts: cc.RepositoryRecoverOptions): cc.RepositoryExistsOptions;
	    buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryPatchOptions): QueryBuilder<number>;
	}

}
declare module 'back-lib-persistence/dist/app/bases/MonoQueryBuilder' {
	import { QueryBuilder, QueryBuilderSingle } from 'objection';
	import * as cc from 'back-lib-common-contracts';
	import { IQueryBuilder } from 'back-lib-persistence/dist/app/bases/IQueryBuilder';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	export class MonoQueryBuilder<TEntity extends EntityBase, TModel extends IModelDTO, TUk = NameUk> implements IQueryBuilder<TEntity, TModel, BigSInt, TUk> {
	    	    constructor(_EntityClass: any);
	    buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryCountAllOptions): QueryBuilder<TEntity>;
	    buildDeleteHard(pk: BigSInt, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>): QueryBuilderSingle<number>;
	    buildExists(uniqVals: any[], prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryExistsOptions): QueryBuilder<TEntity>;
	    buildFind(pk: BigSInt, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryFindOptions): QueryBuilder<TEntity>;
	    buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPageOptions): QueryBuilder<TEntity>;
	    buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPatchOptions): QueryBuilder<number>;
	    buildRecoverOpts(pk: BigSInt, prevOpts: cc.RepositoryRecoverOptions, rawOpts: cc.RepositoryRecoverOptions): cc.RepositoryExistsOptions;
	    buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPatchOptions): QueryBuilder<number>;
	}

}
declare module 'back-lib-persistence/dist/app/bases/TenantQueryBuilder' {
	import { QueryBuilder, QueryBuilderSingle } from 'objection';
	import * as cc from 'back-lib-common-contracts';
	import { IQueryBuilder } from 'back-lib-persistence/dist/app/bases/IQueryBuilder';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	export class TenantQueryBuilder<TEntity extends EntityBase, TModel extends IModelDTO, TUk = NameUk> implements IQueryBuilder<TEntity, TModel, TenantPk, TUk> {
	    	    constructor(_EntityClass: any);
	    buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryCountAllOptions): QueryBuilder<TEntity>;
	    buildDeleteHard(pk: TenantPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>): QueryBuilderSingle<number>;
	    buildExists(props: TUk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryExistsOptions): QueryBuilder<TEntity>;
	    buildFind(pk: TenantPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryFindOptions): QueryBuilder<TEntity>;
	    buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryPageOptions): QueryBuilder<TEntity>;
	    buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryPatchOptions): QueryBuilder<number>;
	    buildRecoverOpts(pk: TenantPk, prevOpts: cc.RepositoryRecoverOptions, rawOpts: cc.RepositoryRecoverOptions): cc.RepositoryExistsOptions;
	    buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryPatchOptions): QueryBuilder<number>;
	    	}

}
declare module 'back-lib-persistence/dist/app/bases/MonoProcessor' {
	import * as moment from 'moment';
	import * as cc from 'back-lib-common-contracts';
	import { IDatabaseConnector, QueryCallback } from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
	import { IQueryBuilder } from 'back-lib-persistence/dist/app/bases/IQueryBuilder';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	export interface ProcessorOptions {
	    isMultiTenancy?: boolean;
	    isVersionControlled?: boolean;
	    /**
	     * Property names that triggers new version creation.
	     */
	    triggerProps?: string[];
	}
	export class MonoProcessor<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType = BigSInt, TUk = NameUk> {
	    protected _EntityClass: any;
	    protected _dbConnector: IDatabaseConnector;
	    protected _options: ProcessorOptions;
	    /**
	     * Gets array of non-primary unique property(ies).
	     */
	    readonly ukCol: string[];
	    protected _queryBuilders: IQueryBuilder<TEntity, TModel, PkType, TUk>[];
	    constructor(_EntityClass: any, _dbConnector: IDatabaseConnector, _options?: ProcessorOptions);
	    /**
	     * Gets current date time in UTC.
	     */
	    readonly utcNow: moment.Moment;
	    /**
	     * @see IRepository.countAll
	     */
	    countAll(opts?: cc.RepositoryCountAllOptions): Promise<number>;
	    /**
	     * @see IRepository.create
	     */
	    create(model: TModel, opts?: cc.RepositoryCreateOptions): Promise<TModel & TModel[]>;
	    /**
	     * @see ISoftDelRepository.deleteSoft
	     */
	    deleteSoft(pk: TPk, opts?: cc.RepositoryDeleteOptions): Promise<number>;
	    /**
	     * @see IRepository.deleteHard
	     */
	    deleteHard(pk: TPk, opts?: cc.RepositoryDeleteOptions): Promise<number>;
	    /**
	     * @see IRepository.exists
	     */
	    exists(props: TUk, opts?: cc.RepositoryExistsOptions): Promise<boolean>;
	    /**
	     * @see IRepository.findByPk
	     */
	    findByPk(pk: TPk, opts?: cc.RepositoryFindOptions): Promise<TModel>;
	    /**
	     * @see IRepository.page
	     */
	    page(pageIndex: number, pageSize: number, opts?: cc.RepositoryPageOptions): Promise<cc.PagedArray<TModel>>;
	    /**
	     * @see IRepository.patch
	     */
	    patch(model: Partial<TModel>, opts?: cc.RepositoryPatchOptions): Promise<Partial<TModel> & Partial<TModel>[]>;
	    /**
	     * @see ISoftDelRepository.recover
	     */
	    recover(pk: TPk, opts?: cc.RepositoryRecoverOptions): Promise<number>;
	    /**
	     * @see IRepository.update
	     */
	    update(model: TModel, opts?: cc.RepositoryUpdateOptions): Promise<TModel>;
	    /**
	     * Executing an query that does something and doesn't expect return value.
	     * This kind of query is executed on all added connections.
	     * @return A promise that resolve to affected rows.
	     * @throws {[errorMsg, affectedRows]} When not all connections have same affected rows.
	     */
	    executeCommand(callback: QueryCallback<TEntity>, atomicSession?: cc.AtomicSession, ...names: string[]): Promise<any>;
	    /**
	     * Executing an query that has returned value.
	     * This kind of query is executed on the primary (first) connection.
	     */
	    executeQuery(callback: QueryCallback<TEntity>, atomicSession?: cc.AtomicSession, name?: string): Promise<any>;
	    /**
	     * Translates from DTO model(s) to entity model(s).
	     */
	    toEntity(dto: TModel | TModel[] | Partial<TModel>, isPartial: boolean): TEntity & TEntity[];
	    /**
	     * Translates from entity model(s) to DTO model(s).
	     */
	    toDTO(entity: TEntity | TEntity[] | Partial<TEntity>, isPartial: boolean): TModel & TModel[];
	    /**
	     * Maps from an array of columns to array of values.
	     * @param pk Object to get values from
	     * @param cols Array of column names
	     */
	    toArr(pk: TPk | TEntity | Partial<TEntity>, cols: string[]): any[];
	    /**
	     * @see IDatabaseConnector.query
	     */
	    protected prepare(callback: QueryCallback<TEntity>, atomicSession?: cc.AtomicSession, ...names: string[]): Promise<any>[];
	    protected buildDeleteState(pk: TPk, isDel: boolean): any;
	    protected setDeleteState(pk: TPk, isDel: boolean, opts?: cc.RepositoryDeleteOptions): Promise<number>;
	}

}
declare module 'back-lib-persistence/dist/app/bases/BatchProcessor' {
	import * as moment from 'moment';
	import * as cc from 'back-lib-common-contracts';
	import { IDatabaseConnector, QueryCallback } from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	import { MonoProcessor } from 'back-lib-persistence/dist/app/bases/MonoProcessor';
	export class BatchProcessor<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType = BigSInt, TUk = NameUk> {
	    protected _mono: MonoProcessor<TEntity, TModel, TPk, TUk>;
	    /**
	     * Gets array of non-primary unique property(ies).
	     */
	    ukCol: string[];
	    	    constructor(_mono: MonoProcessor<TEntity, TModel, TPk, TUk>, dbConnector: IDatabaseConnector);
	    /**
	     * Gets current date time in UTC.
	     */
	    readonly utcNow: moment.Moment;
	    /**
	     * @see IRepository.countAll
	     */
	    countAll(opts?: cc.RepositoryCountAllOptions): Promise<number>;
	    /**
	     * @see IRepository.create
	     */
	    create(model: TModel | TModel[], opts?: cc.RepositoryCreateOptions): Promise<TModel & TModel[]>;
	    /**
	     * @see ISoftDelRepository.deleteSoft
	     */
	    deleteSoft(pk: TPk | TPk[], opts?: cc.RepositoryDeleteOptions): Promise<number>;
	    /**
	     * @see IRepository.deleteHard
	     */
	    deleteHard(pk: TPk | TPk[], opts?: cc.RepositoryDeleteOptions): Promise<number>;
	    /**
	     * @see IRepository.exists
	     */
	    exists(props: TUk, opts?: cc.RepositoryExistsOptions): Promise<boolean>;
	    /**
	     * @see IRepository.findByPk
	     */
	    findByPk(pk: TPk, opts?: cc.RepositoryFindOptions): Promise<TModel>;
	    /**
	     * @see IRepository.page
	     */
	    page(pageIndex: number, pageSize: number, opts?: cc.RepositoryPageOptions): Promise<cc.PagedArray<TModel>>;
	    /**
	     * @see IRepository.patch
	     */
	    patch(model: Partial<TModel> | Partial<TModel>[], opts?: cc.RepositoryPatchOptions): Promise<Partial<TModel> & Partial<TModel>[]>;
	    /**
	     * @see ISoftDelRepository.recover
	     */
	    recover(pk: TPk | TPk[], opts?: cc.RepositoryRecoverOptions): Promise<number>;
	    /**
	     * @see IRepository.update
	     */
	    update(model: TModel | TModel[], opts?: cc.RepositoryUpdateOptions): Promise<TModel & TModel[]>;
	    /**
	     * @see MonoProcessor.executeCommand
	     */
	    executeCommand(callback: QueryCallback<TEntity>, atomicSession?: cc.AtomicSession, ...names: string[]): Promise<any>;
	    /**
	     * @see MonoProcessor.executeQuery
	     */
	    executeQuery(callback: QueryCallback<TEntity>, atomicSession?: cc.AtomicSession, name?: string): Promise<any>;
	    /**
	     * Executes batch operation in transaction.
	     */
	    execBatch(inputs: any[], func: (m: any, opts?: cc.RepositoryOptions) => any, opts?: cc.RepositoryOptions): Promise<any>;
	    /**
	     * @see MonoProcessor.toEntity
	     */
	    toEntity(dto: TModel | TModel[] | Partial<TModel>, isPartial: boolean): TEntity & TEntity[];
	    /**
	     * @see MonoProcessor.toDTO
	     */
	    toDTO(entity: TEntity | TEntity[] | Partial<TEntity>, isPartial: boolean): TModel & TModel[];
	    /**
	     * Maps from an array of columns to array of values.
	     * @param pk Object to get values from
	     * @param cols Array of column names
	     */
	    toArr(pk: TPk | TEntity | Partial<TEntity>, cols: string[]): any[];
	}

}
declare module 'back-lib-persistence/dist/app/bases/VersionQueryBuilder' {
	import { QueryBuilder, QueryBuilderSingle } from 'objection';
	import * as cc from 'back-lib-common-contracts';
	import { IQueryBuilder } from 'back-lib-persistence/dist/app/bases/IQueryBuilder';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	export class VersionQueryBuilder<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType, TUk = NameUk> implements IQueryBuilder<TEntity, TModel, TPk, TUk> {
	    	    constructor(_EntityClass: any);
	    buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryCountAllOptions): QueryBuilder<TEntity>;
	    buildDeleteHard(pk: TPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>): QueryBuilderSingle<number>;
	    buildExists(props: TUk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryExistsOptions): QueryBuilder<TEntity>;
	    buildFind(pk: TPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryFindOptions): QueryBuilder<TEntity>;
	    buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPageOptions): QueryBuilder<TEntity>;
	    buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPatchOptions): QueryBuilder<number>;
	    buildRecoverOpts(pk: TPk, prevOpts: cc.RepositoryRecoverOptions, rawOpts: cc.RepositoryRecoverOptions): cc.RepositoryExistsOptions;
	    buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPatchOptions): QueryBuilder<number>;
	    	}

}
declare module 'back-lib-persistence/dist/app/bases/VersionControlledProcessor' {
	import * as cc from 'back-lib-common-contracts';
	import { IDatabaseConnector } from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	import { MonoProcessor, ProcessorOptions } from 'back-lib-persistence/dist/app/bases/MonoProcessor';
	export class VersionControlledProcessor<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType, TUk = NameUk> extends MonoProcessor<TEntity, TModel, TPk, TUk> {
	    	    	    constructor(EntityClass: any, dbConnector: IDatabaseConnector, options?: ProcessorOptions);
	    create(model: TModel, opts?: cc.RepositoryCreateOptions): Promise<TModel & TModel[]>;
	    patch(model: Partial<TModel>, opts?: cc.RepositoryPatchOptions): Promise<Partial<TModel> & Partial<TModel>[]>;
	    update(model: TModel, opts?: cc.RepositoryUpdateOptions): Promise<TModel & TModel[]>;
	    	    	}

}
declare module 'back-lib-persistence/dist/app/bases/RepositoryBase' {
	import * as cc from 'back-lib-common-contracts';
	import { IDatabaseConnector } from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	import { MonoProcessor, ProcessorOptions } from 'back-lib-persistence/dist/app/bases/MonoProcessor';
	import { BatchProcessor } from 'back-lib-persistence/dist/app/bases/BatchProcessor';
	import { VersionControlledProcessor } from 'back-lib-persistence/dist/app/bases/VersionControlledProcessor';
	export interface RepositoryBaseOptions<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType = BigSInt, TUk = NameUk> extends ProcessorOptions {
	    /**
	     * Used by default version-controlled processor and default batch processor.
	     */
	    monoProcessor?: MonoProcessor<TEntity, TModel, TPk, TUk>;
	    /**
	     * Version-controlled processor
	     */
	    versionProcessor?: VersionControlledProcessor<TEntity, TModel, TPk, TUk>;
	    /**
	     * Providing this will ignore `monoProcessor` and `versionProcessor`.
	     */
	    batchProcessor?: BatchProcessor<TEntity, TModel, TPk, TUk>;
	}
	export abstract class RepositoryBase<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType = BigSInt, TUk = NameUk> implements cc.ISoftDelRepository<TModel, TPk, TUk> {
	    protected _processor: BatchProcessor<TEntity, TModel, TPk, TUk>;
	    constructor(EntityClass: any, dbConnector: IDatabaseConnector, options?: RepositoryBaseOptions<TEntity, TModel, TPk, TUk>);
	    /**
	     * @see IRepository.countAll
	     */
	    countAll(opts?: cc.RepositoryCountAllOptions): Promise<number>;
	    /**
	     * @see IRepository.create
	     */
	    create(model: TModel | TModel[], opts?: cc.RepositoryCreateOptions): Promise<TModel & TModel[]>;
	    /**
	     * @see ISoftDelRepository.deleteSoft
	     */
	    deleteSoft(pk: TPk | TPk[], opts?: cc.RepositoryDeleteOptions): Promise<number>;
	    /**
	     * @see IRepository.deleteHard
	     */
	    deleteHard(pk: TPk | TPk[], opts?: cc.RepositoryDeleteOptions): Promise<number>;
	    /**
	     * @see IRepository.exists
	     */
	    exists(props: TUk, opts?: cc.RepositoryExistsOptions): Promise<boolean>;
	    /**
	     * @see IRepository.findByPk
	     */
	    findByPk(pk: TPk, opts?: cc.RepositoryFindOptions): Promise<TModel>;
	    /**
	     * @see IRepository.page
	     */
	    page(pageIndex: number, pageSize: number, opts?: cc.RepositoryPageOptions): Promise<cc.PagedArray<TModel>>;
	    /**
	     * @see IRepository.patch
	     */
	    patch(model: Partial<TModel> | Partial<TModel>[], opts?: cc.RepositoryPatchOptions): Promise<Partial<TModel> & Partial<TModel>[]>;
	    /**
	     * @see ISoftDelRepository.recover
	     */
	    recover(pk: TPk | TPk[], opts?: cc.RepositoryRecoverOptions): Promise<number>;
	    /**
	     * @see IRepository.update
	     */
	    update(model: TModel | TModel[], opts?: cc.RepositoryUpdateOptions): Promise<TModel & TModel[]>;
	}

}
declare module 'back-lib-persistence/dist/app/connector/KnexDatabaseConnector' {
	import { AtomicSession, IConnectionDetail } from 'back-lib-common-contracts';
	import { EntityBase } from 'back-lib-persistence/dist/app/bases/EntityBase';
	import { IDatabaseConnector, QueryCallback, KnexConnection } from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
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
	export * from 'back-lib-persistence/dist/app/bases/BatchProcessor';
	export * from 'back-lib-persistence/dist/app/bases/EntityBase';
	export * from 'back-lib-persistence/dist/app/bases/IQueryBuilder';
	export * from 'back-lib-persistence/dist/app/bases/MonoProcessor';
	export * from 'back-lib-persistence/dist/app/bases/MonoQueryBuilder';
	export * from 'back-lib-persistence/dist/app/bases/RepositoryBase';
	export * from 'back-lib-persistence/dist/app/bases/TenantQueryBuilder';
	export * from 'back-lib-persistence/dist/app/bases/VersionControlledProcessor';
	export * from 'back-lib-persistence/dist/app/connector/IDatabaseConnector';
	export * from 'back-lib-persistence/dist/app/connector/KnexDatabaseConnector';
	export * from 'back-lib-persistence/dist/app/DatabaseAddOn';
	export * from 'back-lib-persistence/dist/app/Types';

}
