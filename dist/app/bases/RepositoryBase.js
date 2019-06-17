"use strict";
// import { Guard, PagedArray, injectable, unmanaged } from '@micro-fleet/common'
// import * as it from '../interfaces'
// import { IDatabaseConnector } from '../connector/IDatabaseConnector'
// import { EntityBase } from './EntityBase'
// import { MonoProcessor, ProcessorOptions } from './MonoProcessor'
// import { BatchProcessor } from './BatchProcessor'
// import { VersionControlledProcessor } from './VersionControlledProcessor'
// export interface RepositoryBaseOptions<TEntity extends EntityBase, TModel extends object, TPk extends PkType = string, TUk = NameUk>
//         extends ProcessorOptions {
//     /**
//      * Used by default version-controlled processor and default batch processor.
//      */
//     monoProcessor?: MonoProcessor<TEntity, TModel, TPk, TUk>
//     /**
//      * Version-controlled processor
//      */
//     versionProcessor?: VersionControlledProcessor<TEntity, TModel, TPk, TUk>
//     /**
//      * Providing this will ignore `monoProcessor` and `versionProcessor`.
//      */
//     batchProcessor?: BatchProcessor<TEntity, TModel, TPk, TUk>
// }
// @injectable()
// export abstract class RepositoryBase<TEntity extends EntityBase, TModel extends object, TPk extends PkType = string, TUk = NameUk>
//     implements it.ILegacyRepository<TModel, TPk, TUk> {
//     protected _processor: BatchProcessor<TEntity, TModel, TPk, TUk>
//     constructor( @unmanaged() EntityClass: Newable, @unmanaged() DtoClass: Newable,
//             @unmanaged() dbConnector: IDatabaseConnector, @unmanaged() options: RepositoryBaseOptions<TEntity, TModel, TPk, TUk> = {}) {
//         Guard.assertArgDefined('EntityClass', EntityClass)
//         Guard.assertIsTruthy(EntityClass['tableName'] && EntityClass['translator'],
//             'Param "EntityClass" must inherit base class "EntityBase"!')
//         Guard.assertArgDefined('DtoClass', DtoClass)
//         Guard.assertIsTruthy(DtoClass['translator'], 'Param "DtoClass" must inherit base class "DtoBase"!')
//         Guard.assertArgDefined('dbConnector', dbConnector)
//         let crud: any
//         if (options.isVersionControlled) {
//             // TODO: Should let `VersionControlledProcessor` accepts `MonoProcessor` as argument.
//             crud = options.versionProcessor || new VersionControlledProcessor<TEntity, TModel, TPk, TUk>(EntityClass, DtoClass,
//                 dbConnector, options)
//         } else {
//             crud = options.monoProcessor || new MonoProcessor<TEntity, TModel, TPk, TUk>(EntityClass, DtoClass, dbConnector, options)
//         }
//         this._processor = options.batchProcessor || new BatchProcessor<TEntity, TModel, TPk, TUk>(crud, dbConnector)
//     }
//     /**
//      * @see IRepository.countAll
//      */
//     public async countAll(opts: it.RepositoryCountAllOptions = {}): Promise<number> {
//         return this._processor.countAll(opts)
//     }
//     /**
//      * @see IRepository.create
//      */
//     public create(model: TModel | TModel[], opts: it.RepositoryCreateOptions = {}): Promise<TModel | TModel[]> {
//         return this._processor.create(model, opts)
//     }
//     /**
//      * @see IRepository.deleteHard
//      */
//     public deleteHard(pk: TPk | TPk[], opts: it.RepositoryDeleteOptions = {}): Promise<number> {
//         return this._processor.deleteHard(pk, opts)
//     }
//     /**
//      * @see IRepository.exists
//      */
//     public async exists(props: TUk, opts: it.RepositoryExistsOptions = {}): Promise<boolean> {
//         return this._processor.exists(props, opts)
//     }
//     /**
//      * @see IRepository.findByPk
//      */
//     public findByPk(pk: TPk, opts: it.RepositoryFindOptions = {}): Promise<TModel> {
//         return this._processor.findByPk(pk, opts)
//     }
//     /**
//      * @see IRepository.page
//      */
//     public async page(pageIndex: number, pageSize: number, opts: it.LegacyRepositoryPageOptions = {}): Promise<PagedArray<TModel>> {
//         return this._processor.page(pageIndex, pageSize, opts)
//     }
//     /**
//      * @see IRepository.patch
//      */
//     public patch(model: Partial<TModel> | Partial<TModel>[],
//             opts: it.RepositoryPatchOptions = {}): Promise<Partial<TModel> | Partial<TModel>[]> {
//         return this._processor.patch(model, opts)
//     }
//     /**
//      * @see IRepository.update
//      */
//     public update(model: TModel | TModel[], opts: it.RepositoryUpdateOptions = {}): Promise<TModel | TModel[]> {
//         return this._processor.update(model, opts)
//     }
// }
//# sourceMappingURL=RepositoryBase.js.map