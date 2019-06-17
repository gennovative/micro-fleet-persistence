import { QueryBuilder, Model } from 'objection'

import * as it from '../interfaces'


export interface IQueryBuilder<TEntity extends Model, TModel, TPk extends PkType, TUk = NameUk>  {
    buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
        opts?: it.RepositoryCountAllOptions): QueryBuilder<TEntity>

    buildDeleteHard(pk: TPk, prevQuery: QueryBuilder<TEntity>,
        rawQuery: QueryBuilder<TEntity>): QueryBuilder<TEntity>

    buildExists(uniqVals: any, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
        opts?: it.RepositoryExistsOptions): QueryBuilder<TEntity>

    buildFind(pk: TPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
        opts?: it.RepositoryFindOptions): QueryBuilder<TEntity>

    buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
        opts?: it.LegacyRepositoryPageOptions): QueryBuilder<TEntity>

    buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
        opts?: it.RepositoryPatchOptions): QueryBuilder<TEntity>

    buildRecoverOpts(pk: TPk, prevOpts: it.RepositoryRecoverOptions, rawOpts: it.RepositoryRecoverOptions): it.RepositoryExistsOptions

    buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
        opts?: it.RepositoryPatchOptions): QueryBuilder<TEntity>
}
