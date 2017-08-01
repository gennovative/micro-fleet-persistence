"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objection_1 = require("objection");
const mapKeys = require('lodash/mapKeys');
const memoize = require('lodash/memoize');
const snakeCase = memoize(require('lodash/snakeCase'));
const camelCase = memoize(require('lodash/camelCase'));
class EntityBase extends objection_1.Model {
    constructor() {
        super(...arguments);
        this.id = undefined;
    }
    /**
     * @abstract
     */
    static get tableName() {
        throw 'This method must be implemented by derived class!';
    }
    /**
     * This is called when an object is serialized to database format.
     */
    $formatDatabaseJson(json) {
        json = super.$formatDatabaseJson(json);
        return mapKeys(json, (value, key) => {
            // Maps from "camelCase" to "snake_case" except special keyword.
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
exports.EntityBase = EntityBase;
EntityBase.knex(null);

//# sourceMappingURL=EntityBase.js.map
