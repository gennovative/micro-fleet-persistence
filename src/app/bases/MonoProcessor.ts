/// <reference types="debug" />

const debug: debug.IDebugger = require('debug')('MonoProcessor');
import isEmpty from 'lodash/isEmpty';

import { QueryBuilder, QueryBuilderSingle } from 'objection';
import moment from 'moment';
import { DtoBase, MinorException, PagedArray } from '@micro-fleet/common';

import * as it from '../interfaces';
import { AtomicSession } from '../atom/AtomicSession';
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

export class MonoProcessor<TEntity extends EntityBase, TModel extends DtoBase, TPk extends PkType = BigInt, TUk = NameUk> {

	/**
	 * Gets array of non-primary unique property(ies).
	 */
	public get ukCol(): string[] {
		return this._EntityClass.uniqColumn;
	}

	protected _queryBuilders: IQueryBuilder<TEntity, TModel, PkType, TUk>[];

	constructor(
		protected _EntityClass: typeof EntityBase,
		protected _DtoClass: typeof DtoBase,
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
	public async countAll(opts: it.RepositoryCountAllOptions = {}): Promise<number> {
		let result = await this.executeQuery(
			(query: QueryBuilder<TEntity>) => {
				// let q = this.buildCountAll(query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<TEntity>>((prevQuery, currBuilder) => {
					return currBuilder.buildCountAll(prevQuery, query.clone(), opts); 
				}, null);
				debug('COUNT ALL: %s', q.toSql());
				return <any>q;
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
	public create(model: TModel, opts: it.RepositoryCreateOptions = {}): Promise<TModel & TModel[]> {
		if (model.hasOwnProperty('createdAt')) {
			model['createdAt'] = model['updatedAt'] = this.utcNow.toDate();
		}
		let entity = this.toEntity(model, false) as TEntity;

		return this.executeQuery(query => <any>query.insert(entity), opts.atomicSession)
			.then(() => <any>model);
	}

	/**
	 * @see ISoftDelRepository.deleteSoft
	 */
	public deleteSoft(pk: TPk, opts: it.RepositoryDeleteOptions = {}): Promise<number> {
		return this._setDeleteState(pk, true, opts);
	}

	/**
	 * @see IRepository.deleteHard
	 */
	public deleteHard(pk: TPk, opts: it.RepositoryDeleteOptions = {}): Promise<number> {
		return this.executeQuery(
			query => {
				// let q = this.buildDeleteHard(pk, query);
				let q = this._queryBuilders.reduce<QueryBuilderSingle<number>>((prevQuery: any, currBuilder) => {
					return currBuilder.buildDeleteHard(pk, prevQuery, query.clone());
				}, null);
				debug('HARD DELETE: %s', q.toSql());
				return <any>q;
			},
			opts.atomicSession
		);
	}

	/**
	 * @see IRepository.exists
	 */
	public async exists(props: TUk, opts: it.RepositoryExistsOptions = {}): Promise<boolean> {
		let result = await this.executeQuery(
			query => {
				// let q = this.buildExists(props, query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<TEntity>>((prevQuery, currBuilder) => {
					return currBuilder.buildExists(this.toArr(props, this.ukCol), prevQuery, query.clone(), opts);
				}, null);
				debug('EXIST: %s', q.toSql());
				return <any>q;
			},
			opts.atomicSession
		);

		return result[0]['total'] != 0;
	}

	/**
	 * @see IRepository.findByPk
	 */
	public findByPk(pk: TPk, opts: it.RepositoryFindOptions = {}): Promise<TModel> {
		return this.executeQuery(
			query => {
				// let q = this.buildFind(pk, query);
				let q = this._queryBuilders.reduce<QueryBuilder<TEntity>>((prevQuery, currBuilder) => {
					return currBuilder.buildFind(pk, prevQuery, query.clone(), opts);
				}, null);
				debug('FIND BY (%s): %s', pk, q.toSql());
				return <any>q;
			},
			opts.atomicSession)
			.then(foundEnt => {
				return foundEnt ? this.toDTO(foundEnt, false) : null;
			});
	}

