const every = require('lodash/every');
const isEmpty = require('lodash/isEmpty');
import { QueryBuilder, QueryBuilderSingle } from 'objection';
import * as moment from 'moment';
import { MinorException } from 'back-lib-common-util';
import * as cc from 'back-lib-common-contracts';

import { AtomicSessionFactory } from '../atom/AtomicSessionFactory';
import { IDatabaseConnector, QueryCallback } from '../connector/IDatabaseConnector';
import { IQueryBuilder } from './IQueryBuilder';
import { MonoQueryBuilder } from './MonoQueryBuilder';
import { TenantQueryBuilder } from './TenantQueryBuilder';
import { EntityBase } from './EntityBase';


export interface ProcessorOptions {
	isMultiTenancy?: boolean;
	isVersionControlled?: boolean;

	/**
	 * Property names that triggers new version creation.
	 */
	triggerProps?: string[];
}

export class MonoProcessor<TEntity extends EntityBase, TModel extends IModelDTO, TPk extends PkType = BigSInt, TUk = NameUk> {

	/**
	 * Gets array of non-primary unique property(ies).
	 */
	public get ukCol(): string[] {
		return this._EntityClass.uniqColumn;
	}

	protected _queryBuilders: IQueryBuilder<TEntity, TModel, PkType, TUk>[];

	constructor(
		protected _EntityClass,
		protected _dbConnector: IDatabaseConnector,
		protected _options: ProcessorOptions = {}
	) {
		this._queryBuilders = [new MonoQueryBuilder<TEntity, TModel, TUk>(_EntityClass)];
		if (_options.isMultiTenancy) {
			this._queryBuilders.push(new TenantQueryBuilder<TEntity, TModel, TUk>(_EntityClass));
		}
	}


	/**
	 * Gets current date time in UTC.
	 */
	public get utcNow(): moment.Moment {
		return moment(new Date()).utc();
	}


