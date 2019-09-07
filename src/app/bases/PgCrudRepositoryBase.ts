import { QueryBuilder, raw } from 'objection'
import { SingleId, IdBase, ITranslatable, decorators as d } from '@micro-fleet/common'

import { IDatabaseConnector, QueryCallbackReturn } from '../connector/IDatabaseConnector'
import * as it from '../interfaces'
import { ORMModelBase } from './ORMModelBase'
import { GeneralCrudRepositoryBase } from './GeneralCrudRepositoryBase'


@d.injectable()
export class PgCrudRepositoryBase<TORM extends ORMModelBase, TDomain extends object, TId extends IdBase = SingleId>
    extends GeneralCrudRepositoryBase<TORM, TDomain, TId> {


    constructor(
            @d.unmanaged() ORMClass: ITranslatable,
            @d.unmanaged() DomainClass: ITranslatable,
            @d.unmanaged() dbConnector: IDatabaseConnector) {
        super(ORMClass, DomainClass, dbConnector)
    }


    /**
     * @override
     */
    protected _buildCountAllQuery(query: QueryBuilder<TORM>,
            opts: it.RepositoryCountAllOptions): QueryCallbackReturn {
        // Postgres returns count result as int64, so the pg driver returns string.
        // We cast it to int32 to be a valid NodeJS number
        query.select(raw('CAST(count(*) AS INTEGER) as total'))
        opts.tenantId && query.where('tenantId', opts.tenantId)
        return query
    }

    /**
     * @override
     */
    protected _buildCreateQuery(query: QueryBuilder<TORM>, model: TDomain, ormModel: TORM,
            opts: it.RepositoryCreateOptions): QueryCallbackReturn {
        return (super._buildCreateQuery(query, model, ormModel, opts) as QueryBuilder<TORM>)
            .returning('*') as any
    }

    /**
     * @override
     */
    protected _buildCreateManyQuery(query: QueryBuilder<TORM>, models: TDomain[], ormModels: TORM[],
            opts: it.RepositoryCreateOptions): QueryCallbackReturn {
        // Bulk insert only works with PostgreSQL, MySQL, and SQL Server 2008 RC2
        return (super._buildCreateManyQuery(query, models, ormModels, opts) as QueryBuilder<TORM>)
            .returning('*') as any
    }

    /**
     * @override
     */
    protected _buildPatchQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, ormModel: TORM,
            opts: it.RepositoryPatchOptions): QueryCallbackReturn {
        return (super._buildPatchQuery(query, model, ormModel, opts) as QueryBuilder<TORM>)
            .returning('*') as any
    }

    /**
     * @override
     */
    protected _buildUpdateQuery(query: QueryBuilder<TORM>, model: Partial<TDomain>, ormModel: TORM,
            opts: it.RepositoryUpdateOptions): QueryCallbackReturn {
        return (super._buildPatchQuery(query, model, ormModel, opts) as QueryBuilder<TORM>)
            .returning('*') as any
    }
}
