import { Model } from 'objection'

const camelCase = global['camelCase']


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
}

ORMModelBase.knex(null)
