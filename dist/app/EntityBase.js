"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objection_1 = require("objection");
class EntityBase extends objection_1.Model {
    /**
     * @abstract
     */
    static get tableName() {
        throw 'This method must be implemented by derived class!';
    }
}
exports.EntityBase = EntityBase;
EntityBase.knex(null);

//# sourceMappingURL=EntityBase.js.map
