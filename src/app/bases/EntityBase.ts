import { Model } from 'objection'
import { ModelAutoMapper } from '@micro-fleet/common'

const camelCase = global['camelCase']


export abstract class EntityBase extends Model {

    /**
     * @abstract
     */
    public static get tableName(): string {
        throw new Error('This method must be implemented by derived class!')
    }

    /**
     * @abstract
     * Function to convert other object to this class type.
     * This method must be implemented by derived class!
     */
    public static readonly translator: ModelAutoMapper<any> = undefined

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
}

EntityBase.knex(null)
