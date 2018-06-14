import { QueryBuilder, QueryBuilderSingle } from 'objection';

import * as it from '../interfaces';
import { IQueryBuilder } from './IQueryBuilder';


export class TenantQueryBuilder<TEntity, TModel, TUk = NameUk>
	implements IQueryBuilder<TEntity, TModel, TenantPk, TUk> {

	constructor(private _EntityClass: Newable) {
	}


	public buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryCountAllOptions = {}): QueryBuilder<TEntity> {
		return prevQuery.where('tenant_id', opts.tenantId);
	}

	public buildDeleteHard(pk: TenantPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>): QueryBuilderSingle<number> {
		return rawQuery.deleteById(this._toArr(pk, this._EntityClass['idProp']));
	}

	public buildExists(props: TUk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryExistsOptions = {}): QueryBuilder<TEntity> {
		return prevQuery.where('tenant_id', opts.tenantId);
	}

	public buildFind(pk: TenantPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryFindOptions = {}): QueryBuilder<TEntity> {
		return rawQuery.findById(this._toArr(pk, this._EntityClass['idProp']));
	}

	public buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryPageOptions = {}): QueryBuilder<TEntity> {
		return prevQuery.where('tenant_id', opts.tenantId);
	}

	public buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryPatchOptions = {}): QueryBuilder<number> {
		return <any>rawQuery.patch(entity).whereComposite(this._EntityClass['idColumn'], '=', this._toArr(entity, this._EntityClass['idProp']));
	}

	public buildRecoverOpts(pk: TenantPk, prevOpts: it.RepositoryRecoverOptions, rawOpts: it.RepositoryRecoverOptions): it.RepositoryExistsOptions {
		prevOpts['tenantId'] = pk.tenantId;
		return prevOpts;
	}

	public buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: it.RepositoryPatchOptions = {}): QueryBuilder<number> {
		return <any>rawQuery.update(entity).whereComposite(this._EntityClass['idColumn'], '=', this._toArr(entity, this._EntityClass['idProp']));
	}


	private _toArr(pk: TenantPk | TEntity | Partial<TEntity>, arr: any[]): any[] {
		return arr.map(c => pk[c]);
	}
}