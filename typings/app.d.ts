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
    import { Newable, IModelAutoMapper, IModelValidator } from '@micro-fleet/common'; type ORMClass<U> = Newable<U> & typeof ORMModelBase;
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
        static getTranslator: <TT extends ORMModelBase>(this: ORMClass<TT>) => IModelAutoMapper<TT>;
        static getValidator: <VT extends ORMModelBase>(this: ORMClass<VT>) => IModelValidator<VT>;
        static from: <FT extends ORMModelBase>(this: ORMClass<FT>, source: object) => FT;
        static fromMany: <FT extends ORMModelBase>(this: ORMClass<FT>, source: object[]) => FT[];
    }
    export {};

}
declare module '@micro-fleet/persistence/dist/app/interfaces' {
    import { PagedData, Maybe, IdBase, SingleId } from '@micro-fleet/common';
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
             * Database engine port.
             */
            port?: number;
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
        pool?: {
            min?: number;
            max?: number;
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
         * Tenant Id
         */
        tenantId?: string;
    }
    export interface RepositoryCountAllOptions extends RepositoryExistsOptions {
    }
    export interface RepositoryCreateOptions extends RepositoryOptions {
        /**
         * Whether to refetch created records.
         *
         * Default is false.
         */
        refetch?: boolean;
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
    export interface RepositoryPatchOptions extends RepositoryCreateOptions {
    }
    export interface RepositoryUpdateOptions extends RepositoryCreateOptions {
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
         * Inserts one `model` to database.
         *
         * @param {TDomain} model The model to be inserted.
         */
        create(model: TDomain, options?: RepositoryCreateOptions): Promise<TDomain>;
        /**
         * Inserts many `models` to database.
         *
         * @param {TDomain[]} models The models to be inserted.
         */
        createMany(models: TDomain[], options?: RepositoryCreateOptions): Promise<TDomain[]>;
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
        page(options: RepositoryPageOptions): Promise<PagedData<TDomain>>;
        /**
         * Updates new value for specified properties in `model`.
         */
        patch(model: Partial<TDomain>, options?: RepositoryPatchOptions): Promise<Maybe<Partial<TDomain>>>;
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
    export type QueryCallback<TORM extends Model> = (queryBuilder: QueryBuilder<TORM>, boundEntityClass?: any) => QueryCallbackReturn;
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
    import { DbConnectionDetail } from '@micro-fleet/persistence/dist/app/interfaces';
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
        beforeInitConnector(handler: (connDetail: DbConnectionDetail) => void): void;
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
declare module '@micro-fleet/persistence/dist/app/bases/GeneralCrudRepositoryBase' {
    import { QueryBuilder } from 'objection';
    import { PagedData, Maybe, SingleId, IdBase, ITranslatable } from '@micro-fleet/common';
    import { AtomicSession } from '@micro-fleet/persistence/dist/app/atom/AtomicSession';
    import { IDatabaseConnector, QueryCallbackReturn, QueryCallback } from '@micro-fleet/persistence/dist/app/connector/IDatabaseConnector';
    import * as it from '@micro-fleet/persistence/dist/app/interfaces';
    import { ORMModelBase } from '@micro-fleet/persistence/dist/app/bases/ORMModelBase';
    /**
     * A repository implementation with common CRUD operations for relational databases.
     * It does not use any specific techniques of a particular database.
     */
    export class GeneralCrudRepositoryBase<TORM extends ORMModelBase, TDomain extends object, TId extends IdBase = SingleId> implements it.IRepository<TDomain, TId> {
        protected _ORMClass: ITranslatable;
        protected _DomainClass: ITranslatable;
        protected _dbConnector: IDatabaseConnector;
        /**
         * EntityClass' primary key properties.
         * Eg: ['id', 'tenantId']
         */
        protected readonly _idProps: string[];
        constructor(_ORMClass: ITranslatable, _DomainClass: ITranslatable, _dbConnector: IDatabaseConnector);
        /**
         * @see IRepository.countAll
         */
        countAll(opts?: it.RepositoryCountAllOptions): Promise<number>;
        protected _buildCountAllQuery(query: QueryBuilder<TORM>, opts: it.RepositoryCountAllOptions): QueryCallbackReturn;
        /**
         * @see IRepository.create
         */
        create(domainModel: TDomain, opts?: it.RepositoryCreateOptions): Promise<TDomain>;
        protected _buildCreateQuery(query: QueryBuilder<TORM>, model: TDomain, ormModel: TORM, opts: it.RepositoryCreateOptions): QueryCallbackReturn;
        /**
         * @see IRepository.createMany
         */
        createMany(domainModels: TDomain[], opts?: it.RepositoryCreateOptions): Promise<TDomain[]>;
        protected _buildCreateManyQuery(query: QueryBuilder<TORM>, models: TDomain[], ormModels: TORM[], opts: it.RepositoryCreateOptions): QueryCallbackReturn;
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
        page(opts: it.RepositoryPageOptions): Promise<PagedData<TDomain>>;
        protected _buildPageQuery(query: QueryBuilder<TORM>, opts: it.RepositoryPageOptions): QueryCallbackReturn;
        /**
         * @see IRepository.patch
         */
        patch(domainModel: Partial<TDomain>, opts?: it.RepositoryPatchOptions): Promise<Maybe<TDomain>>;
        protected _buildPatchQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, ormModel: TORM, opts: it.RepositoryPatchOptions): QueryCallbackReturn;
        /**
         * @see IRepository.update
         */
        update(domainModel: TDomain, opts?: it.RepositoryUpdateOptions): Promise<Maybe<TDomain>>;
        protected _buildUpdateQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, ormModel: TORM, opts: it.RepositoryUpdateOptions): QueryCallbackReturn;
        protected executeQuery(callback: QueryCallback<TORM>, atomicSession?: AtomicSession): Promise<any>;
        /**
         * Translates from a domain model to an ORM model.
         */
        protected toORMModel(domainModel: TDomain | Partial<TDomain>, isPartial: boolean): TORM;
        /**
         * Translates from domain models to ORM models.
         */
        protected toORMModelMany(domainModels: TDomain[] | Partial<TDomain>[], isPartial: boolean): TORM[];
        /**
         * Translates from an ORM model to a domain model.
         */
        protected toDomainModel(ormModel: TORM | Partial<TORM>, isPartial: boolean): TDomain;
        /**
         * Translates from ORM models to domain models.
         */
        protected toDomainModelMany(ormModels: TORM[] | Partial<TORM>[], isPartial: boolean): TDomain[];
    }

}
declare module '@micro-fleet/persistence/dist/app/bases/PgCrudRepositoryBase' {
    import { QueryBuilder } from 'objection';
    import { SingleId, IdBase, ITranslatable } from '@micro-fleet/common';
    import { IDatabaseConnector, QueryCallbackReturn } from '@micro-fleet/persistence/dist/app/connector/IDatabaseConnector';
    import * as it from '@micro-fleet/persistence/dist/app/interfaces';
    import { ORMModelBase } from '@micro-fleet/persistence/dist/app/bases/ORMModelBase';
    import { GeneralCrudRepositoryBase } from '@micro-fleet/persistence/dist/app/bases/GeneralCrudRepositoryBase';
    export class PgCrudRepositoryBase<TORM extends ORMModelBase, TDomain extends object, TId extends IdBase = SingleId> extends GeneralCrudRepositoryBase<TORM, TDomain, TId> {
        constructor(ORMClass: ITranslatable, DomainClass: ITranslatable, dbConnector: IDatabaseConnector);
        /**
         * @override
         */
        protected _buildCountAllQuery(query: QueryBuilder<TORM>, opts: it.RepositoryCountAllOptions): QueryCallbackReturn;
        /**
         * @override
         */
        protected _buildCreateQuery(query: QueryBuilder<TORM>, model: TDomain, ormModel: TORM, opts: it.RepositoryCreateOptions): QueryCallbackReturn;
        /**
         * @override
         */
        protected _buildCreateManyQuery(query: QueryBuilder<TORM>, models: TDomain[], ormModels: TORM[], opts: it.RepositoryCreateOptions): QueryCallbackReturn;
        /**
         * @override
         */
        protected _buildPatchQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, ormModel: TORM, opts: it.RepositoryPatchOptions): QueryCallbackReturn;
        /**
         * @override
         */
        protected _buildUpdateQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, ormModel: TORM, opts: it.RepositoryUpdateOptions): QueryCallbackReturn;
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
    export * from '@micro-fleet/persistence/dist/app/bases/GeneralCrudRepositoryBase';
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
