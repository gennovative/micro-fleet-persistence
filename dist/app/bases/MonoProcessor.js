"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const every = require('lodash/every');
const isEmpty = require('lodash/isEmpty');
const moment = require("moment");
const back_lib_common_util_1 = require("back-lib-common-util");
const cc = require("back-lib-common-contracts");
const MonoQueryBuilder_1 = require("./MonoQueryBuilder");
const TenantQueryBuilder_1 = require("./TenantQueryBuilder");
class MonoProcessor {
    constructor(_EntityClass, _dbConnector, _options = {}) {
        this._EntityClass = _EntityClass;
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
        return this._EntityClass.uniqColumn;
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
    countAll(opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.executeQuery(query => {
                // let q = this.buildCountAll(query, opts);
                let q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                    return currBuilder.buildCountAll(prevQuery, query.clone(), opts);
                }, null);
                console.log('COUNT ALL:', q.toSql());
                return q;
            }, opts.atomicSession);
            // In case with Postgres, `count` returns a bigint type which will be a String 
            // and not a Number.
            return +(result[0]['total']);
        });
    }
    /**
     * @see IRepository.create
     */
    create(model, opts = {}) {
        let entity = this.toEntity(model, false);
        return this.executeCommand(query => query.insert(entity), opts.atomicSession)
            .then(() => model);
    }
    /**
     * @see ISoftDelRepository.deleteSoft
     */
    deleteSoft(pk, opts = {}) {
        return this.setDeleteState(pk, true, opts);
    }
    /**
     * @see IRepository.deleteHard
     */
    deleteHard(pk, opts = {}) {
        return this.executeCommand(query => {
            // let q = this.buildDeleteHard(pk, query);
            let q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildDeleteHard(pk, prevQuery, query.clone());
            }, null);
            console.log('HARD DELETE (${pk}):', q.toSql());
            return q;
        }, opts.atomicSession);
    }
    /**
     * @see IRepository.exists
     */
    exists(props, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.executeQuery(query => {
                // let q = this.buildExists(props, query, opts);
                let q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                    return currBuilder.buildExists(this.toArr(props, this.ukCol), prevQuery, query.clone(), opts);
                }, null);
                console.log('EXIST: ', q.toSql());
                return q;
            }, opts.atomicSession);
            return result[0]['total'] != 0;
        });
    }
    /**
     * @see IRepository.findByPk
     */
    findByPk(pk, opts = {}) {
        return this.executeQuery(query => {
            // let q = this.buildFind(pk, query);
            let q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildFind(pk, prevQuery, query.clone(), opts);
            }, null);
            console.log('FIND BY (%s):', pk, q.toSql());
            return q;
        }, opts.atomicSession)
            .then(foundEnt => {
            return foundEnt ? this.toDTO(foundEnt, false) : null;
        });
    }
    /**
     * @see IRepository.page
     */
    page(pageIndex, pageSize, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let foundList, dtoList, affectedRows;
            foundList = yield this.executeQuery(query => {
                // let q = this.buildPage(pageIndex, pageSize, query, opts);
                let q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                    return currBuilder.buildPage(pageIndex, pageSize, prevQuery, query.clone(), opts);
                }, null);
                console.log('PAGE:', q.toSql());
                return q;
            }, opts.atomicSession);
            if (!foundList || isEmpty(foundList.results)) {
                return null;
            }
            dtoList = this.toDTO(foundList.results, false);
            return new cc.PagedArray(foundList.total, ...dtoList);
        });
    }
    /**
     * @see IRepository.patch
     */
    patch(model, opts = {}) {
        let entity = this.toEntity(model, true);
        return this.executeCommand(query => {
            // let q = this.buildPatch(entity, query, opts);
            let q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildPatch(entity, prevQuery, query.clone(), opts);
            }, null);
            console.log('PATCH (%s):', entity, q.toSql());
            return q;
        }, opts.atomicSession)
            .then(count => count ? model : null);
    }
    /**
     * @see ISoftDelRepository.recover
     */
    recover(pk, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            // let options = this.buildRecoverOpts(pk, opts),
            let options = this._queryBuilders.reduce((prevOpts, currBuilder) => {
                return currBuilder.buildRecoverOpts(pk, prevOpts, opts);
            }, null);
            // Fetch the recovered record
            let model = yield this.findByPk(pk, options);
            // If record doesn't exist
            if (!model) {
                return 0;
            }
            // If another ACTIVE record with same unique keys exists
            options.includeDeleted = false;
            if (yield this.exists(model, options)) {
                throw new back_lib_common_util_1.MinorException('DUPLICATE_UNIQUE_KEY');
            }
            return this.setDeleteState(pk, false, opts);
        });
    }
    /**
     * @see IRepository.update
     */
    update(model, opts = {}) {
        let entity = this.toEntity(model, false), affectedRows;
        return this.executeCommand(query => {
            // let q = this.buildUpdate(entity, query, opts);
            let q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildUpdate(entity, prevQuery, query.clone(), opts);
            }, null);
            console.log('UPDATE (%s): ', entity, q.toSql());
            return q;
        }, opts.atomicSession)
            .then(count => count ? model : null);
    }
    /**
     * Executing an query that does something and doesn't expect return value.
     * This kind of query is executed on all added connections.
     * @return A promise that resolve to affected rows.
     * @throws {[errorMsg, affectedRows]} When not all connections have same affected rows.
     */
    executeCommand(callback, atomicSession = null, ...names) {
        let queryJobs = this.prepare(callback, atomicSession, ...names), 
        // Create exception here to have full error stack
        exception = new back_lib_common_util_1.MinorException('NOT_SUCCESSFUL_ON_ALL_CONNECTIONS');
        if (atomicSession) {
            return queryJobs[0];
        }
        return Promise.all(queryJobs)
            .then((affectedRows) => {
            // If there is no affected rows, or if not all connections have same affected rows.
            /* istanbul ignore next */
            if (isEmpty(affectedRows) || !every(affectedRows, r => r == affectedRows[0])) {
                return Promise.reject(exception);
            }
            // If all connections have same affected rows, it means the execution was successful.
            return affectedRows[0];
        });
    }
    /**
     * Executing an query that has returned value.
     * This kind of query is executed on the primary (first) connection.
     */
    executeQuery(callback, atomicSession, name = '0') {
        let queryJobs = this.prepare(callback, atomicSession, name);
        // Get value from first connection
        return queryJobs[0];
    }
    /**
     * Translates from DTO model(s) to entity model(s).
     */
    toEntity(from, isPartial) {
        if (isPartial) {
            return this._EntityClass.translator.partial(from);
        }
        return this._EntityClass.translator.whole(from);
    }
    /**
     * Translates from entity model(s) to DTO model(s).
     */
    toDTO(from, isPartial) {
        if (isPartial) {
            return this._EntityClass.translator.partial(from, { enableValidation: false });
        }
        // Disable validation because it's unnecessary.
        return this._EntityClass.translator.whole(from, { enableValidation: false });
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
    prepare(callback, atomicSession, ...names) {
        return this._dbConnector.prepare(this._EntityClass, callback, atomicSession, ...names);
    }
    buildDeleteState(pk, isDel) {
        let delta, deletedAt = (isDel ? this.utcNow.format() : null);
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
    setDeleteState(pk, isDel, opts = {}) {
        let delta = this.buildDeleteState(pk, isDel);
        return this.executeCommand(query => {
            // let q = this.buildPatch(delta, query, opts);
            let q = this._queryBuilders.reduce((prevQuery, currBuilder) => {
                return currBuilder.buildPatch(delta, prevQuery, query.clone(), opts);
            }, null);
            console.log('DEL STATE (%s):', isDel, q.toSql());
            return q;
        }, opts.atomicSession);
    }
}
exports.MonoProcessor = MonoProcessor;

//# sourceMappingURL=MonoProcessor.js.map
