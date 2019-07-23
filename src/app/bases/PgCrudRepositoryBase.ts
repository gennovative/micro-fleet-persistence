/// <reference types="debug" />
const debug: debug.IDebugger = require('debug')('mcft:persistence:PgRepoBase')

import { QueryBuilder, raw } from 'objection'
import pick = require('lodash/pick')
import { Guard, PagedArray, injectable, unmanaged, ModelAutoMapper,
    Maybe, SingleId, IdBase, Newable} from '@micro-fleet/common'

import { AtomicSession } from '../atom/AtomicSession'
import { IDatabaseConnector, QueryCallbackReturn,
    QueryCallback } from '../connector/IDatabaseConnector'
import * as it from '../interfaces'
import { EntityBase } from './EntityBase'


@injectable()
export abstract class PgCrudRepositoryBase<TEntity extends EntityBase, TModel extends object, TPk extends IdBase = SingleId>
    implements it.IRepository<TModel, TPk> {

    /**
     * EntityClass' primary key properties.
     * Eg: ['id', 'tenantId']
     */
    private readonly _pkProps: string[]


    constructor(
            @unmanaged() protected _EntityClass: Newable,
            @unmanaged() protected _DomainClass: Newable,
            @unmanaged() protected _dbConnector: IDatabaseConnector) {
        Guard.assertArgDefined('EntityClass', _EntityClass)
        Guard.assertIsTruthy(_EntityClass['tableName'],
            'Param "EntityClass" must have tableName. It had better inherit "EntityBase"!')
        Guard.assertArgDefined('DomainClass', _DomainClass)
        Guard.assertArgDefined('dbConnector', _dbConnector)

        this._pkProps = this._EntityClass['idProp']
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

    protected _buildCountAllQuery(query: QueryBuilder<TEntity>,
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
    public create(model: TModel, opts: it.RepositoryCreateOptions = {}): Promise<TModel> {
        const entity = this.toEntity(model, false) as TEntity

        return this.executeQuery(
            query => {
                const q = this._buildCreateQuery(query, model, entity, opts) as QueryBuilder<any>
                debug('CREATE: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
        .then((refetch: TEntity) => this.toDomainModel(refetch, false))
    }

    protected _buildCreateQuery(query: QueryBuilder<TEntity>, model: TModel, entity: TEntity,
            opts: it.RepositoryCreateOptions): QueryCallbackReturn {
        return query.insert(entity).returning('*') as any
    }

    /**
     * @see IRepository.deleteSingle
     */
    public deleteSingle(pk: TPk, opts: it.RepositoryDeleteOptions = {}): Promise<number> {
        return this.executeQuery(
            query => {
                const q = this._buildDeleteSingleQuery(query, pk, opts) as QueryBuilder<any>
                debug('DELETE SINGLE: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
    }

    protected _buildDeleteSingleQuery(query: QueryBuilder<TEntity>, pk: TPk,
            opts: it.RepositoryDeleteOptions): QueryCallbackReturn {
        return query.deleteById(pk.toArray())
    }

    /**
     * @see IRepository.deleteMany
     */
    public deleteMany(pkList: TPk[], opts: it.RepositoryDeleteOptions = {}): Promise<number> {
        return this.executeQuery(
            query => {
                const q = this._buildDeleteManyQuery(query, pkList, opts) as QueryBuilder<any>
                debug('DELETE MANY: %s', q.toSql())
                return q
            },
            opts.atomicSession,
        )
    }

    protected _buildDeleteManyQuery(query: QueryBuilder<TEntity>, pkList: TPk[],
            opts: it.RepositoryDeleteOptions): QueryCallbackReturn {
        const q = query.delete()
            .whereInComposite(
                this._EntityClass['idColumn'],
                pkList.map(pk => pk.toArray()),
            )
        return q
    }

    /**
     * @see IRepository.exists
     */
    public async exists(uniqPartial: Partial<TModel>, opts: it.RepositoryExistsOptions = {}): Promise<boolean> {
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

    protected _buildExistsQuery(query: QueryBuilder<TEntity>, uniqPartial: Partial<TModel>,
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
     * @see IRepository.findByPk
     */
    public findByPk(pk: TPk, opts: it.RepositoryFindOptions = {}): Promise<Maybe<TModel>> {
        return this.executeQuery(
            query => {
                const q = this._buildFindByPkQuery(query, pk, opts) as QueryBuilder<any>
                debug('FIND BY (%o): %s', pk, q.toSql())
                return q
            },
            opts.atomicSession
        )
        .then(foundEnt => {
            return foundEnt
                ? Maybe.Just(this.toDomainModel(foundEnt, false))
                : Maybe.Nothing()
        }) as Promise<Maybe<TModel>>
    }

    protected _buildFindByPkQuery(query: QueryBuilder<TEntity>, pk: TPk,
            opts: it.RepositoryFindOptions): QueryCallbackReturn {
        const q = query.findById(pk.toArray())
        opts.relations && q.eager(opts.relations)
        opts.fields && q.select(opts.fields)
        return q
    }

    /**
     * @see IRepository.page
     */
    public async page(opts: it.RepositoryPageOptions): Promise<PagedArray<TModel>> {
        type PageResult = { total: number, results: Array<TEntity> }
        const foundList: PageResult = await this.executeQuery(
            query => {
                const q = this._buildPageQuery(query, opts) as QueryBuilder<any>
                debug('PAGE: %s', q.toSql())
                return q
            },
            opts.atomicSession
        )

        if (!foundList) {
            return new PagedArray<TModel>()
        }
        const dtoList: TModel[] = this.toDomainModelMany(foundList.results, false) as TModel[]
        return new PagedArray<TModel>(foundList.total, dtoList)
    }

    protected _buildPageQuery(query: QueryBuilder<TEntity>,
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
    public async patch(model: Partial<TModel>, opts: it.RepositoryPatchOptions = {}): Promise<Maybe<TModel>> {
        const entity = this.toEntity(model, true) as TEntity

        const refetchedEntities: TEntity[] = await this.executeQuery(
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

    protected _buildPatchQuery(query: QueryBuilder<TEntity>, model: Partial<TModel>, entity: TEntity,
            opts: it.RepositoryPatchOptions): QueryCallbackReturn {
        const pkCondition = pick(entity, this._pkProps)
        const q = query.patch(entity).where(pkCondition).returning('*')
        return q
    }

    /**
     * @see IRepository.update
     */
    public async update(model: TModel, opts: it.RepositoryUpdateOptions = {}): Promise<Maybe<TModel>> {
        const entity = this.toEntity(model, false) as TEntity

        const refetchedEntities: TEntity[] = await this.executeQuery(
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

    protected _buildUpdateQuery(query: QueryBuilder<TEntity>, model: Partial<TModel>, entity: TEntity,
            opts: it.RepositoryUpdateOptions): QueryCallbackReturn {
        const pkCondition = pick(entity, this._pkProps)
        return query.update(entity).where(pkCondition).returning('*')
    }


    protected executeQuery(callback: QueryCallback<TEntity>, atomicSession?: AtomicSession): Promise<any> {
        return this._dbConnector.prepare(this._EntityClass, <any>callback, atomicSession)
    }

    /**
     * Translates from a DTO model to an entity model.
     */
    protected toEntity(domainModel: TModel | Partial<TModel>, isPartial: boolean): TEntity {
        if (!domainModel) { return null }

        const translator = this._EntityClass['translator'] as ModelAutoMapper<TEntity>
        const entity: any = (isPartial)
            ? translator.partial(domainModel, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.whole(domainModel, { enableValidation: false })

        return entity
    }

    /**
     * Translates from DTO models to entity models.
     */
    protected toEntityMany(domainModels: TModel[] | Partial<TModel>[], isPartial: boolean): TEntity[] {
        if (!domainModels) { return null }

        const translator = this._EntityClass['translator'] as ModelAutoMapper<TEntity>
        const entity: any = (isPartial)
            ? translator.partialMany(domainModels, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.wholeMany(domainModels, { enableValidation: false })

        return entity
    }

    /**
     * Translates from an entity model to a domain model.
     */
    protected toDomainModel(entity: TEntity | Partial<TEntity>, isPartial: boolean): TModel {
        if (!entity) { return null }

        const translator = this._DomainClass['translator'] as ModelAutoMapper<TModel>
        const dto: any = (isPartial)
            ? translator.partial(entity, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.whole(entity, { enableValidation: false })

        return dto
    }

    /**
     * Translates from entity models to domain models.
     */
    protected toDomainModelMany(entities: TEntity[] | Partial<TEntity>[], isPartial: boolean): TModel[] {
        if (!entities) { return null }

        const translator = this._DomainClass['translator'] as ModelAutoMapper<TModel>
        const dto: any = (isPartial)
            ? translator.partialMany(entities, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.wholeMany(entities, { enableValidation: false })

        return dto
    }
}
