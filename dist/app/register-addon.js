"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@micro-fleet/common");
const KnexDatabaseConnector_1 = require("./connector/KnexDatabaseConnector");
const DatabaseAddOn_1 = require("./DatabaseAddOn");
const Types_1 = require("./Types");
function registerDbAddOn() {
    const depCon = common_1.serviceContext.dependencyContainer;
    if (!depCon.isBound(Types_1.Types.DB_CONNECTOR)) {
        depCon.bind(Types_1.Types.DB_CONNECTOR, KnexDatabaseConnector_1.KnexDatabaseConnector).asSingleton();
    }
    if (!depCon.isBound(Types_1.Types.DB_ADDON)) {
        depCon.bind(Types_1.Types.DB_ADDON, DatabaseAddOn_1.DatabaseAddOn).asSingleton();
    }
    const dbAdt = depCon.resolve(Types_1.Types.DB_ADDON);
    return dbAdt;
}
exports.registerDbAddOn = registerDbAddOn;
//# sourceMappingURL=register-addon.js.map