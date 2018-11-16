import { QueryBuilder, QueryBuilderSingle } from 'objection';

import * as it from '../interfaces';
import { IQueryBuilder } from './IQueryBuilder';


export class MonoQueryBuilder<TEntity, TModel, TUk = NameUk> 
	implements IQueryBuilder<TEntity, TModel, BigInt, TUk> {

	private _pkProp: string;

	constructor(private _EntityClass: Newable) {
		this._pkProp = this._EntityClass['idProp'][0];
	}


	public buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryCountAllOptions): QueryBuilder<TEntity> {
		const q = rawQuery.count(`${this._pkProp} as total`);
		return (opts.excludeDeleted) ? q.whereNull('deleted_at') : q;
	}

	public buildDeleteHard(pk: BigInt, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>): QueryBuilderSingle<number> {
		return rawQuery.deleteById(<any>pk);
	}

	public buildExists(uniqVals: any[], prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryExistsOptions): QueryBuilder<TEntity> {
		let q = rawQuery.count(`${this._pkProp} as total`);
		if (uniqVals && uniqVals.length) {
			q = q.where(builder => {
				(this._EntityClass['uniqColumn'] as string[]).forEach((c, i) => {
					const v = uniqVals[i];
					if (v === null) {
						builder.orWhereNull(c);
					} else if (v !== undefined) {
						builder.orWhere(c, '=', v);
					}
				});
			});
		}
		return (opts.excludeDeleted) ? q.whereNull('deleted_at') : q;
	}

	public buildFind(pk: BigInt, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryFindOptions = {}): QueryBuilder<TEntity> {
		return <any>rawQuery.findById(<any>pk);
	}

	public buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryPageOptions): QueryBuilder<TEntity> {
		let q = rawQuery.page(pageIndex, pageSize);
		if (opts.sortBy) {
			const direction = opts.sortType || 'asc';
			q = q.orderBy(opts.sortBy, direction);
		}
		return (opts.excludeDeleted) ? q.whereNull('deleted_at') : q;
	}

	public buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryPatchOptions): QueryBuilder<number> {
		return rawQuery.patch(entity).where(this._pkProp, entity[this._pkProp]);
	}

	public buildRecoverOpts(pk: BigInt, prevOpts: it.RepositoryRecoverOptions, rawOpts: it.RepositoryRecoverOptions): it.RepositoryExistsOptions {
		return {
			excludeDeleted: false,
		};
	}

	public buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryPatchOptions): QueryBuilder<number> {
		return rawQuery.update(entity).where(this._pkProp, entity[this._pkProp]);
	}

}