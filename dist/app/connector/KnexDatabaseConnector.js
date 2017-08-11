"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex = require("knex");
const isEmpty = require('lodash/isEmpty');
const back_lib_common_util_1 = require("back-lib-common-util");
/**
 * Provides settings from package
 */
let KnexDatabaseConnector = class KnexDatabaseConnector {
    constructor() {
        this._connections = [];
        this._knex = knex;
    }
    /**
     * @see IDatabaseConnector.connections
     */
    get connections() {
        return this._connections;
    }
    /**
     * @see IDatabaseConnector.addConnection
     */
    addConnection(detail, name) {
        back_lib_common_util_1.Guard.assertArgDefined('detail', detail);
        let settings = {
            client: detail.clientName,
            useNullAsDefault: true,
            connection: this.buildConnSettings(detail)
        }, knexConn = this._knex(settings);
        knexConn.customName = name ? name : (this._connections.length + '');
        this._connections.push(knexConn);
    }
    /**
     * @see IDatabaseConnector.dispose
     */
    dispose() {
        let destroyPromises = this._connections.map(conn => {
            return conn['destroy']();
        });
        this._knex = null;
        this._connections = null;
        return destroyPromises;
    }
    /**
     * @see IDatabaseConnector.prepare
     */
    prepare(EntityClass, callback, atomicSession, ...names) {
        back_lib_common_util_1.Guard.assertIsNotEmpty(this._connections, 'Must call addConnection() before executing any query.');
        if (atomicSession) {
            return this.prepareTransactionalQuery(EntityClass, callback, atomicSession);
        }
        return this.prepareSimpleQuery(EntityClass, callback, ...names);
    }
    buildConnSettings(detail) {
        // 1st priority: connect to a local file.
        if (detail.fileName) {
            return { filename: detail.fileName };
        }
        // 2nd priority: connect with a connection string.
        if (detail.connectionString) {
            return detail.connectionString;
        }
        // Last priority: connect with host credentials.
        if (detail.host) {
            return {
                host: detail.host.address,
                user: detail.host.user,
                password: detail.host.password,
                database: detail.host.database,
            };
        }
        throw new back_lib_common_util_1.MinorException('No database settings!');
    }
    prepareSimpleQuery(EntityClass, callback, ...names) {
        let calls = [], BoundClass;
        for (let knexConn of this._connections) {
            if (isEmpty(names)) {
                BoundClass = EntityClass['bindKnex'](knexConn);
                calls.push(callback(BoundClass['query'](), BoundClass));
            }
            else {
                // If connection names are specified, we only execute queries on those connections.
                if (names.includes(knexConn.customName)) {
                    BoundClass = EntityClass['bindKnex'](knexConn);
                    calls.push(callback(BoundClass['query'](), BoundClass));
                }
            }
        }
        return calls;
    }
    prepareTransactionalQuery(EntityClass, callback, atomicSession) {
        let BoundClass = EntityClass['bindKnex'](atomicSession.knexConnection);
        return [
            callback(BoundClass['query'](atomicSession.knexTransaction), BoundClass)
        ];
    }
};
KnexDatabaseConnector = __decorate([
    back_lib_common_util_1.injectable(),
    __metadata("design:paramtypes", [])
], KnexDatabaseConnector);
exports.KnexDatabaseConnector = KnexDatabaseConnector;

//# sourceMappingURL=KnexDatabaseConnector.js.map
