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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const objection_1 = require("objection");
const common_1 = require("@micro-fleet/common");
const GeneralCrudRepositoryBase_1 = require("./GeneralCrudRepositoryBase");
let PgCrudRepositoryBase = class PgCrudRepositoryBase extends GeneralCrudRepositoryBase_1.GeneralCrudRepositoryBase {
    constructor(ORMClass, DomainClass, dbConnector) {
        super(ORMClass, DomainClass, dbConnector);
    }
    /**
     * @override
     */
    $buildCountAllQuery(query, opts) {
        // Postgres returns count result as int64, so the pg driver returns string.
        // We cast it to int32 to be a valid NodeJS number
        query.select(objection_1.raw('CAST(count(*) AS INTEGER) as total'));
        opts.tenantId && query.where('tenantId', opts.tenantId);
        return query;
    }
    /**
     * @override
     */
    $buildCreateQuery(query, model, ormModel, opts) {
        return super.$buildCreateQuery(query, model, ormModel, opts)
            .returning('*');
    }
    /**
     * @override
     */
    $buildCreateManyQuery(query, models, ormModels, opts) {
        // Bulk insert only works with PostgreSQL, MySQL, and SQL Server 2008 RC2
        return super.$buildCreateManyQuery(query, models, ormModels, opts)
            .returning('*');
    }
    /**
     * @override
     */
    $buildPatchQuery(query, model, ormModel, opts) {
        return super.$buildPatchQuery(query, model, ormModel, opts)
            .returning('*');
    }
    /**
     * @override
     */
    $buildUpdateQuery(query, model, ormModel, opts) {
        return super.$buildPatchQuery(query, model, ormModel, opts)
            .returning('*');
    }
};
PgCrudRepositoryBase = __decorate([
    common_1.decorators.injectable(),
    __param(0, common_1.decorators.unmanaged()),
    __param(1, common_1.decorators.unmanaged()),
    __param(2, common_1.decorators.unmanaged()),
    __metadata("design:paramtypes", [Object, Object, Object])
], PgCrudRepositoryBase);
exports.PgCrudRepositoryBase = PgCrudRepositoryBase;
//# sourceMappingURL=PgCrudRepositoryBase.js.map