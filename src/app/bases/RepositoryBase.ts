const every = require('lodash/every');
const isEmpty = require('lodash/isEmpty');
import * as moment from 'moment';
import { injectable, Guard, MinorException } from 'back-lib-common-util';
import { PagedArray, IRepository, AtomicSession } from 'back-lib-common-contracts';

import { IDatabaseConnector, QueryCallback } from '../connector/IDatabaseConnector';
import { EntityBase } from './EntityBase';


@injectable()
export abstract class RepositoryBase<TEntity extends EntityBase, TModel extends IModelDTO>
	implements IRepository<TModel> {

	public isSoftDeletable: boolean;
	public isAuditable: boolean;

	constructor(
		protected _dbConnector: IDatabaseConnector
	) {
		this.isSoftDeletable = true;
		this.isAuditable = true;
	}


	/**
	 * Gets current date time in UTC.
	 */
	protected get utcNow(): string {
		return moment(new Date()).utc().format();
	}


	/**
	 * @see IRepository.countAll
	 */
	public async countAll(atomicSession?: AtomicSession): Promise<number> {
		let result = await this.executeQuery(query => {
				return query.count('id as total');
			}, atomicSession);

		// In case with Postgres, `count` returns a bigint type which will be a String 
		// and not a Number.
		/* istanbul ignore next */
		return (isEmpty(result) ? 0 : +(result[0]['total']));
	}

	/**
	 * @see IRepository.create
	 */
	public async create(model: TModel, atomicSession?: AtomicSession): Promise<TModel> {
		/* istanbul ignore else */
		if (this.isAuditable) {
			model['createdAt'] = this.utcNow;
			model['updatedAt'] = this.utcNow;
		}

		let entity = this.toEntity(model, false),
			newEnt: TEntity;

		newEnt = await this.executeCommand(query => {
			return query.insert(entity);
		}, atomicSession);

		return this.toDTO(newEnt, false);
	}

	/**
	 * @see IRepository.delete
	 */
	public async delete(id: BigSInt, atomicSession?: AtomicSession): Promise<number> {
		let affectedRows: number;

		if (this.isSoftDeletable) {
			affectedRows = await this.patch(<any>{
				id,
				deletedAt: this.utcNow
			}, atomicSession);
		} else {
			try {
				console.log('before delete(%d)', id);
				affectedRows = await this.executeCommand(query => {
					return query.deleteById(id).then(r => {
						console.log('after delete (%d): ', id, r);
						if (r == 0) {
							debugger;
						}
					});
				}, atomicSession);
			} catch (err) {
				console.error('delete error: ', err);
			}
		}

		return affectedRows;
	}

	/**
	 * @see IRepository.find
	 */
	public async find(id: BigSInt, atomicSession?: AtomicSession): Promise<TModel> {
		let foundEnt: TEntity = await this.executeQuery(query => {
				return query.findById(id);
			}, atomicSession);

		return this.toDTO(foundEnt, false);
	}

	/**
	 * @see IRepository.page
	 */
	public async page(pageIndex: number, pageSize: number, atomicSession?: AtomicSession): Promise<PagedArray<TModel>> {
		let foundList: { total: number, results: Array<TEntity> },
			dtoList: TModel[],
			affectedRows: number;

		foundList = await this.executeQuery(query => {
			return query.page(pageIndex, pageSize);
		}, atomicSession);

		if (!foundList || isEmpty(foundList.results)) {
			return null;
		}
		dtoList = this.toDTO(foundList.results, false);
		return new PagedArray<TModel>(foundList.total, ...dtoList);
	}

	/**
	 * @see IRepository.patch
	 */
	public async patch(model: Partial<TModel>, atomicSession?: AtomicSession): Promise<number> {
		Guard.assertArgDefined('model.id', model.id);

		/* istanbul ignore else */
		if (this.isAuditable) {
			let modelAlias: any = model;
			modelAlias['updatedAt'] = this.utcNow;
		}

		let entity = this.toEntity(model, true),
			affectedRows: number;

		affectedRows = await this.executeCommand(query => {
			return query.where('id', entity.id).patch(entity);
		}, atomicSession);
		return affectedRows;
	}

	/**
	 * @see IRepository.update
	 */
	public async update(model: TModel, atomicSession?: AtomicSession): Promise<number> {
		Guard.assertArgDefined('model.id', model.id);

		/* istanbul ignore else */
		if (this.isAuditable) {
			model['updatedAt'] = this.utcNow;
		}

		let entity = this.toEntity(model, false),
			affectedRows: number;

		affectedRows = await this.executeCommand(query => {
			return query.where('id', entity.id).update(entity);
		}, atomicSession);

		return affectedRows;
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
	 * @see IDatabaseConnector.query
	 */
	protected abstract prepare(callback: QueryCallback<TEntity>, atomicSession?: AtomicSession, ...names: string[]): Promise<any>[];
	protected abstract toEntity(from: TModel | TModel[] | Partial<TModel>, isPartial: boolean): TEntity & TEntity[];
	protected abstract toDTO(from: TEntity | TEntity[] | Partial<TEntity>, isPartial: boolean): TModel & TModel[];
}