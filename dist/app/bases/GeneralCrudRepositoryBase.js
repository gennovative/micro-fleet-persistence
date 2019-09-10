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
const debug = require('debug')('mcft:persistence:GeneralRepoBase');
const objection_1 = require("objection");
const pick = require("lodash.pick");
const common_1 = require("@micro-fleet/common");
const it = require("../interfaces");
/**
 * A repository implementation with common CRUD operations for relational databases.
 * It does not use any specific techniques of a particular database.
 */
let GeneralCrudRepositoryBase = class GeneralCrudRepositoryBase {
    constructor($ORMClass, $DomainClass, $dbConnector) {
        this.$ORMClass = $ORMClass;
        this.$DomainClass = $DomainClass;
        this.$dbConnector = $dbConnector;
        common_1.Guard.assertArgDefined('EntityClass', $ORMClass);
        common_1.Guard.assertIsTruthy($ORMClass['tableName'], 'Param "ORMClass" must have tableName. It had better inherit "ORMModelBase"!');
        common_1.Guard.assertArgDefined('DomainClass', $DomainClass);
        common_1.Guard.assertArgDefined('dbConnector', $dbConnector);
        this.$idProps = this.$ORMClass['idProp'];
    }
    /**
     * @see IRepository.countAll
     */
    async countAll(opts = {}) {
        const result = await this.executeQuery(query => {
            const q = this.$buildCountAllQuery(query, opts);
            debug('COUNT ALL: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        return (result[0]['total']);
    }
    $buildCountAllQuery(query, opts) {
        query.select(objection_1.raw('count(*) as total'));
        opts.tenantId && query.where('tenantId', opts.tenantId);
        return query;
    }
    /**
     * @see IRepository.create
     */
    create(domainModel, opts = {}) {
        const ormModelOrModels = this.toORMModel(domainModel, false);
        return this.executeQuery(query => {
            const q = this.$buildCreateQuery(query, domainModel, ormModelOrModels, opts);
            debug('CREATE: %s', q.toSql());
            return q;
        }, opts.atomicSession)
            .then((refetch) => this.toDomainModel(refetch, false));
    }
    $buildCreateQuery(query, model, ormModel, opts) {
        return opts.refetch
            ? query.insertAndFetch(ormModel)
            : query.insert(ormModel);
    }
    /**
     * @see IRepository.createMany
     */
    createMany(domainModels, opts = {}) {
        const ormModelOrModels = this.toORMModelMany(domainModels, false);
        return this.executeQuery(query => {
            const q = this.$buildCreateManyQuery(query, domainModels, ormModelOrModels, opts);
            debug('CREATE MANY: %s', q.toSql());
            return q;
        }, opts.atomicSession)
            .then((refetch) => this.toDomainModelMany(refetch, false));
    }
    $buildCreateManyQuery(query, models, ormModels, opts) {
        // Bulk insert only works with PostgreSQL, MySQL, and SQL Server 2008 RC2
        return opts.refetch
            ? query.insertAndFetch(ormModels)
            : query.insert(ormModels);
    }
    /**
     * @see IRepository.deleteSingle
     */
    deleteSingle(id, opts = {}) {
        return this.executeQuery(query => {
            const q = this.$buildDeleteSingleQuery(query, id, opts);
            debug('DELETE SINGLE: %s', q.toSql());
            return q;
        }, opts.atomicSession);
    }
    $buildDeleteSingleQuery(query, id, opts) {
        return query.deleteById(id.toArray());
    }
    /**
     * @see IRepository.deleteMany
     */
    deleteMany(idList, opts = {}) {
        return this.executeQuery(query => {
            const q = this.$buildDeleteManyQuery(query, idList, opts);
            debug('DELETE MANY: %s', q.toSql());
            return q;
        }, opts.atomicSession);
    }
    $buildDeleteManyQuery(query, idList, opts) {
        const q = query.delete()
            .whereInComposite(this.$ORMClass['idColumn'], idList.map(id => id.toArray()));
        return q;
    }
    /**
     * @see IRepository.exists
     */
    async exists(uniqPartial, opts = {}) {
        const result = await this.executeQuery(query => {
            const q = this.$buildExistsQuery(query, uniqPartial, opts);
            debug('EXIST: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        return result[0]['total'] != 0;
    }
    $buildExistsQuery(query, uniqPartial, opts) {
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
     * @see IRepository.findById
     */
    findById(id, opts = {}) {
        return this.executeQuery(query => {
            const q = this.$buildFindByIdQuery(query, id, opts);
            debug('FIND BY (%o): %s', id, q.toSql());
            return q;
        }, opts.atomicSession)
            .then(foundORM => {
            return foundORM
                ? common_1.Maybe.Just(this.toDomainModel(foundORM, false))
                : common_1.Maybe.Nothing();
        });
    }
    $buildFindByIdQuery(query, id, opts) {
        const q = query.findById(id.toArray());
        if (opts.relations) {
            if (typeof opts.relations !== 'object') {
                throw new common_1.MinorException('`relations` only accepts object format');
            }
            q.eager(opts.relations);
        }
        opts.fields && q.select(opts.fields);
        return q;
    }
    /**
     * @see IRepository.page
     */
    async page(opts) {
        const foundList = await this.executeQuery(query => {
            const q = this.$buildPageQuery(query, opts);
            debug('PAGE: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        if (!foundList) {
            return new common_1.PagedData();
        }
        const dtoList = this.toDomainModelMany(foundList.results, false);
        return new common_1.PagedData(dtoList, foundList.total);
    }
    $buildPageQuery(query, opts) {
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
    async patch(domainModel, opts = {}) {
        const ormModel = this.toORMModel(domainModel, true);
        const refetchedEntities = await this.executeQuery(query => {
            const q = this.$buildPatchQuery(query, domainModel, ormModel, opts);
            debug('PATCH: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        return (refetchedEntities.length > 0)
            ? common_1.Maybe.Just(this.toDomainModel(refetchedEntities[0], false))
            : common_1.Maybe.Nothing();
    }
    $buildPatchQuery(query, model, ormModel, opts) {
        const idCondition = pick(ormModel, this.$idProps);
        const q = opts.refetch
            ? query.patchAndFetch(ormModel)
            : query.patch(ormModel);
        return q.where(idCondition);
    }
    /**
     * @see IRepository.update
     */
    async update(domainModel, opts = {}) {
        const ormModel = this.toORMModel(domainModel, false);
        const refetchedEntities = await this.executeQuery(query => {
            const q = this.$buildUpdateQuery(query, domainModel, ormModel, opts);
            debug('UPDATE: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        return (refetchedEntities.length > 0)
            ? common_1.Maybe.Just(this.toDomainModel(refetchedEntities[0], false))
            : common_1.Maybe.Nothing();
    }
    $buildUpdateQuery(query, model, ormModel, opts) {
        const idCondition = pick(ormModel, this.$idProps);
        const q = opts.refetch
            ? query.updateAndFetch(ormModel)
            : query.update(ormModel);
        return q.where(idCondition);
    }
    executeQuery(callback, atomicSession) {
        return this.$dbConnector.prepare(this.$ORMClass, callback, atomicSession);
    }
    /**
     * Translates from a domain model to an ORM model.
     */
    toORMModel(domainModel, isPartial) {
        if (!domainModel) {
            return null;
        }
        const translator = this.$ORMClass.getTranslator();
        const ormModel = (isPartial)
            ? translator.partial(domainModel, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.whole(domainModel, { enableValidation: false });
        return ormModel;
    }
    /**
     * Translates from domain models to ORM models.
     */
    toORMModelMany(domainModels, isPartial) {
        // ModelAutoMapper can handle both single and array of models
        // We separate into two methods for prettier typing.
        return this.toORMModel(domainModels, isPartial);
    }
    /**
     * Translates from an ORM model to a domain model.
     */
    toDomainModel(ormModel, isPartial) {
        if (!ormModel) {
            return null;
        }
        const translator = this.$DomainClass.getTranslator();
        const domainModel = (isPartial)
            ? translator.partial(ormModel, { enableValidation: false }) // Disable validation because it's unnecessary.
            : translator.whole(ormModel, { enableValidation: false });
        return domainModel;
    }
    /**
     * Translates from ORM models to domain models.
     */
    toDomainModelMany(ormModels, isPartial) {
        // ModelAutoMapper can handle both single and array of models
        // We separate into two methods for prettier typing.
        return this.toDomainModel(ormModels, isPartial);
    }
};
GeneralCrudRepositoryBase = __decorate([
    common_1.decorators.injectable(),
    __param(0, common_1.decorators.unmanaged()),
    __param(1, common_1.decorators.unmanaged()),
    __param(2, common_1.decorators.unmanaged()),
    __metadata("design:paramtypes", [Object, Object, Object])
], GeneralCrudRepositoryBase);
exports.GeneralCrudRepositoryBase = GeneralCrudRepositoryBase;
//# sourceMappingURL=GeneralCrudRepositoryBase.js.map