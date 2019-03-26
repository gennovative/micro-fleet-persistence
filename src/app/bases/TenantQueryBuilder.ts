import { QueryBuilder, Model } from 'objection'

import * as it from '../interfaces'
import { IQueryBuilder } from './IQueryBuilder'


export class TenantQueryBuilder<TEntity extends Model, TModel, TUk = NameUk>
    implements IQueryBuilder<TEntity, TModel, TenantPk, TUk> {

    private _pkProps: string[]

    constructor(private _EntityClass: Newable) {
        this._pkProps = this._EntityClass['idProp']
    }


    public buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryCountAllOptions = {}): QueryBuilder<TEntity> {
        return prevQuery.where('tenant_id', opts.tenantId as any)
    }

    public buildDeleteHard(pk: TenantPk, prevQuery: QueryBuilder<TEntity>,
            rawQuery: QueryBuilder<TEntity>): QueryBuilder<TEntity> {
        return rawQuery.deleteById(this._toArr(pk, this._pkProps)) as any as QueryBuilder<TEntity>
    }

    public buildExists(props: TUk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryExistsOptions = {}): QueryBuilder<TEntity> {
        return prevQuery.where('tenant_id', opts.tenantId as any)
    }

    public buildFind(pk: TenantPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryFindOptions = {}): QueryBuilder<TEntity> {
        return rawQuery.findById(this._toArr(pk, this._pkProps))
    }

    public buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryPageOptions = {}): QueryBuilder<TEntity> {
        return prevQuery.where('tenant_id', opts.tenantId as any) as any as QueryBuilder<TEntity>
    }

    public buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryPatchOptions = {}): QueryBuilder<TEntity> {
        return <any>rawQuery.patch(entity).whereComposite(this._EntityClass['idColumn'], '=', this._toArr(entity, this._pkProps))
    }

    public buildRecoverOpts(pk: TenantPk, prevOpts: it.RepositoryRecoverOptions,
            rawOpts: it.RepositoryRecoverOptions): it.RepositoryExistsOptions {
        prevOpts['tenantId'] = pk.tenantId
        return prevOpts
    }

    public buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryPatchOptions = {}): QueryBuilder<TEntity> {
        return <any>rawQuery.update(entity).whereComposite(this._EntityClass['idColumn'], '=', this._toArr(entity, this._pkProps))
    }


    private _toArr(pk: TenantPk | TEntity | Partial<TEntity>, arr: any[]): any[] {
        return arr.map(c => pk[c])
    }
}
