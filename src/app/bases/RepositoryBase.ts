const every = require('lodash/every');
const isEmpty = require('lodash/isEmpty');
import { QueryBuilder, QueryBuilderSingle } from 'objection';
import * as moment from 'moment';
import { injectable, unmanaged, Guard, MinorException } from 'back-lib-common-util';
import * as cc from 'back-lib-common-contracts';

import { AtomicSessionFactory } from '../atom/AtomicSessionFactory';
import { IDatabaseConnector, QueryCallback } from '../connector/IDatabaseConnector';
import { EntityBase } from './EntityBase';
import { MonoProcessor, ProcessorOptions } from './MonoProcessor';
import { BatchProcessor } from './BatchProcessor';
import { VersionControlledProcessor } from './VersionControlledProcessor';

export interface RepositoryBaseOptions<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType = BigSInt, TUk = NameUk>
		extends ProcessorOptions {
	/**
	 * Used by default version-controlled processor and default batch processor.
	 */
	monoProcessor?: MonoProcessor<TEntity, TModel, TPk, TUk>;
	
	/**
	 * Version-controlled processor
	 */
	versionProcessor?: VersionControlledProcessor<TEntity, TModel, TPk, TUk>;
	
	/**
	 * Providing this will ignore `monoProcessor` and `versionProcessor`.
	 */
	batchProcessor?: BatchProcessor<TEntity, TModel, TPk, TUk>;
}


@injectable()
export abstract class RepositoryBase<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType = BigSInt, TUk = NameUk>
	implements cc.ISoftDelRepository<TModel, TPk, TUk> {

	protected _processor: BatchProcessor<TEntity, TModel, TPk, TUk>;

	constructor( @unmanaged() EntityClass, @unmanaged() dbConnector: IDatabaseConnector, @unmanaged() options: RepositoryBaseOptions<TEntity, TModel, TPk, TUk> = {}) {
		Guard.assertArgDefined('EntityClass', EntityClass);
		Guard.assertArgDefined('dbConnector', dbConnector);
		let crud: any;
		if (options.isVersionControlled) {
			// TODO: Should let `VersionControlledProcessor` acceps `MonoProcessor` as argument.
			crud = options.versionProcessor || new VersionControlledProcessor<TEntity, TModel, TPk, TUk>(EntityClass, dbConnector, options);
		} else {
			crud = options.monoProcessor || new MonoProcessor<TEntity, TModel, TPk, TUk>(EntityClass, dbConnector, options);
		}
		this._processor = options.batchProcessor || new BatchProcessor<TEntity, TModel, TPk, TUk>(crud, dbConnector);
	}


	/**
	 * @see IRepository.countAll
	 */
	public async countAll(opts: cc.RepositoryCountAllOptions = {}): Promise<number> {
		return this._processor.countAll(opts);
	}

	/**
	 * @see IRepository.create
	 */
	public create(model: TModel | TModel[], opts: cc.RepositoryCreateOptions = {}): Promise<TModel & TModel[]> {
		return this._processor.create(model, opts);
	}

	/**
	 * @see ISoftDelRepository.deleteSoft
	 */
	public deleteSoft(pk: TPk | TPk[], opts: cc.RepositoryDeleteOptions = {}): Promise<number> {
		return this._processor.deleteSoft(pk, opts);
	}

	/**
	 * @see IRepository.deleteHard
	 */
	public deleteHard(pk: TPk | TPk[], opts: cc.RepositoryDeleteOptions = {}): Promise<number> {
		return this._processor.deleteHard(pk, opts);
	}

	/**
	 * @see IRepository.exists
	 */
	public async exists(props: TUk, opts: cc.RepositoryExistsOptions = {}): Promise<boolean> {
		return this._processor.exists(props, opts);
	}

	/**
	 * @see IRepository.findByPk
	 */
	public findByPk(pk: TPk, opts: cc.RepositoryFindOptions = {}): Promise<TModel> {
		return this._processor.findByPk(pk, opts);
	}

	/**
	 * @see IRepository.page
	 */
	public async page(pageIndex: number, pageSize: number, opts: cc.RepositoryPageOptions = {}): Promise<cc.PagedArray<TModel>> {
		return this._processor.page(pageIndex, pageSize, opts);
	}

	/**
	 * @see IRepository.patch
	 */
	public patch(model: Partial<TModel> | Partial<TModel>[], opts: cc.RepositoryPatchOptions = {}): Promise<Partial<TModel> & Partial<TModel>[]> {
		return this._processor.patch(model, opts);
	}

	/**
	 * @see ISoftDelRepository.recover
	 */
	public async recover(pk: TPk | TPk[], opts: cc.RepositoryRecoverOptions = {}): Promise<number> {
		return this._processor.recover(pk, opts);
	}

	/**
	 * @see IRepository.update
	 */
	public update(model: TModel | TModel[], opts: cc.RepositoryUpdateOptions = {}): Promise<TModel & TModel[]> {
		return this._processor.update(model, opts);
	}
}