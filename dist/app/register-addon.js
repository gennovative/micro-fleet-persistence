"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@micro-fleet/common");
const AtomicSessionFactory_1 = require("./atom/AtomicSessionFactory");
const KnexDatabaseConnector_1 = require("./connector/KnexDatabaseConnector");
const DatabaseAddOn_1 = require("./DatabaseAddOn");
const Types_1 = require("./Types");
function registerDbAddOn() {
    const depCon = common_1.serviceContext.dependencyContainer;
    if (!depCon.isBound(Types_1.Types.DB_CONNECTOR)) {
        depCon.bindConstructor(Types_1.Types.DB_CONNECTOR, KnexDatabaseConnector_1.KnexDatabaseConnector).asSingleton();
    }
    if (!depCon.isBound(Types_1.Types.ATOMIC_SESSION_FACTORY)) {
        depCon.bindConstructor(Types_1.Types.ATOMIC_SESSION_FACTORY, AtomicSessionFactory_1.AtomicSessionFactory).asSingleton();
    }
    if (!depCon.isBound(Types_1.Types.DB_ADDON)) {
        depCon.bindConstructor(Types_1.Types.DB_ADDON, DatabaseAddOn_1.DatabaseAddOn).asSingleton();
    }
    const addon = depCon.resolve(Types_1.Types.DB_ADDON);
    return addon;
}
exports.registerDbAddOn = registerDbAddOn;
//# sourceMappingURL=register-addon.js.map