	/**
	 * @see IRepository.countAll
	 */
	public async countAll(opts: cc.RepositoryCountAllOptions = {}): Promise<number> {
		let result = await this.executeQuery(
			query => {
				// let q = this.buildCountAll(query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<TEntity>>((prevQuery, currBuilder) => {
					return currBuilder.buildCountAll(prevQuery, query.clone(), opts); 
				}, null);
				console.log('COUNT ALL:', q.toSql());
				return q;
			},
			opts.atomicSession
		);

		// In case with Postgres, `count` returns a bigint type which will be a String 
		// and not a Number.
		return +(result[0]['total']);
	}

	/**
	 * @see IRepository.create
	 */
	public create(model: TModel, opts: cc.RepositoryCreateOptions = {}): Promise<TModel & TModel[]> {
		if (model.hasOwnProperty('createdAt')) {
			model['createdAt'] = model['updatedAt'] = this.utcNow.toDate();
		}
		let entity = this.toEntity(model, false);

		return this.executeCommand(query => query.insert(entity), opts.atomicSession)
			.then(() => <any>model);
	}

	/**
	 * @see ISoftDelRepository.deleteSoft
	 */
	public deleteSoft(pk: TPk, opts: cc.RepositoryDeleteOptions = {}): Promise<number> {
		return this.setDeleteState(pk, true, opts);
	}

	/**
	 * @see IRepository.deleteHard
	 */
	public deleteHard(pk: TPk, opts: cc.RepositoryDeleteOptions = {}): Promise<number> {
		return this.executeCommand(
			query => {
				// let q = this.buildDeleteHard(pk, query);
				let q = this._queryBuilders.reduce<QueryBuilderSingle<number>>((prevQuery: any, currBuilder) => {
					return currBuilder.buildDeleteHard(pk, prevQuery, query.clone());
				}, null);
				console.log('HARD DELETE (${pk}):', q.toSql());
				return q;
			},
			opts.atomicSession
		);
	}

	/**
	 * @see IRepository.exists
	 */
	public async exists(props: TUk, opts: cc.RepositoryExistsOptions = {}): Promise<boolean> {
		let result = await this.executeQuery(
			query => {
				// let q = this.buildExists(props, query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<TEntity>>((prevQuery, currBuilder) => {
					return currBuilder.buildExists(this.toArr(props, this.ukCol), prevQuery, query.clone(), opts);
				}, null);
				console.log('EXIST: ', q.toSql());
				return q;
			},
			opts.atomicSession
		);

		return result[0]['total'] != 0;
	}

	/**
	 * @see IRepository.findByPk
	 */
	public findByPk(pk: TPk, opts: cc.RepositoryFindOptions = {}): Promise<TModel> {
		return this.executeQuery(
			query => {
				// let q = this.buildFind(pk, query);
				let q = this._queryBuilders.reduce<QueryBuilder<TEntity>>((prevQuery, currBuilder) => {
					return currBuilder.buildFind(pk, prevQuery, query.clone(), opts);
				}, null);
				console.log('FIND BY (%s):', pk, q.toSql());
				return q;
			},
			opts.atomicSession)
			.then(foundEnt => {
				return foundEnt ? this.toDTO(foundEnt, false) : null;
			});
	}

	/**
	 * @see IRepository.page
	 */
	public async page(pageIndex: number, pageSize: number, opts: cc.RepositoryPageOptions = {}): Promise<cc.PagedArray<TModel>> {
		let foundList: { total: number, results: Array<TEntity> },
			dtoList: TModel[],
			affectedRows: number;

		foundList = await this.executeQuery(
			query => {
				// let q = this.buildPage(pageIndex, pageSize, query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<TEntity>>((prevQuery, currBuilder) => {
					return currBuilder.buildPage(pageIndex, pageSize, prevQuery, query.clone(), opts);
				}, null);
				console.log('PAGE:', q.toSql());
				return q;
			},
			opts.atomicSession
		);

		if (!foundList || isEmpty(foundList.results)) {
			return null;
		}
		dtoList = this.toDTO(foundList.results, false);
		return new cc.PagedArray<TModel>(foundList.total, ...dtoList);
	}

	/**
	 * @see IRepository.patch
	 */
	public patch(model: Partial<TModel>, opts: cc.RepositoryPatchOptions = {}): Promise<Partial<TModel> & Partial<TModel>[]> {
		let entity = this.toEntity(model, true);

		// We check property in "entity" because the "model" here is partial.
		if (entity.hasOwnProperty('updatedAt')) {
			(<any>model)['updatedAt'] = this.utcNow.toDate();
			entity['updatedAt'] = this.utcNow.format();
		}

		return this.executeCommand(
			query => {
				// let q = this.buildPatch(entity, query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<number>>((prevQuery: any, currBuilder) => {
					return currBuilder.buildPatch(entity, prevQuery, query.clone(), opts);
				}, null);
				console.log('PATCH (%s):', entity, q.toSql());
				return q;
			},
			opts.atomicSession)
			// `query.patch` returns number of affected rows, but we want to return the updated model.
			.then(count => count ? <any>model : null);
	}

	/**
	 * @see ISoftDelRepository.recover
	 */
	public async recover(pk: TPk, opts: cc.RepositoryRecoverOptions = {}): Promise<number> {
		// let options = this.buildRecoverOpts(pk, opts),
		let options = this._queryBuilders.reduce<cc.RepositoryExistsOptions>((prevOpts: any, currBuilder) => {
			return currBuilder.buildRecoverOpts(pk, prevOpts, opts);
		}, null);

		// Fetch the recovered record
		let model = await this.findByPk(pk, options);

		// If record doesn't exist
		if (!model) { return 0; }

		// If another ACTIVE record with same unique keys exists
		options.includeDeleted = false;
		if (await this.exists(<any>model, options)) {
			throw new MinorException('DUPLICATE_UNIQUE_KEY');
		}
		return this.setDeleteState(pk, false, opts);
	}

	/**
	 * @see IRepository.update
	 */
	public update(model: TModel, opts: cc.RepositoryUpdateOptions = {}): Promise<TModel> {
		if (model.hasOwnProperty('updatedAt')) {
			model['updatedAt'] = this.utcNow.toDate();
		}
		let entity = this.toEntity(model, false),
			affectedRows: number;


		return this.executeCommand(
			query => {
				// let q = this.buildUpdate(entity, query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<number>>((prevQuery: any, currBuilder) => {
					return currBuilder.buildUpdate(entity, prevQuery, query.clone(), opts);
				}, null);
				console.log('UPDATE (%s): ', entity, q.toSql());
				return q;
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
	public executeCommand(callback: QueryCallback<TEntity>, atomicSession: cc.AtomicSession = null, ...names: string[]): Promise<any> {
		let queryJobs = this.prepare(callback, atomicSession, ...names),
			// Create exception here to have full error stack
			exception = new MinorException('NOT_SUCCESSFUL_ON_ALL_CONNECTIONS');

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
	public executeQuery(callback: QueryCallback<TEntity>, atomicSession?: cc.AtomicSession, name: string = '0'): Promise<any> {
		let queryJobs = this.prepare(callback, atomicSession, name);
		// Get value from first connection
		return queryJobs[0];
	}

	/**
	 * Translates from DTO model(s) to entity model(s).
	 */
	public toEntity(dto: TModel | TModel[] | Partial<TModel>, isPartial: boolean): TEntity & TEntity[] {
		if (!dto) { return null; }

		let entity;
		if (isPartial) {
			entity = this._EntityClass.translator.partial(dto);
		}
		entity = this._EntityClass.translator.whole(dto);

		for (let prop of ['createdAt', 'updatedAt', 'deletedAt']) {
			if (dto[prop]) {
				entity[prop] = moment.utc(dto[prop]).format();
			}
		}

		return entity;
	}

	/**
	 * Translates from entity model(s) to DTO model(s).
	 */
	public toDTO(entity: TEntity | TEntity[] | Partial<TEntity>, isPartial: boolean): TModel & TModel[] {
		if (!entity) { return null; }

		let dto;
		if (isPartial) {
			dto = this._EntityClass.translator.partial(entity, { enableValidation: false });
		}
		// Disable validation because it's unnecessary.
		dto = this._EntityClass.translator.whole(entity, { enableValidation: false });

		for (let prop of ['createdAt', 'updatedAt', 'deletedAt']) {
			if (entity[prop]) {
				dto[prop] = moment.utc(entity[prop]).toDate();
			}
		}

		return dto;
	}

	/**
	 * Maps from an array of columns to array of values.
	 * @param pk Object to get values from
	 * @param cols Array of column names
	 */
	public toArr(pk: TPk | TEntity | Partial<TEntity>, cols: string[]): any[] {
		return cols.map(c => pk[c]);
	}


	/**
	 * @see IDatabaseConnector.query
	 */
	protected prepare(callback: QueryCallback<TEntity>, atomicSession?: cc.AtomicSession, ...names: string[]): Promise<any>[] {
		return this._dbConnector.prepare(this._EntityClass, <any>callback, atomicSession, ...names);
	}

	protected buildDeleteState(pk: TPk, isDel: boolean): any {
		let delta: any,
			deletedAt = (isDel ? this.utcNow.format() : null);

		if (this._options.isMultiTenancy) {
			return Object.assign(pk, { deletedAt });
		} else {
			return {
				id: pk,
				deletedAt
			};
		}
	}

	protected setDeleteState(pk: TPk, isDel: boolean, opts: cc.RepositoryDeleteOptions = {}): Promise<number> {
		let delta = this.buildDeleteState(pk, isDel);

		return this.executeCommand(
			query => {
				// let q = this.buildPatch(delta, query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<number>>((prevQuery: any, currBuilder) => {
					return currBuilder.buildPatch(delta, prevQuery, query.clone(), opts);
				}, null);
				console.log('DEL STATE (%s):', isDel, q.toSql());
				return q;
			},
			opts.atomicSession);
	}
}