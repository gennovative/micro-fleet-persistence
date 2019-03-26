import { QueryBuilder, Model } from 'objection'

import * as it from '../interfaces'
import { IQueryBuilder } from './IQueryBuilder'


export class VersionQueryBuilder<TEntity extends Model, TModel, TPk extends PkType, TUk = NameUk>
    implements IQueryBuilder<TEntity, TModel, TPk, TUk> {

    private _pkProps: string[]

    constructor(private _EntityClass: Newable) {
        this._pkProps = this._EntityClass['idProp']
    }

    public buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryCountAllOptions): QueryBuilder<TEntity> {
        return prevQuery.where('is_main', true)
    }

    public buildDeleteHard(pk: TPk, prevQuery: QueryBuilder<TEntity>,
            rawQuery: QueryBuilder<TEntity>): QueryBuilder<TEntity> {
        return rawQuery.deleteById(this._toArr(pk, this._pkProps)) as any as QueryBuilder<TEntity>
    }

    public buildExists(props: TUk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryExistsOptions): QueryBuilder<TEntity> {
        return prevQuery.where('is_main', true)
    }

    public buildFind(pk: TPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryFindOptions = {}): QueryBuilder<TEntity> {
        let q = rawQuery.findById(this._toArr(pk, this._pkProps))
        if (opts.version) {
            q = q.where('version', opts.version)
        } else {
            q = q.where('is_main', true)
        }
        return q
    }

    public buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryPageOptions): QueryBuilder<TEntity> {
        return prevQuery.where('is_main', true)
    }

    public buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryPatchOptions): QueryBuilder<TEntity> {
        return <any>rawQuery.patch(entity)
            .whereComposite(this._EntityClass['idColumn'], '=', this._toArr(entity, this._pkProps))
            .where('is_main', true)
    }

    public buildRecoverOpts(pk: TPk, prevOpts: it.RepositoryRecoverOptions,
            rawOpts: it.RepositoryRecoverOptions): it.RepositoryExistsOptions {
        return prevOpts
    }

    public buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
            opts: it.RepositoryPatchOptions): QueryBuilder<TEntity> {
        return <any>rawQuery.update(entity)
            .whereComposite(this._EntityClass['idColumn'], '=', this._toArr(entity, this._pkProps))
            .where('is_main', true)
    }


    private _toArr(pk: TPk | TEntity | Partial<TEntity>, arr: any[]): any[] {
        return arr.map(c => pk[c])
    }
}
