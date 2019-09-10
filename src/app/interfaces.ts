import { PagedData, Maybe, IdBase, SingleId } from '@micro-fleet/common'

import { AtomicSession } from './atom/AtomicSession'


export enum SortType { ASC = 'asc', DESC = 'desc' }

export enum FilterOperator {
    CONTAINS = 'con',
    ENDS_WITH = 'end',
    STARTS_WITH = 'start',
    LESS_THAN = 'lt',
    LESS_OR_EQUAL = 'le',
    GREATER_THAN = 'gt',
    GREATER_OR_EQUAL = 'ge',
    EQUALS = 'eq',
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
        address: string,

        /**
         * Database engine port.
         */
        port?: number,

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
    },

    pool?: {
        /*
         * Minimum number of connections in pool.
         * Default is 2.
         */
        min?: number,

        /*
         * Maximum number of connections in pool.
         * Default is 10.
         */
        max?: number,
    }
}


// tslint:disable: interface-name

/**
 * Options for repository's operations.
 * Note that different operations care about different option properties.
 * @deprecated
 */
export interface RepositoryOptions {
    /**
     * A transaction to which this operation is restricted.
     */
    atomicSession?: AtomicSession
}

export interface RepositoryExistsOptions extends RepositoryOptions {
    /**
     * Tenant Id
     */
    tenantId?: string,
}

export interface RepositoryCountAllOptions extends RepositoryExistsOptions {
}

export interface RepositoryCreateOptions extends RepositoryOptions {
    /**
     * Whether to refetch created records.
     *
     * Default is false.
     */
    refetch?: boolean,
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
    relations?: object,

    /**
     * Specifies field names to fetch. These fields must not be relation.
     */
    fields?: string[],
}

export interface RepositoryPageOptions extends RepositoryFindOptions {
    pageIndex: number
    pageSize: number
    sortBy?: string
    sortType?: SortType
    filterBy?: string
    filterValue?: any
    filterOperator?: FilterOperator
}

export interface RepositoryPatchOptions extends RepositoryCreateOptions {
}

export interface RepositoryUpdateOptions extends RepositoryCreateOptions {
}

// tslint:enable: interface-name


/**
 * Provides common CRUD operations.
 */
export interface IRepository<TDomain, TId extends IdBase = SingleId> {

    /**
     * Counts all records in a table.
     */
    countAll(options?: RepositoryCountAllOptions): Promise<number>

    /**
     * Inserts one `model` to database.
     *
     * @param {TDomain} model The model to be inserted.
     */
    create(model: TDomain, options?: RepositoryCreateOptions): Promise<TDomain>

    /**
     * Inserts many `models` to database.
     *
     * @param {TDomain[]} models The models to be inserted.
     */
    createMany(models: TDomain[], options?: RepositoryCreateOptions): Promise<TDomain[]>

    /**
     * Permanently deletes one record.
     *
     * @param {TId} id The id object.
     */
    deleteSingle(id: TId, options?: RepositoryDeleteOptions): Promise<number>

    /**
     * Permanently deletes many records.
     */
    deleteMany(idList: TId[], options?: RepositoryDeleteOptions): Promise<number>

    /**
     * Checks if a record exists or not.
     *
     * @param {DTO model} uniqPartial An object with non-primary unique properties.
     */
    exists(uniqPartial: Partial<TDomain>, options?: RepositoryExistsOptions): Promise<boolean>

    /**
     * Selects only one record with `id`.
     *
     * @param {TId} id The ID object.
     */
    findById(id: TId, options?: RepositoryFindOptions): Promise<Maybe<TDomain>>

    /**
     * Fetches a limited number of records at specified offset.
     *
     * @param {RepositoryPageOptions} options Page options.
     */
    page(options: RepositoryPageOptions): Promise<PagedData<TDomain>>

    /**
     * Updates new value for specified properties in `model`.
     */
    patch(model: Partial<TDomain>, options?: RepositoryPatchOptions): Promise<Maybe<Partial<TDomain>>>

    /**
     * Replaces a record with `model`.
     */
    update(model: TDomain, options?: RepositoryUpdateOptions): Promise<Maybe<TDomain>>
}
