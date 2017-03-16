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
const back_lib_common_util_1 = require("back-lib-common-util");
/**
 * Provides settings from package
 */
let KnexDatabaseConnector = class KnexDatabaseConnector {
    constructor() {
        this._connections = [];
        this._knex = knex;
    }
    addConnection(detail, name) {
        back_lib_common_util_1.Guard.assertDefined('detail', detail);
        let settings = {
            client: detail.clientName,
            useNullAsDefault: true,
            connection: this.buildConnSettings(detail)
        }, knexConn = this._knex(settings);
        knexConn['customName'] = name ? name : (this._connections.length + '');
        this._connections.push(knexConn);
    }
    dispose() {
        let destroyPromises = this._connections.map(conn => {
            return conn['destroy']();
        });
        this._knex = null;
        this._connections = null;
        return destroyPromises;
    }
    query(EntityClass, callback, ...names) {
        return this._connections.map(conn => {
            let BoundClass;
            // If connection names is specified, we only execute queries on those connections.
            if (names && names.length) {
                if (names.findIndex(name => name == conn['customName']) >= 0) {
                    BoundClass = EntityClass['bindKnex'](conn);
                    return callback(BoundClass['query'](), BoundClass);
                }
                return null;
            }
            BoundClass = EntityClass['bindKnex'](conn);
            return callback(BoundClass['query'](), BoundClass);
        });
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
        throw 'No database settings!';
    }
};
KnexDatabaseConnector = __decorate([
    back_lib_common_util_1.injectable(),
    __metadata("design:paramtypes", [])
], KnexDatabaseConnector);
exports.KnexDatabaseConnector = KnexDatabaseConnector;

//# sourceMappingURL=KnexDatabaseConnector.js.map
