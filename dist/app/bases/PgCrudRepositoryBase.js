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
/// <reference types="debug" />
const debug = require('debug')('mcft:persistence:PgRepoBase');
const objection_1 = require("objection");
const pick = require("lodash/pick");
const common_1 = require("@micro-fleet/common");
const it = require("../interfaces");
let PgCrudRepositoryBase = class PgCrudRepositoryBase {
    constructor(_EntityClass, _DomainClass, _dbConnector) {
        this._EntityClass = _EntityClass;
        this._DomainClass = _DomainClass;
        this._dbConnector = _dbConnector;
        common_1.Guard.assertArgDefined('EntityClass', _EntityClass);
        common_1.Guard.assertIsTruthy(_EntityClass['tableName'] && _EntityClass['translator'], 'Param "EntityClass" must have tableName and a translator. It had better inherit "EntityBase"!');
        common_1.Guard.assertArgDefined('DomainClass', _DomainClass);
        common_1.Guard.assertIsTruthy(_DomainClass['translator'], 'Param "DomainClass" must have a translator!');
        common_1.Guard.assertArgDefined('dbConnector', _dbConnector);
        this._pkProps = this._EntityClass['idProp'];
    }
    /**
     * @see IRepository.countAll
     */
    async countAll(opts = {}) {
        const result = await this.executeQuery(query => {
            const q = this._buildCountAllQuery(query, opts);
            debug('COUNT ALL: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        return (result[0]['total']);
    }
    _buildCountAllQuery(query, opts) {
        // Postgres returns count result as int64, so the pg driver returns string.
        // We cast it to int32 to be a valid NodeJS number
        query.select(objection_1.raw('CAST(count(*) AS INTEGER) as total'));
        opts.tenantId && query.where('tenantId', opts.tenantId);
        return query;
    }
    /**
     * @see IRepository.create
     */
    create(model, opts = {}) {
        const entity = this.toEntity(model, false);
        return this.executeQuery(query => {
            const q = this._buildCreateQuery(query, model, entity, opts);
            debug('CREATE: %s', q.toSql());
            return q;
        }, opts.atomicSession)
            .then((refetch) => this.toDomainModel(refetch, false));
    }
    _buildCreateQuery(query, model, entity, opts) {
        return query.insert(entity).returning('*');
    }
    /**
     * @see IRepository.deleteSingle
     */
    deleteSingle(pk, opts = {}) {
        return this.executeQuery(query => {
            const q = this._buildDeleteSingleQuery(query, pk, opts);
            debug('DELETE SINGLE: %s', q.toSql());
            return q;
        }, opts.atomicSession);
    }
    _buildDeleteSingleQuery(query, pk, opts) {
        return query.deleteById(pk.toArray());
    }
    /**
     * @see IRepository.deleteMany
     */
    deleteMany(pkList, opts = {}) {
        return this.executeQuery(query => {
            const q = this._buildDeleteManyQuery(query, pkList, opts);
            debug('DELETE MANY: %s', q.toSql());
            return q;
        }, opts.atomicSession);
    }
    _buildDeleteManyQuery(query, pkList, opts) {
        const q = query.delete()
            .whereInComposite(this._EntityClass['idColumn'], pkList.map(pk => pk.toArray()));
        return q;
    }
    /**
     * @see IRepository.exists
     */
    async exists(uniqPartial, opts = {}) {
        const result = await this.executeQuery(query => {
            const q = this._buildExistsQuery(query, uniqPartial, opts);
            debug('EXIST: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        return result[0]['total'] != 0;
    }
    _buildExistsQuery(query, uniqPartial, opts) {
        query
            .count(`* as total`)
            .andWhere(builder => {
            // tslint:disable-next-line: prefer-const
            for (let [key, val] of Object.entries(uniqPartial)) {
                if (val === null) {
                    builder.orWhereNull(key);
                }
                else if (val !== undefined) {
                    builder.orWhere(key, '=', val);
                }
            }
        });
        opts.tenantId && query.where('tenantId', opts.tenantId);
        return query;
    }
    /**
     * @see IRepository.findByPk
     */
    findByPk(pk, opts = {}) {
        return this.executeQuery(query => {
            const q = this._buildFindByPkQuery(query, pk, opts);
            debug('FIND BY (%o): %s', pk, q.toSql());
            return q;
        }, opts.atomicSession)
            .then(foundEnt => {
            return foundEnt
                ? common_1.Maybe.Just(this.toDomainModel(foundEnt, false))
                : common_1.Maybe.Nothing();
        });
    }
    _buildFindByPkQuery(query, pk, opts) {
        const q = query.findById(pk.toArray());
        opts.relations && q.eager(opts.relations);
        opts.fields && q.select(opts.fields);
        return q;
    }
    /**
     * @see IRepository.page
     */
    async page(opts) {
        const foundList = await this.executeQuery(query => {
            const q = this._buildPageQuery(query, opts);
            debug('PAGE: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        if (!foundList) {
            return new common_1.PagedArray();
        }
        const dtoList = this.toDomainModelMany(foundList.results, false);
        return new common_1.PagedArray(foundList.total, ...dtoList);
    }
    _buildPageQuery(query, opts) {
        const pageIndex = Math.max(0, opts.pageIndex - 1);
        const q = query
            .page(pageIndex, opts.pageSize);
        opts.tenantId && q.where('tenantId', opts.tenantId);
        opts.relations && q.eager(opts.relations);
        opts.fields && q.select(opts.fields);
        opts.sortBy && q.orderBy(opts.sortBy, opts.sortType || it.SortType.ASC);
        return q;
    }
    /**
     * @see IRepository.patch
     */
    async patch(model, opts = {}) {
        const entity = this.toEntity(model, true);
        const refetchedEntities = await this.executeQuery(query => {
            const q = this._buildPatchQuery(query, model, entity, opts);
            debug('PATCH: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        return (refetchedEntities.length > 0)
            ? common_1.Maybe.Just(this.toDomainModel(refetchedEntities[0], false))
            : common_1.Maybe.Nothing();
    }
    _buildPatchQuery(query, model, entity, opts) {
        const pkCondition = pick(entity, this._pkProps);
        const q = query.patch(entity).where(pkCondition).returning('*');
        return q;
    }
    /**
     * @see IRepository.update
     */
    async update(model, opts = {}) {
        const entity = this.toEntity(model, false);
        const refetchedEntities = await this.executeQuery(query => {
            const q = this._buildUpdateQuery(query, model, entity, opts);
            debug('UPDATE: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        return (refetchedEntities.length > 0)
            ? common_1.Maybe.Just(this.toDomainModel(refetchedEntities[0], false))
            : common_1.Maybe.Nothing();
    }
    _buildUpdateQuery(query, model, entity, opts) {
        const pkCondition = pick(entity, this._pkProps);
        return query.update(entity).where(pkCondition).returning('*');
    }
    executeQuery(callback, atomicSession) {
        return this._dbConnector.prepare(this._EntityClass, callback, atomicSession);
    }
    /**
     * Translates from a DTO model to an entity model.
     */
    toEntity(dto, isPartial) {
        if (!dto) {
            return null;
        }
        const translator = this._EntityClass['translator'];
        const entity = (isPartial)
            ? translator.partial(dto, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.whole(dto, { enableValidation: false });
        return entity;
    }
    /**
     * Translates from DTO models to entity models.
     */
    toEntityMany(domainModel, isPartial) {
        if (!domainModel) {
            return null;
        }
        const translator = this._EntityClass['translator'];
        const entity = (isPartial)
            ? translator.partialMany(domainModel, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.wholeMany(domainModel, { enableValidation: false });
        return entity;
    }
    /**
     * Translates from an entity model to a domain model.
     */
    toDomainModel(entity, isPartial) {
        if (!entity) {
            return null;
        }
        const translator = this._DomainClass['translator'];
        const dto = (isPartial)
            ? translator.partial(entity, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.whole(entity, { enableValidation: false });
        return dto;
    }
    /**
     * Translates from entity models to domain models.
     */
    toDomainModelMany(entity, isPartial) {
        if (!entity) {
            return null;
        }
        const translator = this._DomainClass['translator'];
        const dto = (isPartial)
            ? translator.partialMany(entity, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.wholeMany(entity, { enableValidation: false });
        return dto;
    }
};
PgCrudRepositoryBase = __decorate([
    common_1.injectable(),
    __param(0, common_1.unmanaged()),
    __param(1, common_1.unmanaged()),
    __param(2, common_1.unmanaged()),
    __metadata("design:paramtypes", [Object, Object, Object])
], PgCrudRepositoryBase);
exports.PgCrudRepositoryBase = PgCrudRepositoryBase;
//# sourceMappingURL=PgCrudRepositoryBase.js.map