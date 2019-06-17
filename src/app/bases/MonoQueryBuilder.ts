// import { Model, QueryBuilder, raw } from 'objection'

// import * as it from '../interfaces'
// import { IQueryBuilder } from './IQueryBuilder'


// export class MonoQueryBuilder<TEntity extends Model, TModel, TUk = NameUk>
//     implements IQueryBuilder<TEntity, TModel, string, TUk> {

//     private _pkProp: string

//     constructor(private _EntityClass: Newable) {
//         this._pkProp = this._EntityClass['idProp'][0]
//     }


//     public buildCountAll(prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
//             opts: it.RepositoryCountAllOptions): QueryBuilder<TEntity> {
//         // const q = rawQuery.count(`${this._pkProp} as total`)
//         // TODO: This is Postgres-specific, we need a more cross-vendor solution.
//         const q = rawQuery.select(raw('CAST(count(*) AS INTEGER) as total'))
//         return (opts.includeArchived) ? q : q.whereNull('deleted_at')
//     }

//     public buildDeleteHard(pk: string, prevQuery: QueryBuilder<TEntity>,
//             rawQuery: QueryBuilder<TEntity>): QueryBuilder<TEntity> {
//         return rawQuery.deleteById(<any>pk) as any as QueryBuilder<TEntity>
//     }

//     public buildExists(uniqVals: any[], prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
//             opts: it.RepositoryExistsOptions): QueryBuilder<TEntity> {
//         let q = rawQuery.count(`${this._pkProp} as total`)
//         if (uniqVals && uniqVals.length) {
//             q = q.where(builder => {
//                 (this._EntityClass['uniqColumn'] as string[]).forEach((c, i) => {
//                     const v = uniqVals[i]
//                     if (v === null) {
//                         builder.orWhereNull(c)
//                     } else if (v !== undefined) {
//                         builder.orWhere(c, '=', v)
//                     }
//                 })
//             })
//         }
//         return (opts.includeArchived) ? q : q.whereNull('deleted_at')
//     }

//     public buildFind(pk: string, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
//             opts: it.RepositoryFindOptions = {}): QueryBuilder<TEntity> {
//         return <any>rawQuery.findById(<any>pk)
//     }

//     public buildPage(pageIndex: number, pageSize: number, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
//             opts: it.LegacyRepositoryPageOptions): QueryBuilder<TEntity> {
//         let q = rawQuery.page(pageIndex, pageSize)
//         if (opts.sortBy) {
//             const direction = opts.sortType || 'asc'
//             q = q.orderBy(opts.sortBy, direction)
//         }
//         return (opts.excludeDeleted ? q.whereNull('deleted_at') : q) as any as QueryBuilder<TEntity>
//     }

//     public buildPatch(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
//             opts: it.RepositoryPatchOptions): QueryBuilder<TEntity> {
//         return rawQuery.patch(entity).where(this._pkProp, entity[this._pkProp]) as any as QueryBuilder<TEntity>
//     }

//     public buildRecoverOpts(pk: string, prevOpts: it.RepositoryRecoverOptions,
//             rawOpts: it.RepositoryRecoverOptions): it.RepositoryExistsOptions {
//         return {
//             includeArchived: true,
//         }
//     }

//     public buildUpdate(entity: TEntity, prevQuery: QueryBuilder<TEntity>, rawQuery: QueryBuilder<TEntity>,
//             opts: it.RepositoryPatchOptions): QueryBuilder<TEntity> {
//         return rawQuery.update(entity).where(this._pkProp, entity[this._pkProp]) as any as QueryBuilder<TEntity>
//     }

// }
