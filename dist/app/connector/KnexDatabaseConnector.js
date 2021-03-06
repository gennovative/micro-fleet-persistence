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
const objection_1 = require("objection");
const common_1 = require("@micro-fleet/common");
/**
 * Provides settings from package
 */
let KnexDatabaseConnector = class KnexDatabaseConnector {
    constructor() {
        this._knex = knex;
    }
    /**
     * @see IDatabaseConnector.connection
     */
    get connection() {
        return this._connection;
    }
    /**
     * @see IDatabaseConnector.init
     */
    init(detail) {
        common_1.Guard.assertArgDefined('detail', detail);
        const settings = {
            client: detail.clientName,
            useNullAsDefault: true,
            connection: this._buildConnSettings(detail),
            pool: detail.pool,
            ...objection_1.knexSnakeCaseMappers(),
        };
        if (detail.clientName === common_1.constants.DbClient.POSTGRESQL) {
            require('../pg-type-parsers');
        }
        this._connection = this._knex(settings);
        return this;
    }
    /**
     * @see IDatabaseConnector.dispose
     */
    async dispose() {
        await this._connection.destroy();
        this._connection = null;
        this._knex = null;
    }
    /**
     * @see IDatabaseConnector.prepare
     */
    prepare(ORMClass, callback, atomicSession) {
        common_1.Guard.assertIsNotEmpty(this._connection, 'Must call addConnection() before executing any query.');
        if (atomicSession) {
            return this._prepareTransactionalQuery(ORMClass, callback, atomicSession);
        }
        return this._prepareSimpleQuery(ORMClass, callback);
    }
    _buildConnSettings(detail) {
        // 1st priority: connect to a local file.
        if (detail.filePath) {
            return { filename: detail.filePath };
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
        throw new common_1.MinorException('No database settings!');
    }
    _prepareSimpleQuery(EntityClass, callback) {
        const BoundClass = EntityClass['bindKnex'](this._connection);
        const query = BoundClass['query']();
        return callback(query, BoundClass);
    }
    _prepareTransactionalQuery(EntityClass, callback, atomicSession) {
        const BoundClass = EntityClass['bindKnex'](atomicSession.knexConnection);
        return callback(BoundClass['query'](atomicSession.knexTransaction), BoundClass);
    }
};
KnexDatabaseConnector = __decorate([
    common_1.decorators.injectable(),
    __metadata("design:paramtypes", [])
], KnexDatabaseConnector);
exports.KnexDatabaseConnector = KnexDatabaseConnector;
//# sourceMappingURL=KnexDatabaseConnector.js.map