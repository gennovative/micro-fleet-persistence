/// <reference types="debug" />
const debug: debug.IDebugger = require('debug')('mcft:persistence:GeneralRepoBase')

import { QueryBuilder, raw } from 'objection'
import pick = require('lodash.pick')
import { Guard, PagedData, Maybe, SingleId, IdBase, ITranslatable,
    decorators as d,
    MinorException} from '@micro-fleet/common'

import { AtomicSession } from '../atom/AtomicSession'
import { IDatabaseConnector, QueryCallbackReturn,
    QueryCallback } from '../connector/IDatabaseConnector'
import * as it from '../interfaces'
import { ORMModelBase } from './ORMModelBase'


/**
 * A repository implementation with common CRUD operations for relational databases.
 * It does not use any specific techniques of a particular database.
 */
@d.injectable()
export class GeneralCrudRepositoryBase<TORM extends ORMModelBase, TDomain extends object, TId extends IdBase = SingleId>
    implements it.IRepository<TDomain, TId> {

    /**
     * EntityClass' primary key properties.
     * Eg: ['id', 'tenantId']
     */
    protected readonly $idProps: string[]


    constructor(
            @d.unmanaged() protected $ORMClass: ITranslatable,
            @d.unmanaged() protected $DomainClass: ITranslatable,
            @d.unmanaged() protected $dbConnector: IDatabaseConnector) {
        Guard.assertArgDefined('EntityClass', $ORMClass)
        Guard.assertIsTruthy($ORMClass['tableName'],
            'Param "ORMClass" must have tableName. It had better inherit "ORMModelBase"!')
        Guard.assertArgDefined('DomainClass', $DomainClass)
        Guard.assertArgDefined('dbConnector', $dbConnector)

        this.$idProps = this.$ORMClass['idProp']
    }


    /**
     * @see IRepository.countAll
     */
    public async countAll(opts: it.RepositoryCountAllOptions = {}): Promise<number> {
        const result = await this.executeQuery(
            query => {
                const q = this.$buildCountAllQuery(query, opts) as QueryBuilder<any>
                debug('COUNT ALL: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )

        return (result[0]['total'])
    }

    protected $buildCountAllQuery(query: QueryBuilder<TORM>,
            opts: it.RepositoryCountAllOptions): QueryCallbackReturn {
        query.select(raw('count(*) as total'))
        opts.tenantId && query.where('tenantId', opts.tenantId)
        return query
    }

    /**
     * @see IRepository.create
     */
    public create(domainModel: TDomain, opts: it.RepositoryCreateOptions = {}): Promise<TDomain> {
        const ormModelOrModels = this.toORMModel(domainModel, false)

        return this.executeQuery(
            query => {
                const q = this.$buildCreateQuery(query, domainModel, ormModelOrModels, opts) as QueryBuilder<any>
                debug('CREATE: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
        .then((refetch: TORM) => this.toDomainModel(refetch, false))
    }

    protected $buildCreateQuery(query: QueryBuilder<TORM>, model: TDomain, ormModel: TORM,
            opts: it.RepositoryCreateOptions): QueryCallbackReturn {
        return opts.refetch
            ? query.insertAndFetch(ormModel) as any
            : query.insert(ormModel) as any
    }

    /**
     * @see IRepository.createMany
     */
    public createMany(domainModels: TDomain[], opts: it.RepositoryCreateOptions = {}): Promise<TDomain[]> {
        const ormModelOrModels = this.toORMModelMany(domainModels, false)

        return this.executeQuery(
            query => {
                const q = this.$buildCreateManyQuery(query, domainModels, ormModelOrModels, opts) as QueryBuilder<any>
                debug('CREATE MANY: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
        .then((refetch: TORM[]) => this.toDomainModelMany(refetch, false))
    }

    protected $buildCreateManyQuery(query: QueryBuilder<TORM>, models: TDomain[], ormModels: TORM[],
            opts: it.RepositoryCreateOptions): QueryCallbackReturn {
        // Bulk insert only works with PostgreSQL, MySQL, and SQL Server 2008 RC2
        return opts.refetch
            ? query.insertAndFetch(ormModels) as any
            : query.insert(ormModels) as any
    }

    /**
     * @see IRepository.deleteSingle
     */
    public deleteSingle(id: TId, opts: it.RepositoryDeleteOptions = {}): Promise<number> {
        return this.executeQuery(
            query => {
                const q = this.$buildDeleteSingleQuery(query, id, opts) as QueryBuilder<any>
                debug('DELETE SINGLE: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
    }

    protected $buildDeleteSingleQuery(query: QueryBuilder<TORM>, id: TId,
            opts: it.RepositoryDeleteOptions): QueryCallbackReturn {
        return query.deleteById(id.toArray())
    }

    /**
     * @see IRepository.deleteMany
     */
    public deleteMany(idList: TId[], opts: it.RepositoryDeleteOptions = {}): Promise<number> {
        return this.executeQuery(
            query => {
                const q = this.$buildDeleteManyQuery(query, idList, opts) as QueryBuilder<any>
                debug('DELETE MANY: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
    }

    protected $buildDeleteManyQuery(query: QueryBuilder<TORM>, idList: TId[],
            opts: it.RepositoryDeleteOptions): QueryCallbackReturn {
        const q = query.delete()
            .whereInComposite(
                this.$ORMClass['idColumn'],
                idList.map(id => id.toArray()),
            )
        return q
    }

    /**
     * @see IRepository.exists
     */
    public async exists(uniqPartial: Partial<TDomain>, opts: it.RepositoryExistsOptions = {}): Promise<boolean> {
        const result = await this.executeQuery(
            query => {
                const q = this.$buildExistsQuery(query, uniqPartial, opts) as QueryBuilder<any>
                debug('EXIST: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )

        return result[0]['total'] != 0
    }

    protected $buildExistsQuery(query: QueryBuilder<TORM>, uniqPartial: Partial<TDomain>,
            opts: it.RepositoryExistsOptions): QueryCallbackReturn {
        query
            .count(`* as total`)
            .andWhere(builder => {
                // tslint:disable-next-line: prefer-const
                for (let [key, val] of Object.entries(uniqPartial)) {
                    if (val === null) {
                        builder.orWhereNull(key)
                    } else if (val !== undefined) {
                        builder.orWhere(key, '=', val)
                    }
                }
            })
        opts.tenantId && query.where('tenantId', opts.tenantId)
        return query
    }

    /**
     * @see IRepository.findById
     */
    public findById(id: TId, opts: it.RepositoryFindOptions = {}): Promise<Maybe<TDomain>> {
        return this.executeQuery(
            query => {
                const q = this.$buildFindByIdQuery(query, id, opts) as QueryBuilder<any>
                debug('FIND BY (%o): %s', id, q.toSql())
                return q
            },
            opts.atomicSession
        )
        .then(foundORM => {
            return foundORM
                ? Maybe.Just(this.toDomainModel(foundORM, false))
                : Maybe.Nothing()
        }) as Promise<Maybe<TDomain>>
    }

    protected $buildFindByIdQuery(query: QueryBuilder<TORM>, id: TId,
            opts: it.RepositoryFindOptions): QueryCallbackReturn {
        const q = query.findById(id.toArray())
        if (opts.relations) {
            if (typeof opts.relations !== 'object') {
                throw new MinorException('`relations` only accepts object format')
            }
            q.eager(opts.relations)
        }
        opts.fields && q.select(opts.fields)
        return q
    }

    /**
     * @see IRepository.page
     */
    public async page(opts: it.RepositoryPageOptions): Promise<PagedData<TDomain>> {
        type PageResult = { total: number, results: Array<TORM> }
        const foundList: PageResult = await this.executeQuery(
            query => {
                const q = this.$buildPageQuery(query, opts) as QueryBuilder<any>
                debug('PAGE: %s', q.toSql())
                return q
            },
            opts.atomicSession
        )

        if (!foundList) {
            return new PagedData<TDomain>()
        }
        const dtoList: TDomain[] = this.toDomainModelMany(foundList.results, false) as TDomain[]
        return new PagedData<TDomain>(dtoList, foundList.total)
    }

    protected $buildPageQuery(query: QueryBuilder<TORM>,
            opts: it.RepositoryPageOptions): QueryCallbackReturn {
        const pageIndex = Math.max(0, opts.pageIndex - 1)
        const q = query
            .page(pageIndex, opts.pageSize)

        opts.tenantId && q.where('tenantId', opts.tenantId)
        opts.relations && q.eager(opts.relations)
        opts.fields && q.select(opts.fields)
        opts.sortBy && q.orderBy(opts.sortBy, opts.sortType || it.SortType.ASC)
        return q
    }

    /**
     * @see IRepository.patch
     */
    public async patch(domainModel: Partial<TDomain>, opts: it.RepositoryPatchOptions = {}): Promise<Maybe<TDomain>> {
        const ormModel = this.toORMModel(domainModel, true) as TORM

        const refetchedEntities: TORM[] = await this.executeQuery(
            query => {
                const q = this.$buildPatchQuery(query, domainModel, ormModel, opts) as QueryBuilder<any>
                debug('PATCH: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
        return (refetchedEntities.length > 0)
            ? Maybe.Just(this.toDomainModel(refetchedEntities[0], false))
            : Maybe.Nothing()
    }

    protected $buildPatchQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, ormModel: TORM,
            opts: it.RepositoryPatchOptions): QueryCallbackReturn {
        const idCondition = pick(ormModel, this.$idProps)
        const q = opts.refetch
            ? query.patchAndFetch(ormModel)
            : query.patch(ormModel)
        return q.where(idCondition)
    }

    /**
     * @see IRepository.update
     */
    public async update(domainModel: TDomain, opts: it.RepositoryUpdateOptions = {}): Promise<Maybe<TDomain>> {
        const ormModel = this.toORMModel(domainModel, false) as TORM

        const refetchedEntities: TORM[] = await this.executeQuery(
            query => {
                const q = this.$buildUpdateQuery(query, domainModel, ormModel, opts) as QueryBuilder<any>
                debug('UPDATE: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
        return (refetchedEntities.length > 0)
            ? Maybe.Just(this.toDomainModel(refetchedEntities[0], false))
            : Maybe.Nothing()
    }

    protected $buildUpdateQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, ormModel: TORM,
            opts: it.RepositoryUpdateOptions): QueryCallbackReturn {
        const idCondition = pick(ormModel, this.$idProps)
        const q = opts.refetch
            ? query.updateAndFetch(ormModel)
            : query.update(ormModel)
        return q.where(idCondition)
    }


    protected executeQuery(callback: QueryCallback<TORM>, atomicSession?: AtomicSession): Promise<any> {
        return this.$dbConnector.prepare(this.$ORMClass as any, <any>callback, atomicSession)
    }

    /**
     * Translates from a domain model to an ORM model.
     */
    protected toORMModel(domainModel: TDomain | Partial<TDomain>, isPartial: boolean): TORM {
        if (!domainModel) { return null }

        const translator = this.$ORMClass.getTranslator()
        const ormModel: any = (isPartial)
            ? translator.partial(domainModel, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.whole(domainModel, { enableValidation: false })

        return ormModel
    }

    /**
     * Translates from domain models to ORM models.
     */
    protected toORMModelMany(domainModels: TDomain[] | Partial<TDomain>[], isPartial: boolean): TORM[] {
        // ModelAutoMapper can handle both single and array of models
        // We separate into two methods for prettier typing.
        return this.toORMModel(domainModels as any, isPartial as any) as any
    }

    /**
     * Translates from an ORM model to a domain model.
     */
    protected toDomainModel(ormModel: TORM | Partial<TORM>, isPartial: boolean): TDomain {
        if (!ormModel) { return null }

        const translator = this.$DomainClass.getTranslator()
        const domainModel: any = (isPartial)
            ? translator.partial(ormModel, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.whole(ormModel, { enableValidation: false })

        return domainModel
    }

    /**
     * Translates from ORM models to domain models.
     */
    protected toDomainModelMany(ormModels: TORM[] | Partial<TORM>[], isPartial: boolean): TDomain[] {
        // ModelAutoMapper can handle both single and array of models
        // We separate into two methods for prettier typing.
        return this.toDomainModel(ormModels as any, isPartial as any) as any
    }
}
