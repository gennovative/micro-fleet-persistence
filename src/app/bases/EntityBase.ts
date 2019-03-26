import { Model } from 'objection'
const mapKeys = require('lodash/mapKeys')

import { ModelAutoMapper } from '@micro-fleet/common'

const snakeCase = global['snakeCase']
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
     */
    public static readonly idColumn: string[] = ['id']

    /**
     * An array of non-primary unique column names.
     */
    public static readonly uniqColumn: string[] = []

    /**
     * Same with `idColumn`, but transform snakeCase to camelCase.
     * Should be overriden (['id', 'tenantId']) for composite PK.
     */
    public static get idProp(): string[] {
        return this.idColumn.map<string>(camelCase)
    }


    // public id: bigint = undefined

    /**
     * This is called when an object is serialized to database format.
     */
    public $formatDatabaseJson(json: any) {
        json = super.$formatDatabaseJson(json)

        return mapKeys(json, (value: any, key: string) => {
            // Maps from "camelCase" to "snake_case" except special keyword.
            /* istanbul ignore if */
            if (key.indexOf('#') == 0) {
                return key
            }
            return snakeCase(<any>key)
        })
    }

    /**
     * This is called when an object is read from database.
     */
    public $parseDatabaseJson(json: any) {
        json = mapKeys(json, (value: any, key: string) => {
            // Maps from "snake_case" to "camelCase"
            return camelCase(<any>key)
        })

        return super.$parseDatabaseJson(json)
    }
}

EntityBase.knex(null)
