import { Model } from 'objection'
import { Newable, IModelAutoMapper, IModelValidator } from '@micro-fleet/common'

const camelCase = global['camelCase']


type ORMClass<U> = Newable<U> & typeof ORMModelBase


export abstract class ORMModelBase extends Model {

    /**
     * @abstract
     */
    public static get tableName(): string {
        throw new Error('This method must be implemented by derived class!')
    }

    /**
     * [ObjectionJS] Array of primary column names.
     * Should be overriden (['id', 'tenant_id']) for composite PK.
     */
    public static readonly idColumn: string[] = ['id']

    /**
     * Same with `idColumn`, but transform snakeCase to camelCase.
     */
    public static get idProp(): string[] {
        return this.idColumn.map<string>(camelCase)
    }

    /**
     * An array of non-primary unique column names.
     */
    public static readonly uniqColumn: string[] = []

    /**
     * Same with `uniqColumn`, but transform snakeCase to camelCase.
     */
    public static get uniqProp(): string[] {
        return this.uniqColumn.map<string>(camelCase)
    }

    // These methods will be implemented by @translatable()
    // They are here for better typing and compatible with ITranslatable

    public static getTranslator: <TT extends ORMModelBase>(this: ORMClass<TT>) => IModelAutoMapper<TT>
    public static getValidator: <VT extends ORMModelBase>(this: ORMClass<VT>) => IModelValidator<VT>
    public static from: <FT extends ORMModelBase>(this: ORMClass<FT>, source: object) => FT
    public static fromMany: <FT extends ORMModelBase>(this: ORMClass<FT>, source: object[]) => FT[]
}

ORMModelBase.knex(null)
