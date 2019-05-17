"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objection_1 = require("objection");
const mapKeys = require('lodash/mapKeys');
const snakeCase = global['snakeCase'];
const camelCase = global['camelCase'];
class EntityBase extends objection_1.Model {
    /**
     * @abstract
     */
    static get tableName() {
        throw new Error('This method must be implemented by derived class!');
    }
    /**
     * Same with `idColumn`, but transform snakeCase to camelCase.
     */
    static get idProp() {
        return this.idColumn.map(camelCase);
    }
    /**
     * Same with `uniqColumn`, but transform snakeCase to camelCase.
     */
    static get uniqProp() {
        return this.uniqColumn.map(camelCase);
    }
    // public id: bigint = undefined
    /**
     * This is called when an object is serialized to database format.
     */
    $formatDatabaseJson(json) {
        json = super.$formatDatabaseJson(json);
        return mapKeys(json, (value, key) => {
            // Maps from "camelCase" to "snake_case" except special keyword.
            /* istanbul ignore if */
            if (key.indexOf('#') == 0) {
                return key;
            }
            return snakeCase(key);
        });
    }
    /**
     * This is called when an object is read from database.
     */
    $parseDatabaseJson(json) {
        json = mapKeys(json, (value, key) => {
            // Maps from "snake_case" to "camelCase"
            return camelCase(key);
        });
        return super.$parseDatabaseJson(json);
    }
}
/**
 * @abstract
 * Function to convert other object to this class type.
 * This method must be implemented by derived class!
 */
EntityBase.translator = undefined;
/**
 * [ObjectionJS] Array of primary column names.
 * Should be overriden (['id', 'tenant_id']) for composite PK.
 */
EntityBase.idColumn = ['id'];
/**
 * An array of non-primary unique column names.
 */
EntityBase.uniqColumn = [];
exports.EntityBase = EntityBase;
EntityBase.knex(null);
//# sourceMappingURL=EntityBase.js.map