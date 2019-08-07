"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objection_1 = require("objection");
const camelCase = global['camelCase'];
class ORMModelBase extends objection_1.Model {
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
}
/**
 * [ObjectionJS] Array of primary column names.
 * Should be overriden (['id', 'tenant_id']) for composite PK.
 */
ORMModelBase.idColumn = ['id'];
/**
 * An array of non-primary unique column names.
 */
ORMModelBase.uniqColumn = [];
exports.ORMModelBase = ORMModelBase;
ORMModelBase.knex(null);
//# sourceMappingURL=ORMModelBase.js.map