"use strict";
// import { PagedArray, injectable, unmanaged } from '@micro-fleet/common'
// import * as it from '../interfaces'
// import { IDatabaseConnector } from '../connector/IDatabaseConnector'
// import { EntityBase } from './EntityBase'
// import { BatchProcessor } from './BatchProcessor'
// import { RepositoryBase, RepositoryBaseOptions } from './RepositoryBase'
// @injectable()
// export abstract class SoftDelRepositoryBase<TEntity extends EntityBase, TModel extends object, TPk extends PkType = string, TUk = NameUk>
//     extends RepositoryBase<TEntity, TModel, TPk, TUk>
//     implements it.ISoftDelRepository<TModel, TPk, TUk> {
//     protected _processor: BatchProcessor<TEntity, TModel, TPk, TUk>
//     constructor( @unmanaged() EntityClass: Newable, @unmanaged() DtoClass: Newable,
//             @unmanaged() dbConnector: IDatabaseConnector, @unmanaged() options: RepositoryBaseOptions<TEntity, TModel, TPk, TUk> = {}) {
//         super(EntityClass, DtoClass, dbConnector, options)
//     }
//     /**
//      * @see IRepository.countAll
//      */
//     public async countAll(opts: it.RepositoryCountAllOptions = {}): Promise<number> {
//         opts = Object.assign(<it.RepositoryCountAllOptions>{
//             excludeDeleted: true,
//         }, opts)
//         return this._processor.countAll(opts)
//     }
//     /**
//      * @see ISoftDelRepository.deleteSoft
//      */
//     public deleteSoft(pk: TPk | TPk[], opts: it.RepositoryDeleteOptions = {}): Promise<number> {
//         return this._processor.deleteSoft(pk, opts)
//     }
//     /**
//      * @see IRepository.exists
//      */
//     public async exists(props: TUk, opts: it.RepositoryExistsOptions = {}): Promise<boolean> {
//         opts = Object.assign(<it.RepositoryExistsOptions>{
//             excludeDeleted: true,
//         }, opts)
//         return this._processor.exists(props, opts)
//     }
//     /**
//      * @see IRepository.page
//      */
//     public async page(pageIndex: number, pageSize: number, opts: it.RepositoryPageOptions = {}): Promise<PagedArray<TModel>> {
//         opts = Object.assign(<it.RepositoryPageOptions>{
//             excludeDeleted: true,
//         }, opts)
//         return this._processor.page(pageIndex, pageSize, opts)
//     }
//     /**
//      * @see ISoftDelRepository.recover
//      */
//     public async recover(pk: TPk | TPk[], opts: it.RepositoryRecoverOptions = {}): Promise<number> {
//         return this._processor.recover(pk, opts)
//     }
// }
//# sourceMappingURL=SoftDelRepositoryBase.js.map