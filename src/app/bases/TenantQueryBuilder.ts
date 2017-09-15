import { QueryBuilder, QueryBuilderSingle } from 'objection';
import * as cc from 'back-lib-common-contracts';

import { IQueryBuilder } from './IQueryBuilder';
import { EntityBase } from './EntityBase';


export class TenantQueryBuilder<TEntity extends EntityBase, TModel extends IModelDTO, TUk = NameUk>
	implements IQueryBuilder<TEntity, TModel, TenantPk, TUk> {

	constructor(private _EntityClass) {
	}


	public buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryCountAllOptions = {}): QueryBuilder<TEntity> {
		return prevQuery.where('tenant_id', opts.tenantId);
	}

	public buildDeleteHard(pk: TenantPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>): QueryBuilderSingle<number> {
		return rawQuery.deleteById(this.toArr(pk, this._EntityClass.idProp));
	}

	public buildExists(props: TUk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryExistsOptions = {}): QueryBuilder<TEntity> {
		return prevQuery.where('tenant_id', opts.tenantId);
	}

	public buildFind(pk: TenantPk, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryFindOptions = {}): QueryBuilder<TEntity> {
		return rawQuery.findById(this.toArr(pk, this._EntityClass.idProp));
	}

	public buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPageOptions = {}): QueryBuilder<TEntity> {
		return prevQuery.where('tenant_id', opts.tenantId);
	}

	public buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPatchOptions = {}): QueryBuilder<number> {
		return <any>rawQuery.patch(entity).whereComposite(this._EntityClass.idColumn, '=', this.toArr(entity, this._EntityClass.idProp));
	}

	public buildRecoverOpts(pk: TenantPk, prevOpts: cc.RepositoryRecoverOptions, rawOpts: cc.RepositoryRecoverOptions): cc.RepositoryExistsOptions {
		prevOpts['tenantId'] = pk.tenantId;
		return prevOpts;
	}

	public buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>, opts: cc.RepositoryPatchOptions = {}): QueryBuilder<number> {
		return <any>rawQuery.update(entity).whereComposite(this._EntityClass.idColumn, '=', this.toArr(entity, this._EntityClass.idProp));
	}


	private toArr(pk: TenantPk | TEntity | Partial<TEntity>, arr: any[]): any[] {
		return arr.map(c => pk[c]);
	}
}