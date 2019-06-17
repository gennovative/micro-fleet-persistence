import { PagedArray, Maybe, IdBase, SingleId } from '@micro-fleet/common'

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
     * Whether to include records marked as archived.
     * Default to `false`.
     */
    // includeArchived?: boolean

    /**
     * Whether to include records marked as soft-deleted.
     * Default to `false`.
     */
    // includeDeleted?: boolean

    /**
     * Tenant Id
     */
    tenantId?: string,
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

export interface RepositoryPatchOptions extends RepositoryOptions {
}

export interface RepositoryUpdateOptions extends RepositoryOptions {
}

export interface RepositoryRecoverOptions extends RepositoryOptions {
}

export interface RepositorySetMainOptions extends RepositoryOptions {
}

export interface RepositoryDelVersionOptions extends RepositoryOptions {
    olderThan?: Date
}

export interface RepositoryRestrictOptions extends RepositoryOptions {
}


/**
 * Provides common CRUD operations.
 */
export interface IRepository<TModel, TPk extends IdBase = SingleId> {

    /**
     * Counts all records in a table.
     */
    countAll(options?: RepositoryCountAllOptions): Promise<number>

    /**
     * Inserts one or more `model` to database.
     *
     * @param {DTO model} model The model to be inserted.
     */
    create(model: TModel, options?: RepositoryCreateOptions): Promise<TModel>

    /**
     * Permanently deletes one record.
     *
     * @param {PK Type} pk The primary key object.
     */
    deleteSingle(pk: TPk, options?: RepositoryDeleteOptions): Promise<number>

    /**
     * Permanently deletes many records.
     */
    deleteMany(pkList: TPk[], options?: RepositoryDeleteOptions): Promise<number>

    /**
     * Checks if a record exists or not.
     *
     * @param {DTO model} uniqPartial An object with non-primary unique properties.
     */
    exists(uniqPartial: Partial<TModel>, options?: RepositoryExistsOptions): Promise<boolean>

    /**
     * Selects only one record with `pk`.
     *
     * @param {PK Type} pk The primary key object.
     */
    findByPk(pk: TPk, options?: RepositoryFindOptions): Promise<Maybe<TModel>>

    /**
     * Fetches a limited number of records at specified offset.
     *
     * @param {RepositoryPageOptions} options Page options.
     */
    page(options: RepositoryPageOptions): Promise<PagedArray<TModel>>

    /**
     * Updates new value for specified properties in `model`.
     */
    patch(model: Partial<TModel>, options?: RepositoryPatchOptions): Promise<Maybe<TModel>>

    /**
     * Replaces a record with `model`.
     */
    update(model: TModel, options?: RepositoryUpdateOptions): Promise<Maybe<TModel>>
}


export interface LegacyRepositoryPageOptions extends RepositoryCountAllOptions {
    sortBy?: string
    sortType?: SortType
    excludeDeleted?: boolean
}

/**
 * Provides common CRUD operations, based on Unit of Work pattern.
 * @deprecated
 */
export interface ILegacyRepository<TModel, TPk extends PkType = string, TUk = NameUk> {

    /**
     * Counts all records in a table.
     */
    countAll(options?: RepositoryCountAllOptions): Promise<number>

    /**
     * Inserts one or more `model` to database.
     * @param {DTO model} model The model to be inserted.
     */
    create(model: TModel | TModel[], options?: RepositoryCreateOptions): Promise<TModel | TModel[]>

    /**
     * Permanently deletes one or many records.
     * @param {PK Type} pk The primary key object.
     */
    deleteHard(pk: TPk | TPk[], options?: RepositoryDeleteOptions): Promise<number>

    /**
     * Checks if a record exists or not.
     * @param {TUk} props An object with non-primary unique properties.
     */
    exists(props: TUk, options?: RepositoryExistsOptions): Promise<boolean>

    /**
     * Selects only one record with `pk`.
     * @param {PK Type} pk The primary key object.
     */
    findByPk(pk: TPk, options?: RepositoryFindOptions): Promise<TModel>

    /**
     * Selects `pageSize` number of records at page `pageIndex`.
     * @param {number} pageIndex Index of the page.
     * @param {number} pageSize Number of records in a page.
     */
    page(pageIndex: number, pageSize: number, options?: RepositoryPageOptions): Promise<PagedArray<TModel>>

    /**
     * Updates new value for specified properties in `model`.
     */
    patch(model: Partial<TModel> | Partial<TModel>[], options?: RepositoryPatchOptions): Promise<Partial<TModel> | Partial<TModel>[]>

    /**
     * Replaces a record with `model`.
     */
    update(model: TModel | TModel[], options?: RepositoryUpdateOptions): Promise<TModel | TModel[]>
}

/**
 * Provides common operations to soft-delete and recover models.
 */
export interface ISoftDelRepository<TModel, TPk extends PkType = string, TUk = NameUk>
        extends ILegacyRepository<TModel, TPk, TUk> {

    /**
     * Marks one or many records with `pk` as deleted.
     * @param {PK Type} pk The primary key object.
     */
    deleteSoft(pk: TPk | TPk[], options?: RepositoryDeleteOptions): Promise<number>

    /**
     * Marks one or many records with `pk` as NOT deleted.
     * @param {PK Type} pk The primary key object.
     */
    recover(pk: TPk | TPk[], options?: RepositoryRecoverOptions): Promise<number>

}

/**
 * Provides common operations to control models' revisions.
 */
export interface IVersionRepository<TModel extends IVersionControlled, TPk extends PkType = string, TUk = NameUk>
        extends ISoftDelRepository<TModel, TPk, TUk> {

    /**
     * Permanently deletes one or many version of a record.
     * Can be filtered with `olderThan` option.
     * @param {PK Type} pk The primary key object.
     */
    deleteHardVersions(pk: TPk, versions: number | number[], options?: RepositoryDelVersionOptions): Promise<number>

    /**
     * Selects `pageSize` number of version of a record at page `pageIndex`.
     * @param {PK Type} pk The primary key object.
     * @param {number} pageIndex Index of the page.
     * @param {number} pageSize Number of records in a page.
     */
    pageVersions(pk: TPk, pageIndex: number, pageSize: number, options?: RepositoryPageOptions): Promise<number>

    /**
     * Marks a revision as main version of the record with `pk`.
     * @param {PK Type} pk The primary key object.
     * @param {number} version The version number.
     */
    setAsMain(pk: TPk, version: number, options?: RepositorySetMainOptions): Promise<number>

    /**
     * Removes old versions to keep number of version to be equal or less than `nVersion`.
     * @param {PK Type} pk The primary key object.
     * @param {number} nVersion Number of versions to keep.
     */

    restrictQuantity(pk: TPk, nVersion: number, options?: RepositoryRestrictOptions): void
}
