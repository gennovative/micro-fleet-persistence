/// <reference path="./globals.d.ts" />

declare module 'back-lib-foundation/EntityBase' {
	import { Model } from 'objection';
	export abstract class EntityBase extends Model {
	    static readonly tableName: string;
	    id: number;
	}

}
declare module 'back-lib-foundation/RepositoryBase' {
	import { QueryBuilder } from 'objection';
	import { EntityBase } from 'back-lib-foundation/EntityBase';
	export class PagedArray<T> extends Array<T> {
	    private _total;
	    /**
	     * Gets total number of items in database.
	     */
	    readonly total: number;
	    constructor(_total: any, source: Array<T>);
	}
	export interface IRepository<TModel extends IModelDTO> {
	    countAll(): Promise<number>;
	    create(model: TModel): Promise<TModel>;
	    delete(id: number): Promise<number>;
	    find(id: number): Promise<TModel>;
	    page(pageIndex: number, pageSize: number): Promise<PagedArray<TModel>>;
	    patch(model: Partial<TModel>): Promise<number>;
	    update(model: TModel): Promise<number>;
	}
	export abstract class RepositoryBase<TEntity extends EntityBase, TModel extends IModelDTO> implements IRepository<TModel> {
	    protected _modelMapper: AutoMapper;
	    constructor(_modelMapper: AutoMapper);
	    countAll(): Promise<number>;
	    create(model: TModel): Promise<TModel>;
	    delete(id: number): Promise<number>;
	    find(id: number): Promise<TModel>;
	    patch(model: Partial<TModel>): Promise<number>;
	    page(pageIndex: number, pageSize: number): Promise<PagedArray<TModel>>;
	    update(model: TModel): Promise<number>;
	    protected abstract query(): QueryBuilder<TEntity>;
	    protected abstract createModelMap(): void;
	    protected abstract toEntity(from: TModel | TModel[]): TEntity & TEntity[];
	    protected abstract toDTO(from: TEntity | TEntity[]): TModel & TModel[];
	}

}
declare module 'back-lib-foundation' {
	import 'automapper-ts';
	export * from 'back-lib-foundation/EntityBase';
	export * from 'back-lib-foundation/RepositoryBase';

}
