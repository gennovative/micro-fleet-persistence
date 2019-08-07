"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
/* istanbul ignore next */
if (!Reflect || typeof Reflect['hasOwnMetadata'] !== 'function') {
    require('reflect-metadata');
}
const memoize = require("lodash/memoize");
global['snakeCase'] = memoize(require('lodash/snakeCase'));
global['camelCase'] = memoize(require('lodash/camelCase'));
__export(require("./atom/AtomicSessionFactory"));
__export(require("./atom/AtomicSessionFlow"));
__export(require("./atom/AtomicSession"));
__export(require("./bases/ORMModelBase"));
__export(require("./bases/PgCrudRepositoryBase"));
__export(require("./connector/KnexDatabaseConnector"));
__export(require("./DatabaseAddOn"));
__export(require("./DatabaseSettings"));
__export(require("./DatabaseAddOn"));
__export(require("./interfaces"));
__export(require("./register-addon"));
__export(require("./Types"));
//# sourceMappingURL=index.js.map