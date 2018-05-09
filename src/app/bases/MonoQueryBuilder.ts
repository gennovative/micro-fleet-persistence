import { QueryBuilder, QueryBuilderSingle } from 'objection';
import * as cc from 'back-lib-common-contracts';

import { IQueryBuilder } from './IQueryBuilder';
import { EntityBase } from './EntityBase';


export class MonoQueryBuilder<TEntity extends EntityBase, TModel extends IModelDTO, TUk = NameUk> 
	implements IQueryBuilder<TEntity, TModel, BigSInt, TUk> {

	constructor(private _EntityClass) {
	}


	public buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryCountAllOptions): QueryBuilder<TEntity> {
		let q = rawQuery.count('id as total');
		return (opts.includeDeleted) ? q : q.whereNull('deleted_at');
	}

	public buildDeleteHard(pk: BigSInt, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>): QueryBuilderSingle<number> {
		return rawQuery.deleteById(<any>pk);
	}

	public buildExists(uniqVals: any[], prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryExistsOptions): QueryBuilder<TEntity> {
		let q = rawQuery.count('id as total');
			// .whereComposite(this._EntityClass.uniqColumn, '=', this.toArr(uniqVals, this._EntityClass.uniqColumn));
		if (uniqVals && uniqVals.length) {
			q = q.where(builder => {
				this._EntityClass.uniqColumn.forEach((c, i) => {
					let v = uniqVals[i];
					if (v === null) {
						builder.orWhereNull(c);
					} else if (v !== undefined) {
						builder.orWhere(c, '=', v);
					}
				});
			});
		}
		return (opts.includeDeleted) ? q : q.whereNull('deleted_at');
	}

	public buildFind(pk: BigSInt, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryFindOptions = {}): QueryBuilder<TEntity> {
		return <any>rawQuery.findById(<any>pk);
	}

	public buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPageOptions): QueryBuilder<TEntity> {
		let q = rawQuery.page(pageIndex, pageSize);
		if (opts.sortBy && opts.sortBy.length) {
			q = q.orderBy(opts.sortBy, opts.sortType || 'asc');
		}
		if (Array.isArray(opts.fields) && opts.fields.length) {
			q = q.select(opts.fields);
		}
		return (opts.includeDeleted) ? q : q.whereNull('deleted_at');
	}

	public buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPatchOptions): QueryBuilder<number> {
		return rawQuery.patch(entity).where('id', entity.id);
	}

	public buildRecoverOpts(pk: BigSInt, prevOpts: cc.RepositoryRecoverOptions, rawOpts: cc.RepositoryRecoverOptions): cc.RepositoryExistsOptions {
		return {
			includeDeleted: true,
		};
	}

	public buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPatchOptions): QueryBuilder<number> {
		return rawQuery.update(entity).where('id', entity.id);
	}

}