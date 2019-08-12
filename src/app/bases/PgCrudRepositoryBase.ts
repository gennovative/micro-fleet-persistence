/// <reference types="debug" />
const debug: debug.IDebugger = require('debug')('mcft:persistence:PgRepoBase')

import { QueryBuilder, raw } from 'objection'
import pick = require('lodash/pick')
import { Guard, PagedData, injectable, unmanaged, ModelAutoMapper,
    Maybe, SingleId, IdBase, Newable} from '@micro-fleet/common'

import { AtomicSession } from '../atom/AtomicSession'
import { IDatabaseConnector, QueryCallbackReturn,
    QueryCallback } from '../connector/IDatabaseConnector'
import * as it from '../interfaces'
import { ORMModelBase } from './ORMModelBase'


@injectable()
export abstract class PgCrudRepositoryBase<TORM extends ORMModelBase, TDomain extends object, TId extends IdBase = SingleId>
    implements it.IRepository<TDomain, TId> {

    /**
     * EntityClass' primary key properties.
     * Eg: ['id', 'tenantId']
     */
    private readonly _idProps: string[]


    constructor(
            @unmanaged() protected _EntityClass: Newable,
            @unmanaged() protected _DomainClass: Newable,
            @unmanaged() protected _dbConnector: IDatabaseConnector) {
        Guard.assertArgDefined('EntityClass', _EntityClass)
        Guard.assertIsTruthy(_EntityClass['tableName'],
            'Param "EntityClass" must have tableName. It had better inherit "ORMModelBase"!')
        Guard.assertArgDefined('DomainClass', _DomainClass)
        Guard.assertArgDefined('dbConnector', _dbConnector)

        this._idProps = this._EntityClass['idProp']
    }


    /**
     * @see IRepository.countAll
     */
    public async countAll(opts: it.RepositoryCountAllOptions = {}): Promise<number> {
        const result = await this.executeQuery(
            query => {
                const q = this._buildCountAllQuery(query, opts) as QueryBuilder<any>
                debug('COUNT ALL: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )

        return (result[0]['total'])
    }

    protected _buildCountAllQuery(query: QueryBuilder<TORM>,
            opts: it.RepositoryCountAllOptions): QueryCallbackReturn {
        // Postgres returns count result as int64, so the pg driver returns string.
        // We cast it to int32 to be a valid NodeJS number
        query.select(raw('CAST(count(*) AS INTEGER) as total'))
        opts.tenantId && query.where('tenantId', opts.tenantId)
        return query
    }

    /**
     * @see IRepository.create
     */
    public create(model: Partial<TDomain>, opts: it.RepositoryCreateOptions = {}): Promise<TDomain> {
        const entity = this.toEntity(model, false) as TORM

        return this.executeQuery(
            query => {
                const q = this._buildCreateQuery(query, model, entity, opts) as QueryBuilder<any>
                debug('CREATE: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
        .then((refetch: TORM) => this.toDomainModel(refetch, false))
    }

    protected _buildCreateQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, entity: TORM,
            opts: it.RepositoryCreateOptions): QueryCallbackReturn {
        return query.insert(entity).returning('*') as any
    }

    /**
     * @see IRepository.deleteSingle
     */
    public deleteSingle(id: TId, opts: it.RepositoryDeleteOptions = {}): Promise<number> {
        return this.executeQuery(
            query => {
                const q = this._buildDeleteSingleQuery(query, id, opts) as QueryBuilder<any>
                debug('DELETE SINGLE: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
    }

    protected _buildDeleteSingleQuery(query: QueryBuilder<TORM>, id: TId,
            opts: it.RepositoryDeleteOptions): QueryCallbackReturn {
        return query.deleteById(id.toArray())
    }

    /**
     * @see IRepository.deleteMany
     */
    public deleteMany(idList: TId[], opts: it.RepositoryDeleteOptions = {}): Promise<number> {
        return this.executeQuery(
            query => {
                const q = this._buildDeleteManyQuery(query, idList, opts) as QueryBuilder<any>
                debug('DELETE MANY: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
    }

    protected _buildDeleteManyQuery(query: QueryBuilder<TORM>, idList: TId[],
            opts: it.RepositoryDeleteOptions): QueryCallbackReturn {
        const q = query.delete()
            .whereInComposite(
                this._EntityClass['idColumn'],
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
                const q = this._buildExistsQuery(query, uniqPartial, opts) as QueryBuilder<any>
                debug('EXIST: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )

        return result[0]['total'] != 0
    }

    protected _buildExistsQuery(query: QueryBuilder<TORM>, uniqPartial: Partial<TDomain>,
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
                const q = this._buildFindByIdQuery(query, id, opts) as QueryBuilder<any>
                debug('FIND BY (%o): %s', id, q.toSql())
                return q
            },
            opts.atomicSession
        )
        .then(foundEnt => {
            return foundEnt
                ? Maybe.Just(this.toDomainModel(foundEnt, false))
                : Maybe.Nothing()
        }) as Promise<Maybe<TDomain>>
    }

    protected _buildFindByIdQuery(query: QueryBuilder<TORM>, id: TId,
            opts: it.RepositoryFindOptions): QueryCallbackReturn {
        const q = query.findById(id.toArray())
        opts.relations && q.eager(opts.relations)
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
                const q = this._buildPageQuery(query, opts) as QueryBuilder<any>
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

    protected _buildPageQuery(query: QueryBuilder<TORM>,
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
    public async patch(model: Partial<TDomain>, opts: it.RepositoryPatchOptions = {}): Promise<Maybe<TDomain>> {
        const entity = this.toEntity(model, true) as TORM

        const refetchedEntities: TORM[] = await this.executeQuery(
            query => {
                const q = this._buildPatchQuery(query, model, entity, opts) as QueryBuilder<any>
                debug('PATCH: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
        return (refetchedEntities.length > 0)
            ? Maybe.Just(this.toDomainModel(refetchedEntities[0], false))
            : Maybe.Nothing()
    }

    protected _buildPatchQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, entity: TORM,
            opts: it.RepositoryPatchOptions): QueryCallbackReturn {
        const idCondition = pick(entity, this._idProps)
        const q = query.patch(entity).where(idCondition).returning('*')
        return q
    }

    /**
     * @see IRepository.update
     */
    public async update(model: TDomain, opts: it.RepositoryUpdateOptions = {}): Promise<Maybe<TDomain>> {
        const entity = this.toEntity(model, false) as TORM

        const refetchedEntities: TORM[] = await this.executeQuery(
            query => {
                const q = this._buildUpdateQuery(query, model, entity, opts) as QueryBuilder<any>
                debug('UPDATE: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
        return (refetchedEntities.length > 0)
            ? Maybe.Just(this.toDomainModel(refetchedEntities[0], false))
            : Maybe.Nothing()
    }

    protected _buildUpdateQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, entity: TORM,
            opts: it.RepositoryUpdateOptions): QueryCallbackReturn {
        const idCondition = pick(entity, this._idProps)
        return query.update(entity).where(idCondition).returning('*')
    }


    protected executeQuery(callback: QueryCallback<TORM>, atomicSession?: AtomicSession): Promise<any> {
        return this._dbConnector.prepare(this._EntityClass, <any>callback, atomicSession)
    }

    /**
     * Translates from a DTO model to an entity model.
     */
    protected toEntity(domainModel: TDomain | Partial<TDomain>, isPartial: boolean): TORM {
        if (!domainModel) { return null }

        const translator = this._EntityClass['translator'] as ModelAutoMapper<TORM>
        const entity: any = (isPartial)
            ? translator.partial(domainModel, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.whole(domainModel, { enableValidation: false })

        return entity
    }

    /**
     * Translates from DTO models to entity models.
     */
    protected toEntityMany(domainModels: TDomain[] | Partial<TDomain>[], isPartial: boolean): TORM[] {
        if (!domainModels) { return null }

        const translator = this._EntityClass['translator'] as ModelAutoMapper<TORM>
        const entity: any = (isPartial)
            ? translator.partialMany(domainModels, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.wholeMany(domainModels, { enableValidation: false })

        return entity
    }

    /**
     * Translates from an entity model to a domain model.
     */
    protected toDomainModel(entity: TORM | Partial<TORM>, isPartial: boolean): TDomain {
        if (!entity) { return null }

        const translator = this._DomainClass['translator'] as ModelAutoMapper<TDomain>
        const dto: any = (isPartial)
            ? translator.partial(entity, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.whole(entity, { enableValidation: false })

        return dto
    }

    /**
     * Translates from entity models to domain models.
     */
    protected toDomainModelMany(entities: TORM[] | Partial<TORM>[], isPartial: boolean): TDomain[] {
        if (!entities) { return null }

        const translator = this._DomainClass['translator'] as ModelAutoMapper<TDomain>
        const dto: any = (isPartial)
            ? translator.partialMany(entities, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.wholeMany(entities, { enableValidation: false })

        return dto
    }
}
