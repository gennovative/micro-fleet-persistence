import { QueryBuilder, QueryBuilderSingle } from 'objection';
import * as cc from '@micro-fleet/common-contracts';

import { EntityBase } from './EntityBase';


export interface IQueryBuilder<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType, TUk = NameUk>  {
	buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryCountAllOptions): QueryBuilder<TEntity>;

	buildDeleteHard(pk: TPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>): QueryBuilderSingle<number>;

	buildExists(uniqVals: any, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryExistsOptions): QueryBuilder<TEntity>;

	buildFind(pk: TPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryFindOptions): QueryBuilder<TEntity>;

	buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryPageOptions): QueryBuilder<TEntity>;

	buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryPatchOptions): QueryBuilder<number>;

	buildRecoverOpts(pk: TPk, prevOpts: cc.RepositoryRecoverOptions, rawOpts: cc.RepositoryRecoverOptions): cc.RepositoryExistsOptions;

	buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts?: cc.RepositoryPatchOptions): QueryBuilder<number>;
}