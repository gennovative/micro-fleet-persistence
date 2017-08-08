const every = require('lodash/every');
const isEmpty = require('lodash/isEmpty');
import * as moment from 'moment';
import { injectable, Guard } from 'back-lib-common-util';
import { PagedArray, IRepository } from 'back-lib-common-contracts';

import { EntityBase } from './EntityBase';
import { IDatabaseConnector, QueryCallback } from './IDatabaseConnector';


@injectable()
export abstract class RepositoryBase<TEntity extends EntityBase, TModel extends IModelDTO>
	implements IRepository<TModel> {

	public isSoftDeletable: boolean;
	public isAuditable: boolean;

	constructor(
		protected _modelMapper: AutoMapper,
		protected _dbConnector: IDatabaseConnector
	) {
		Guard.assertArgDefined('_modelMapper', _modelMapper);
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
	public async countAll(): Promise<number> {
		let result = await this.executeQuery(query => {
				return query.count('id as total');
			});

		// In case with Postgres, `count` returns a bigint type which will be a String 
		// and not a Number.
		/* istanbul ignore next */
		return (isEmpty(result) ? 0 : +(result[0]['total']));
	}

	/**
	 * @see IRepository.create
	 */
	public async create(model: TModel): Promise<TModel> {
		/* istanbul ignore else */
		if (this.isAuditable) {
			model['createdAt'] = this.utcNow;
			model['updatedAt'] = this.utcNow;
		}

		let entity = this.toEntity(model, false),
			newEnt: TEntity;

		newEnt = await this.executeCommand(query => {
			return query.insert(entity);
		});

		return this.toDTO(newEnt, false);
	}

	/**
	 * @see IRepository.delete
	 */
	public async delete(id: BigSInt): Promise<number> {
		let affectedRows: number;

		if (this.isSoftDeletable) {
			affectedRows = await this.patch(<any>{
				id,
				deletedAt: this.utcNow
			});
		} else {
			affectedRows = await this.executeCommand(query => {
				return query.deleteById(id);
			});
		}

		return affectedRows;
	}

	/**
	 * @see IRepository.find
	 */
	public async find(id: BigSInt): Promise<TModel> {
		let foundEnt: TEntity = await this.executeQuery(query => {
				return query.findById(id);
			});

		return this.toDTO(foundEnt, false);
	}

	/**
	 * @see IRepository.page
	 */
	public async page(pageIndex: number, pageSize: number): Promise<PagedArray<TModel>> {
		let foundList: { total: number, results: Array<TEntity> },
			dtoList: TModel[],
			affectedRows: number;

		foundList = await this.executeQuery(query => {
			return query.page(pageIndex, pageSize);
		});

		if (!foundList || isEmpty(foundList.results)) {
			return null;
		}
		dtoList = this.toDTO(foundList.results, false);
		return new PagedArray<TModel>(foundList.total, ...dtoList);
	}

	/**
	 * @see IRepository.patch
	 */
	public async patch(model: Partial<TModel>): Promise<number> {
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
		});
		return affectedRows;
	}

	/**
	 * @see IRepository.update
	 */
	public async update(model: TModel): Promise<number> {
		Guard.assertArgDefined('model.id', model.id);

		/* istanbul ignore else */
		if (this.isAuditable) {
			model['updatedAt'] = this.utcNow;
		}

		let entity = this.toEntity(model, false),
			affectedRows: number;

		affectedRows = await this.executeCommand(query => {
			return query.where('id', entity.id).update(entity);
		});

		return affectedRows;
	}

	/**
	 * Executing an query that does something and doesn't expect return value.
	 * This kind of query is executed on all added connections.
	 * @return A promise that resolve to affected rows.
	 * @throws {[errorMsg, affectedRows]} When not all connections have same affected rows.
	 */
	protected executeCommand(callback: QueryCallback<TEntity>, ...names: string[]): Promise<number & TEntity> {
		let queryJobs = this.prepare(callback, ...names);
		return <any>Promise.all(queryJobs)
			.then((affectedRows: number[]) => {
				// If there is no affected rows, or if not all connections have same affected rows.
				/* istanbul ignore next */
				if (isEmpty(affectedRows) || !every(affectedRows, r => r == affectedRows[0])) {
					throw ['Not successful on all connections', affectedRows];
				}
				// If all connections have same affected rows, it means the execution was successful.
				return affectedRows[0];
			});
	}

	/**
	 * Executing an query that has returned value.
	 * This kind of query is executed on the primary (first) connection.
	 */
	protected executeQuery(callback: QueryCallback<TEntity>, name: string = '0'): Promise<any> {
		let queryJobs = this.prepare(callback, name);
		// Get value from first connection
		return queryJobs[0];
	}

	/**
	 * @see IDatabaseConnector.query
	 */
	protected abstract prepare(callback: QueryCallback<TEntity>, ...names: string[]): Promise<any>[];
	protected abstract toEntity(from: TModel | TModel[] | Partial<TModel>, isPartial: boolean): TEntity & TEntity[];
	protected abstract toDTO(from: TEntity | TEntity[] | Partial<TEntity>, isPartial: boolean): TModel & TModel[];
}