	/**
	 * @see IRepository.page
	 */
	public async page(pageIndex: number, pageSize: number, opts: it.RepositoryPageOptions = {}): Promise<PagedArray<TModel>> {
		let foundList: { total: number, results: Array<TEntity> },
			dtoList: TModel[];

		foundList = await this.executeQuery(
			query => {
				// let q = this.buildPage(pageIndex, pageSize, query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<TEntity>>((prevQuery, currBuilder) => {
					return currBuilder.buildPage(pageIndex, pageSize, prevQuery, query.clone(), opts);
				}, null);
				debug('PAGE: %s', q.toSql());
				return <any>q;
			},
			opts.atomicSession
		);

		if (!foundList || isEmpty(foundList.results)) {
			return null;
		}
		dtoList = this.toDTO(foundList.results, false) as TModel[];
		return new PagedArray<TModel>(foundList.total, ...dtoList);
	}

	/**
	 * @see IRepository.patch
	 */
	public patch(model: Partial<TModel>, opts: it.RepositoryPatchOptions = {}): Promise<Partial<TModel> & Partial<TModel>[]> {
		let entity = this.toEntity(model, true) as TEntity;

		// We check property in "entity" because the "model" here is partial.
		if (entity.hasOwnProperty('updatedAt')) {
			(<any>model)['updatedAt'] = this.utcNow.toDate();
			entity['updatedAt'] = this.utcNow.format();
		}

		return this.executeQuery(
			query => {
				// let q = this.buildPatch(entity, query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<number>>((prevQuery: any, currBuilder) => {
					return currBuilder.buildPatch(entity, prevQuery, query.clone(), opts);
				}, null);
				debug('PATCH (%o): %s', entity, q.toSql());
				return <any>q;
			},
			opts.atomicSession)
			// `query.patch` returns number of affected rows, but we want to return the updated model.
			.then(count => count ? <any>model : null);
	}

	/**
	 * @see ISoftDelRepository.recover
	 */
	public async recover(pk: TPk, opts: it.RepositoryRecoverOptions = {}): Promise<number> {
		// let options = this.buildRecoverOpts(pk, opts),
		let options = this._queryBuilders.reduce<it.RepositoryExistsOptions>((prevOpts: any, currBuilder) => {
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
		return this._setDeleteState(pk, false, opts);
	}

	/**
	 * @see IRepository.update
	 */
	public update(model: TModel, opts: it.RepositoryUpdateOptions = {}): Promise<TModel> {
		if (model.hasOwnProperty('updatedAt')) {
			model['updatedAt'] = this.utcNow.toDate();
		}
		let entity = this.toEntity(model, false) as TEntity;


		return this.executeQuery(
			(query: QueryBuilder<TEntity>) => {
				// let q = this.buildUpdate(entity, query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<any>>((prevQuery: any, currBuilder) => {
					return currBuilder.buildUpdate(entity, prevQuery, query.clone(), opts);
				}, null);
				debug('UPDATE (%o): %s', entity, q.toSql());
				return <any>q;
			}, opts.atomicSession)
			// `query.update` returns number of affected rows, but we want to return the updated model.
			.then(count => count ? <any>model : null);
	}

	/**
	 * Executing an query
	 */
	public executeQuery(callback: QueryCallback<TEntity>, atomicSession?: AtomicSession): Promise<any> {
		return this._prepare(callback, atomicSession);
	}

	/**
	 * Translates from DTO model(s) to entity model(s).
	 */
	public toEntity(dto: TModel | TModel[] | Partial<TModel>, isPartial: boolean): TEntity | TEntity[] {
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

		return entity as (TEntity | TEntity[]);
	}

	/**
	 * Translates from entity model(s) to DTO model(s).
	 */
	public toDTO(entity: TEntity | TEntity[] | Partial<TEntity>, isPartial: boolean): TModel | TModel[] {
		if (!entity) { return null; }

		let dto;
		if (isPartial) {
			dto = this._DtoClass.translator.partial(entity, { enableValidation: false });
		}
		// Disable validation because it's unnecessary.
		dto = this._DtoClass.translator.whole(entity, { enableValidation: false });

		for (let prop of ['createdAt', 'updatedAt', 'deletedAt']) {
			if (entity[prop]) {
				dto[prop] = moment.utc(entity[prop]).toDate();
			}
		}

		return dto as (TModel | TModel[]);
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
	protected _prepare(callback: QueryCallback<TEntity>, atomicSession?: AtomicSession): Promise<any> {
		return this._dbConnector.prepare(this._EntityClass, <any>callback, atomicSession);
	}

	protected _buildDeleteState(pk: TPk, isDel: boolean): any {
		let deletedAt = (isDel ? this.utcNow.format() : null);

		if (this._options.isMultiTenancy) {
			return Object.assign(pk, { deletedAt });
		} else {
			return {
				id: pk,
				deletedAt
			};
		}
	}

	protected _setDeleteState(pk: TPk, isDel: boolean, opts: it.RepositoryDeleteOptions = {}): Promise<number> {
		let delta = this._buildDeleteState(pk, isDel);

		return this.executeQuery(
			query => {
				// let q = this.buildPatch(delta, query, opts);
				let q = this._queryBuilders.reduce<QueryBuilder<number>>((prevQuery: any, currBuilder) => {
					return currBuilder.buildPatch(delta, prevQuery, query.clone(), opts);
				}, null);
				debug('DEL STATE (%s): %s', isDel, q.toSql());
				return <any>q;
			},
			opts.atomicSession);
	}
}