"use strict";
/// <reference types="debug" />
Object.defineProperty(exports, "__esModule", { value: true });
const debug = require('debug')('MonoProcessor');
const isEmpty = require("lodash/isEmpty");
const moment = require("moment");
const common_1 = require("@micro-fleet/common");
const MonoQueryBuilder_1 = require("./MonoQueryBuilder");
const TenantQueryBuilder_1 = require("./TenantQueryBuilder");
class MonoProcessor {
    constructor(_EntityClass, _DtoClass, _dbConnector, _options = {}) {
        this._EntityClass = _EntityClass;
        this._DtoClass = _DtoClass;
        this._dbConnector = _dbConnector;
        this._options = _options;
        this._queryBuilders = [new MonoQueryBuilder_1.MonoQueryBuilder(_EntityClass)];
        if (_options.isMultiTenancy) {
            this._queryBuilders.push(new TenantQueryBuilder_1.TenantQueryBuilder(_EntityClass));
        }
    }
    /**
     * Gets array of non-primary unique property(ies).
     */
    get ukCol() {
        return this._EntityClass['uniqColumn'];
    }
    /**
     * Gets current date time in UTC.
     */
    get utcNow() {
        return moment(new Date()).utc();
    }
    /**
     * @see IRepository.countAll
     */
    async countAll(opts = {}) {
        const result = await this.executeQuery((query) => {
            const q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildCountAll(prevQuery, query.clone(), opts);
            }, null);
            debug('COUNT ALL: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        // In case with Postgres, `count` returns a bigint type which will be a String 
        // and not a Number.
        return +(result[0]['total']);
    }
    /**
     * @see IRepository.create
     */
    create(model, opts = {}) {
        if (model.hasOwnProperty('createdAt')) {
            model['createdAt'] = model['updatedAt'] = this.utcNow.toDate();
        }
        const entity = this.toEntity(model, false);
        return this.executeQuery(query => query.insert(entity), opts.atomicSession)
            .then(() => model);
    }
    /**
     * @see ISoftDelRepository.deleteSoft
     */
    deleteSoft(pk, opts = {}) {
        return this._setDeleteState(pk, true, opts);
    }
    /**
     * @see IRepository.deleteHard
     */
    deleteHard(pk, opts = {}) {
        return this.executeQuery(query => {
            const q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildDeleteHard(pk, prevQuery, query.clone());
            }, null);
            debug('HARD DELETE: %s', q.toSql());
            return q;
        }, opts.atomicSession);
    }
    /**
     * @see IRepository.exists
     */
    async exists(props, opts = {}) {
        const result = await this.executeQuery(query => {
            const q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildExists(this.toArr(props, this.ukCol), prevQuery, query.clone(), opts);
            }, null);
            debug('EXIST: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        return result[0]['total'] != 0;
    }
    /**
     * @see IRepository.findByPk
     */
    findByPk(pk, opts = {}) {
        return this.executeQuery(query => {
            const q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildFind(pk, prevQuery, query.clone(), opts);
            }, null);
            debug('FIND BY (%s): %s', pk, q.toSql());
            return q;
        }, opts.atomicSession)
            .then(foundEnt => {
            return foundEnt ? this.toDTO(foundEnt, false) : null;
        });
    }
    /**
     * @see IRepository.page
     */
    async page(pageIndex, pageSize, opts = {}) {
        let foundList, dtoList;
        pageIndex = Math.max(0, pageIndex - 1);
        foundList = await this.executeQuery(query => {
            const q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildPage(pageIndex, pageSize, prevQuery, query.clone(), opts);
            }, null);
            debug('PAGE: %s', q.toSql());
            return q;
        }, opts.atomicSession);
        if (!foundList || isEmpty(foundList.results)) {
            return null;
        }
        dtoList = this.toDTO(foundList.results, false);
        return new common_1.PagedArray(foundList.total, ...dtoList);
    }
    /**
     * @see IRepository.patch
     */
    patch(model, opts = {}) {
        const entity = this.toEntity(model, true);
        // We check property in "entity" because the "model" here is partial.
        if (entity.hasOwnProperty('updatedAt')) {
            model['updatedAt'] = this.utcNow.toDate();
            entity['updatedAt'] = this.utcNow.format();
        }
        return this.executeQuery(query => {
            const q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildPatch(entity, prevQuery, query.clone(), opts);
            }, null);
            debug('PATCH (%o): %s', entity, q.toSql());
            return q;
        }, opts.atomicSession)
            // `query.patch` returns number of affected rows, but we want to return the updated model.
            .then(count => count ? model : null);
    }
    /**
     * @see ISoftDelRepository.recover
     */
    async recover(pk, opts = {}) {
        const options = this._queryBuilders.reduce((prevOpts, currBuilder) => {
            return currBuilder.buildRecoverOpts(pk, prevOpts, opts);
        }, null);
        // Fetch the recovered record
        const model = await this.findByPk(pk, options);
        // If record doesn't exist
        if (!model) {
            return 0;
        }
        // If another ACTIVE record with same unique keys exists
        options.excludeDeleted = true;
        if (await this.exists(model, options)) {
            throw new common_1.MinorException('DUPLICATE_UNIQUE_KEY');
        }
        return this._setDeleteState(pk, false, opts);
    }
    /**
     * @see IRepository.update
     */
    update(model, opts = {}) {
        if (model.hasOwnProperty('updatedAt')) {
            model['updatedAt'] = this.utcNow.toDate();
        }
        const entity = this.toEntity(model, false);
        return this.executeQuery((query) => {
            const q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildUpdate(entity, prevQuery, query.clone(), opts);
            }, null);
            debug('UPDATE (%o): %s', entity, q.toSql());
            return q;
        }, opts.atomicSession)
            // `query.update` returns number of affected rows, but we want to return the updated model.
            .then(count => count ? model : null);
    }
    /**
     * Executing an query
     */
    executeQuery(callback, atomicSession) {
        return this._prepare(callback, atomicSession);
    }
    /**
     * Translates from DTO model(s) to entity model(s).
     */
    toEntity(dto, isPartial) {
        if (!dto) {
            return null;
        }
        const translator = this._EntityClass['translator'];
        let entity;
        if (isPartial) {
            entity = translator.partial(dto);
        }
        entity = translator.whole(dto, { enableValidation: false });
        for (let prop of ['createdAt', 'updatedAt', 'deletedAt']) {
            if (dto[prop]) {
                entity[prop] = moment.utc(dto[prop]).format();
            }
        }
        return entity;
    }
    /**
     * Translates from entity model(s) to DTO model(s).
     */
    toDTO(entity, isPartial) {
        if (!entity) {
            return null;
        }
        const translator = this._DtoClass['translator'];
        let dto;
        if (isPartial) {
            dto = translator.partial(entity, { enableValidation: false });
        }
        // Disable validation because it's unnecessary.
        dto = translator.whole(entity, { enableValidation: false });
        for (let prop of ['createdAt', 'updatedAt', 'deletedAt']) {
            if (entity[prop]) {
                dto[prop] = moment.utc(entity[prop]).toDate();
            }
        }
        return dto;
    }
    /**
     * Maps from an array of columns to array of values.
     * @param pk Object to get values from
     * @param cols Array of column names
     */
    toArr(pk, cols) {
        return cols.map(c => pk[c]);
    }
    /**
     * @see IDatabaseConnector.query
     */
    _prepare(callback, atomicSession) {
        return this._dbConnector.prepare(this._EntityClass, callback, atomicSession);
    }
    _buildDeleteState(pk, isDel) {
        const deletedAt = (isDel ? this.utcNow.format() : null);
        if (this._options.isMultiTenancy) {
            return Object.assign(pk, { deletedAt });
        }
        else {
            return {
                id: pk,
                deletedAt
            };
        }
    }
    _setDeleteState(pk, isDel, opts = {}) {
        const delta = this._buildDeleteState(pk, isDel);
        return this.executeQuery(query => {
            const q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildPatch(delta, prevQuery, query.clone(), opts);
            }, null);
            debug('DEL STATE (%s): %s', isDel, q.toSql());
            return q;
        }, opts.atomicSession);
    }
}
exports.MonoProcessor = MonoProcessor;
//# sourceMappingURL=MonoProcessor.js.map