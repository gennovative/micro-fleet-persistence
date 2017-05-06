import { injectable, Guard } from 'back-lib-common-util';
import { PagedArray, IRepository } from 'back-lib-common-contracts';

import { EntityBase } from './EntityBase';
import { IDatabaseConnector, QueryCallback } from './IDatabaseConnector';


@injectable()
export abstract class RepositoryBase<TEntity extends EntityBase, TModel extends IModelDTO>
	implements IRepository<TModel> {

	constructor(
		protected _modelMapper: AutoMapper,
		protected _dbConnector: IDatabaseConnector
	) {
		Guard.assertDefined('modelMapper', this._modelMapper);
		this.createModelMap();
	}

	public async countAll(): Promise<number> {
		let promises = this.query(query => {
			return query.count('id as total');
		}, '0'), // Only fetch data from primary connection. By convention, the firstly added connection is the primary.
			result = await this.first(promises);

		// In case with Postgres, `count` returns a bigint type which will be a String 
		// and not a Number.
		/* istanbul ignore next */
		return (result && result.length ? +(result[0]['total']) : 0);
	}

	public async create(model: TModel): Promise<TModel> {
		let promises = this.query(query => {
			return query.insert(model);
		}),
			newEnt = await this.first(promises);

		return this.toDTO(newEnt);
	}

	public async delete(id: number): Promise<number> {
		let promises = this.query(query => {
			return query.deleteById(id);
		}),
			affectedRows = await this.first(promises);

		return affectedRows;
	}

	public async find(id: number): Promise<TModel> {
		let promises = this.query(query => {
			return query.findById(id);
		}, '0'),
			foundEnt = await this.first(promises);

		return this.toDTO(foundEnt);
	}

	public async patch(model: Partial<TModel>): Promise<number> {
		Guard.assertDefined('entity.id', model.id);

		let promises = this.query(query => {
			return query.where('id', model.id).patch(<TModel>model);
		}),
			affectedRows = await this.first(promises);

		return affectedRows;
	}

	public async page(pageIndex: number, pageSize: number): Promise<PagedArray<TModel>> {
		let foundList: { total: number, results: Array<TEntity> },
			dtoList: TModel[],
			affectedRows;

		let promises = this.query(query => {
			return query.page(pageIndex, pageSize);
		}, '0');

		foundList = await this.first(promises);
		if (!foundList || !foundList.results || !foundList.results.length) {
			return null;
		}
		dtoList = this.toDTO(foundList.results);
		return new PagedArray<TModel>(foundList.total, dtoList);
	}

	public async update(model: TModel): Promise<number> {
		Guard.assertDefined('entity.id', model.id);

		let promises = this.query(query => {
			return query.where('id', model.id).update(model);
		}),
			affectedRows = await this.first(promises);

		return affectedRows;
	}

	/**
	 * Waits for query execution on first connection which is primary,
	 * do not care about the others, which is for backup.
	 * TODO: Consider putting database access layer in a separate microservice.
	 */
	protected async first(promises: Promise<any>[]) {
		return await promises[0];
	}

	/**
	 * @see IDatabaseConnector.query
	 */
	protected abstract query<TEntity>(callback: QueryCallback<TEntity>, ...names: string[]): Promise<any>[];
	protected abstract createModelMap(): void;
	protected abstract toEntity(from: TModel | TModel[]): TEntity & TEntity[];
	protected abstract toDTO(from: TEntity | TEntity[]): TModel & TModel[];
}