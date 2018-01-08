const every = require('lodash/every');
const isEmpty = require('lodash/isEmpty');
import { QueryBuilder, QueryBuilderSingle } from 'objection';
import * as moment from 'moment';
import { injectable, Guard, MinorException } from 'back-lib-common-util';
import * as cc from 'back-lib-common-contracts';

import { AtomicSessionFactory } from '../atom/AtomicSessionFactory';
import { IDatabaseConnector, QueryCallback } from '../connector/IDatabaseConnector';
import { EntityBase } from './EntityBase';
import { MonoProcessor } from './MonoProcessor';


export class BatchProcessor<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType = BigSInt, TUk = NameUk> {

	/**
	 * Gets array of non-primary unique property(ies).
	 */
	public ukCol: string[];

	private _atomFac: AtomicSessionFactory;


	constructor(
		protected _mono: MonoProcessor<TEntity, TModel, TPk, TUk>,
		dbConnector: IDatabaseConnector
	) {
		this._atomFac = new AtomicSessionFactory(dbConnector);
	}


	/**
	 * Gets current date time in UTC.
	 */
	public get utcNow(): moment.Moment {
		return this._mono.utcNow;
	}


	/**
	 * @see IRepository.countAll
	 */
	public countAll(opts: cc.RepositoryCountAllOptions = {}): Promise<number> {
		return this._mono.countAll(opts);
	}

	/**
	 * @see IRepository.create
	 */
	public create(model: TModel | TModel[], opts: cc.RepositoryCreateOptions = {}): Promise<TModel & TModel[]> {
		if (Array.isArray(model)) {
			return this.execBatch(model, this.create, opts);
		}

		return this._mono.create(model, opts);
	}

	/**
	 * @see ISoftDelRepository.deleteSoft
	 */
	public deleteSoft(pk: TPk | TPk[], opts: cc.RepositoryDeleteOptions = {}): Promise<number> {
		if (Array.isArray(pk)) {
			return this.execBatch(pk, this.deleteSoft, opts)
				.then((r: number[]) => {
					// If batch succeeds entirely, expect "r" = [1, 1, 1, 1...]
					// If batch succeeds partially, expect "r" = [1, null, 1, null...]
					return r.reduce((prev, curr) => curr ? prev + 1 : prev, 0);
				});
		}
		return this._mono.deleteSoft(pk, opts);
	}

	/**
	 * @see IRepository.deleteHard
	 */
	public deleteHard(pk: TPk | TPk[], opts: cc.RepositoryDeleteOptions = {}): Promise<number> {
		if (Array.isArray(pk)) {
			return this.execBatch(pk, this.deleteHard, opts)
				.then((r: number[]) => {
					// If batch succeeds entirely, expect "r" = [1, 1, 1, 1...]
					// If batch succeeds partially, expect "r" = [1, null, 1, null...]
					return r.reduce((prev, curr) => curr ? prev + 1 : prev, 0);
				});
		}

		return this._mono.deleteHard(pk, opts);
	}

	/**
	 * @see IRepository.exists
	 */
	public exists(props: TUk, opts: cc.RepositoryExistsOptions = {}): Promise<boolean> {
		return this._mono.exists(props, opts);
	}

	/**
	 * @see IRepository.findByPk
	 */
	public findByPk(pk: TPk, opts: cc.RepositoryFindOptions = {}): Promise<TModel> {
		return this._mono.findByPk(pk, opts);
	}

	/**
	 * @see IRepository.page
	 */
	public page(pageIndex: number, pageSize: number, opts: cc.RepositoryPageOptions = {}): Promise<cc.PagedArray<TModel>> {
		return this._mono.page(pageIndex, pageSize, opts);
	}

	/**
	 * @see IRepository.patch
	 */
	public patch(model: Partial<TModel> | Partial<TModel>[], opts: cc.RepositoryPatchOptions = {}): Promise<Partial<TModel> & Partial<TModel>[]> {
		if (Array.isArray(model)) {
			return this.execBatch(model, this.patch, opts);
		}
		return this._mono.patch(model, opts);
	}

	/**
	 * @see ISoftDelRepository.recover
	 */
	public recover(pk: TPk | TPk[], opts: cc.RepositoryRecoverOptions = {}): Promise<number> {
		if (Array.isArray(pk)) {
			return this.execBatch(pk, this.recover, opts)
				.then((r: number[]) => {
					return r.reduce((prev, curr) => curr ? prev + 1 : prev, 0);
				});
		}
		return this._mono.recover(pk, opts);
	}

	/**
	 * @see IRepository.update
	 */
	public update(model: TModel | TModel[], opts: cc.RepositoryUpdateOptions = {}): Promise<TModel & TModel[]> {
		if (Array.isArray(model)) {
			return this.execBatch(model, this.update, opts);
		}
		return <any>this._mono.update(model, opts);
	}

	/**
	 * @see MonoProcessor.executeCommand
	 */
	public executeCommand(callback: QueryCallback<TEntity>, atomicSession: cc.AtomicSession = null, ...names: string[]): Promise<any> {
		return this._mono.executeCommand.apply(this._mono, arguments);
	}

	/**
	 * @see MonoProcessor.executeQuery
	 */
	public executeQuery(callback: QueryCallback<TEntity>, atomicSession?: cc.AtomicSession, name: string = '0'): Promise<any> {
		return this._mono.executeQuery.apply(this._mono, arguments);
	}

	/**
	 * Executes batch operation in transaction.
	 */
	public execBatch(inputs: any[], func: (m: any, opts?: cc.RepositoryOptions) => any, opts?: cc.RepositoryOptions): Promise<any> {
		// Utilize the provided transaction
		if (opts.atomicSession) {
			return Promise.all(
				inputs.map(ip => func.call(this, ip, { atomicSession: opts.atomicSession }))
			);
		}

		let flow = this._atomFac.startSession();
		flow.pipe(s => Promise.all(
			inputs.map(ip => func.call(this, ip, { atomicSession: s }))
		));
		return flow.closePipe();
	}

	/**
	 * @see MonoProcessor.toEntity
	 */
	public toEntity(dto: TModel | TModel[] | Partial<TModel>, isPartial: boolean): TEntity & TEntity[] {
		return this._mono.toEntity.apply(this._mono, arguments);
	}

	/**
	 * @see MonoProcessor.toDTO
	 */
	public toDTO(entity: TEntity | TEntity[] | Partial<TEntity>, isPartial: boolean): TModel & TModel[] {
		return this._mono.toDTO.apply(this._mono, arguments);
	}

	/**
	 * Maps from an array of columns to array of values.
	 * @param pk Object to get values from
	 * @param cols Array of column names
	 */
	public toArr(pk: TPk | TEntity | Partial<TEntity>, cols: string[]): any[] {
		return this._mono.toArr.apply(this._mono, arguments);
	}
}