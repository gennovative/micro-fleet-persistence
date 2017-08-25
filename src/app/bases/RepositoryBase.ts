const every = require('lodash/every');
const isEmpty = require('lodash/isEmpty');
import * as moment from 'moment';
import { injectable, Guard, MinorException } from 'back-lib-common-util';
import { PagedArray, IRepository, RepositoryOptions, AtomicSession } from 'back-lib-common-contracts';

import { AtomicSessionFactory } from '../atom/AtomicSessionFactory';
import { IDatabaseConnector, QueryCallback } from '../connector/IDatabaseConnector';
import { EntityBase } from './EntityBase';


@injectable()
export abstract class RepositoryBase<TEntity extends EntityBase, TModel extends IModelDTO, TPk = BigSInt>
	implements IRepository<TModel, TPk> {

	public readonly isSoftDeletable: boolean;
	public readonly isAuditable: boolean;

	private _atomFac: AtomicSessionFactory;
	private _useCompositePk: boolean;


	constructor(
		protected _dbConnector: IDatabaseConnector
	) {
		Guard.assertArgDefined('_dbConnector', _dbConnector);
		this.isSoftDeletable = true;
		this.isAuditable = true;
		this._atomFac = new AtomicSessionFactory(_dbConnector);
		this._useCompositePk = this.idProp.length > 1;
	}


	public get useCompositePk(): boolean {
		return this._useCompositePk;
	}

	/**
	 * Gets current date time in UTC.
	 */
	protected get utcNow(): moment.Moment {
		return moment(new Date()).utc();
	}

	/**
	 * @see IRepository.countAll
	 */
	public async countAll(opts: RepositoryOptions = {}): Promise<number> {
		let result = await this.executeQuery(query => {
				let q = query.count('id as total');
				return (this.useCompositePk) ? q.where('tenant_id', opts.tenantId) : q;
			}, opts.atomicSession);

		// In case with Postgres, `count` returns a bigint type which will be a String 
		// and not a Number.
		/* istanbul ignore next */
		return (isEmpty(result) ? 0 : +(result[0]['total']));
	}

	/**
	 * @see IRepository.create
	 */
	public create(model: TModel | TModel[], opts: RepositoryOptions = {}): Promise<TModel & TModel[]> {
		if (Array.isArray(model)) {
			return this.execBatch(model, this.create, opts);
		}

		let entity = this.toEntity(model, false),
			now = this.utcNow;

		/* istanbul ignore else */
		if (this.isAuditable) {
			model['createdAt'] = model['updatedAt'] = now.toDate();
			entity['createdAt'] = entity['updatedAt'] = now.format();
		}

		return this.executeCommand(query => query.insert(entity), opts.atomicSession)
			.then(() => <any>model);
	}

	/**
	 * @see IRepository.delete
	 */
	public delete(pk: TPk | TPk[], opts: RepositoryOptions = {}): Promise<number> {
		let delta: any,
			deletedAt = this.utcNow.format();
		if (this.useCompositePk) {
			delta = Object.assign(pk, { deletedAt });
		} else if (Array.isArray(pk)) {
			delta = pk.map(k => ({
				id: k,
				deletedAt
			}));
		} else {
			delta = {
				id: pk,
				deletedAt
			};
		}

		return this.patch(delta, opts)
			.then((r: Partial<TModel> | Partial<TModel>[]) => {
				// If totally failed
				if (!r) { return 0; }

				// For single item:
				if (!Array.isArray(r)) { return 1; }

				// For batch:
				// If batch succeeds entirely, expect "r" = [1, 1, 1, 1...]
				// If batch succeeds partially, expect "r" = [1, null, 1, null...]
				return r.reduce((prev, curr) => curr ? prev + 1 : prev, 0);
			});
	}

	/**
	 * @see IRepository.deleteHard
	 */
	public deleteHard(pk: TPk | TPk[], opts: RepositoryOptions = {}): Promise<number> {
		if (Array.isArray(pk)) {
			return this.execBatch(pk, this.deleteHard, opts)
				.then((r: number[]) => {
					// If batch succeeds entirely, expect "r" = [1, 1, 1, 1...]
					// If batch succeeds partially, expect "r" = [1, null, 1, null...]
					return r.reduce((prev, curr) => curr ? prev + 1 : prev, 0);
				});
		}

		return this.executeCommand(query => {
				let q = query.deleteById(this.toArr(pk));
				console.log(`HARD DELETE (${pk}):`, q.toSql());
				return q;
			}, opts.atomicSession);
	}

	/**
	 * @see IRepository.findByPk
	 */
	public findByPk(pk: TPk, opts: RepositoryOptions = {}): Promise<TModel> {
		return this.executeQuery(query => {
				let q = query.findById(this.toArr(pk));
				console.log(`findByPk (${pk}):`, q.toSql());
				return q;
			}, opts.atomicSession)
			.then(foundEnt => {
				return foundEnt ? this.toDTO(foundEnt, false) : null;
			});
	}

	/**
	 * @see IRepository.page
	 */
	public async page(pageIndex: number, pageSize: number, opts: RepositoryOptions = {}): Promise<PagedArray<TModel>> {
		let foundList: { total: number, results: Array<TEntity> },
			dtoList: TModel[],
			affectedRows: number;

		foundList = await this.executeQuery(query => {
				let q = query.page(pageIndex, pageSize);
				return (this.useCompositePk) ? q.where('tenant_id', opts.tenantId) : q;
			}, opts.atomicSession);

		if (!foundList || isEmpty(foundList.results)) {
			return null;
		}
		dtoList = this.toDTO(foundList.results, false);
		return new PagedArray<TModel>(foundList.total, ...dtoList);
	}

	/**
	 * @see IRepository.patch
	 */
	public patch(model: Partial<TModel> | Partial<TModel>[], opts: RepositoryOptions = {}): Promise<Partial<TModel> & Partial<TModel>[]> {
		if (Array.isArray(model)) {
			return this.execBatch(model, this.patch, opts);
		}

		let entity = this.toEntity(model, true),
			affectedRows: number;

		/* istanbul ignore else */
		if (this.isAuditable) {
			let modelAlias: any = model,
				now = this.utcNow;
			modelAlias['updatedAt'] = now.toDate();
			entity['createdAt'] = now.format();
		}

		return this.executeCommand(query => {
				let q = query.patch(entity);
				console.log('PATCH: (%s)', model, q.toSql());
				return (this.useCompositePk)
					? q.whereComposite(this.idCol, '=', this.toArr(entity)) 
					: q.where('id', entity.id);
			}, opts.atomicSession)
				// `query.patch` returns number of affected rows, but we want to return the updated model.
			.then(count => count ? <any>model : null);
	}

	/**
	 * @see IRepository.update
	 */
	public update(model: TModel | TModel[], opts: RepositoryOptions = {}): Promise<TModel & TModel[]> {
		if (Array.isArray(model)) {
			return this.execBatch(model, this.update, opts);
		}

		let entity = this.toEntity(model, false),
			affectedRows: number;

		/* istanbul ignore else */
		if (this.isAuditable) {
			let now = this.utcNow;
			model['updatedAt'] = now.toDate();
			entity['updatedAt'] = now.format();
		}

		return this.executeCommand(query => {
				let q = query.update(entity);
				console.log(`UPDATE: (${model})`, q.toSql());
				return (this.useCompositePk)
					? q.whereComposite(this.idCol, '=', this.toArr(entity)) 
					: q.where('id', entity.id);
			}, opts.atomicSession)
				// `query.update` returns number of affected rows, but we want to return the updated model.
			.then(count => count ? <any>model : null);
	}

	/**
	 * Executing an query that does something and doesn't expect return value.
	 * This kind of query is executed on all added connections.
	 * @return A promise that resolve to affected rows.
	 * @throws {[errorMsg, affectedRows]} When not all connections have same affected rows.
	 */
	protected executeCommand(callback: QueryCallback<TEntity>, atomicSession: AtomicSession = null, ...names: string[]): Promise<any> {
		let queryJobs = this.prepare(callback, atomicSession, ...names),
			// Create exception here to have full error stack
			exception = new MinorException('Not successful on all connections');

		if (atomicSession) {
			return <any>queryJobs[0];
		}

		return <any>Promise.all(queryJobs)
			.then((affectedRows: number[]) => {
				// If there is no affected rows, or if not all connections have same affected rows.
				/* istanbul ignore next */
				if (isEmpty(affectedRows) || !every(affectedRows, r => r == affectedRows[0])) {
					return <any>Promise.reject(exception);
				}
				// If all connections have same affected rows, it means the execution was successful.
				return affectedRows[0];
			});
	}

	/**
	 * Executing an query that has returned value.
	 * This kind of query is executed on the primary (first) connection.
	 */
	protected executeQuery(callback: QueryCallback<TEntity>, atomicSession?: AtomicSession, name: string = '0'): Promise<any> {
		let queryJobs = this.prepare(callback, atomicSession, name);
		// Get value from first connection
		return queryJobs[0];
	}

	/**
	 * Execute batch operation in transaction.
	 */
	protected execBatch(inputs: any[], func: (m: any, opts?: RepositoryOptions) => any, opts?: RepositoryOptions): Promise<any> {
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

	protected toArr(pk: TPk | TEntity | Partial<TEntity>): any[] {
		// if pk is BigSInt
		if (typeof pk === 'string') {
			return [pk];
		}
		return this.idProp.map(c => pk[c]);
	}

	/**
	 * Gets array of ID column(s) that make up a composite PK.
	 */
	protected abstract get idCol(): string[];

	/**
	 * Gets array of ID property(ies) that make up a composite PK.
	 */
	protected abstract get idProp(): string[];

	/**
	 * @see IDatabaseConnector.query
	 */
	protected abstract prepare(callback: QueryCallback<TEntity>, atomicSession?: AtomicSession, ...names: string[]): Promise<any>[];
	protected abstract toEntity(from: TModel | TModel[] | Partial<TModel>, isPartial: boolean): TEntity & TEntity[];
	protected abstract toDTO(from: TEntity | TEntity[] | Partial<TEntity>, isPartial: boolean): TModel & TModel[];
}