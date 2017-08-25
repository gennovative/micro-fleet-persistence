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
const back_lib_common_contracts_1 = require("back-lib-common-contracts");
const AtomicSessionFactory_1 = require("../atom/AtomicSessionFactory");
let RepositoryBase = class RepositoryBase {
    constructor(_dbConnector) {
        this._dbConnector = _dbConnector;
        back_lib_common_util_1.Guard.assertArgDefined('_dbConnector', _dbConnector);
        this.isSoftDeletable = true;
        this.isAuditable = true;
        this._atomFac = new AtomicSessionFactory_1.AtomicSessionFactory(_dbConnector);
        this._useCompositePk = this.idProp.length > 1;
    }
    get useCompositePk() {
        return this._useCompositePk;
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
                let q = query.count('id as total');
                return (this.useCompositePk) ? q.where('tenant_id', opts.tenantId) : q;
            }, opts.atomicSession);
            // In case with Postgres, `count` returns a bigint type which will be a String 
            // and not a Number.
            /* istanbul ignore next */
            return (isEmpty(result) ? 0 : +(result[0]['total']));
        });
    }
    /**
     * @see IRepository.create
     */
    create(model, opts = {}) {
        if (Array.isArray(model)) {
            return this.execBatch(model, this.create, opts);
        }
        let entity = this.toEntity(model, false), now = this.utcNow;
        /* istanbul ignore else */
        if (this.isAuditable) {
            model['createdAt'] = model['updatedAt'] = now.toDate();
            entity['createdAt'] = entity['updatedAt'] = now.format();
        }
        return this.executeCommand(query => query.insert(entity), opts.atomicSession)
            .then(() => model);
    }
    /**
     * @see IRepository.delete
     */
    delete(pk, opts = {}) {
        let delta, deletedAt = this.utcNow.format();
        if (this.useCompositePk) {
            delta = Object.assign(pk, { deletedAt });
        }
        else if (Array.isArray(pk)) {
            delta = pk.map(k => ({
                id: k,
                deletedAt
            }));
        }
        else {
            delta = {
                id: pk,
                deletedAt
            };
        }
        return this.patch(delta, opts)
            .then((r) => {
            // If totally failed
            if (!r) {
                return 0;
            }
            // For single item:
            if (!Array.isArray(r)) {
                return 1;
            }
            // For batch:
            // If batch succeeds entirely, expect "r" = [1, 1, 1, 1...]
            // If batch succeeds partially, expect "r" = [1, null, 1, null...]
            return r.reduce((prev, curr) => curr ? prev + 1 : prev, 0);
        });
    }
    /**
     * @see IRepository.deleteHard
     */
    deleteHard(pk, opts = {}) {
        if (Array.isArray(pk)) {
            return this.execBatch(pk, this.deleteHard, opts)
                .then((r) => {
                // If batch succeeds entirely, expect "r" = [1, 1, 1, 1...]
                // If batch succeeds partially, expect "r" = [1, null, 1, null...]
                return r.reduce((prev, curr) => curr ? prev + 1 : prev, 0);
            });
        }
        return this.executeCommand(query => {
            let q = query.deleteById(this.toArr(pk));
            console.log(`HARD DELETE (${pk}):`, q.toSql());
            return q;
        }, opts.atomicSession);
    }
    /**
     * @see IRepository.findByPk
     */
    findByPk(pk, opts = {}) {
        return this.executeQuery(query => {
            let q = query.findById(this.toArr(pk));
            console.log(`findByPk (${pk}):`, q.toSql());
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
                let q = query.page(pageIndex, pageSize);
                return (this.useCompositePk) ? q.where('tenant_id', opts.tenantId) : q;
            }, opts.atomicSession);
            if (!foundList || isEmpty(foundList.results)) {
                return null;
            }
            dtoList = this.toDTO(foundList.results, false);
            return new back_lib_common_contracts_1.PagedArray(foundList.total, ...dtoList);
        });
    }
    /**
     * @see IRepository.patch
     */
    patch(model, opts = {}) {
        if (Array.isArray(model)) {
            return this.execBatch(model, this.patch, opts);
        }
        let entity = this.toEntity(model, true), affectedRows;
        /* istanbul ignore else */
        if (this.isAuditable) {
            let modelAlias = model, now = this.utcNow;
            modelAlias['updatedAt'] = now.toDate();
            entity['createdAt'] = now.format();
        }
        return this.executeCommand(query => {
            let q = query.patch(entity);
            console.log('PATCH: (%s)', model, q.toSql());
            return (this.useCompositePk)
                ? q.whereComposite(this.idCol, '=', this.toArr(entity))
                : q.where('id', entity.id);
        }, opts.atomicSession)
            .then(count => count ? model : null);
    }
    /**
     * @see IRepository.update
     */
    update(model, opts = {}) {
        if (Array.isArray(model)) {
            return this.execBatch(model, this.update, opts);
        }
        let entity = this.toEntity(model, false), affectedRows;
        /* istanbul ignore else */
        if (this.isAuditable) {
            let now = this.utcNow;
            model['updatedAt'] = now.toDate();
            entity['updatedAt'] = now.format();
        }
        return this.executeCommand(query => {
            let q = query.update(entity);
            console.log(`UPDATE: (${model})`, q.toSql());
            return (this.useCompositePk)
                ? q.whereComposite(this.idCol, '=', this.toArr(entity))
                : q.where('id', entity.id);
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
        exception = new back_lib_common_util_1.MinorException('Not successful on all connections');
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
     * Execute batch operation in transaction.
     */
    execBatch(inputs, func, opts) {
        // Utilize the provided transaction
        if (opts.atomicSession) {
            return Promise.all(inputs.map(ip => func.call(this, ip, { atomicSession: opts.atomicSession })));
        }
        let flow = this._atomFac.startSession();
        flow.pipe(s => Promise.all(inputs.map(ip => func.call(this, ip, { atomicSession: s }))));
        return flow.closePipe();
    }
    toArr(pk) {
        // if pk is BigSInt
        if (typeof pk === 'string') {
            return [pk];
        }
        return this.idProp.map(c => pk[c]);
    }
};
RepositoryBase = __decorate([
    back_lib_common_util_1.injectable(),
    __metadata("design:paramtypes", [Object])
], RepositoryBase);
exports.RepositoryBase = RepositoryBase;

//# sourceMappingURL=RepositoryBase.js.map
