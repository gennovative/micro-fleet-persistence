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
let RepositoryBase = class RepositoryBase {
    constructor(_dbConnector) {
        this._dbConnector = _dbConnector;
        this.isSoftDeletable = true;
        this.isAuditable = true;
    }
    /**
     * Gets current date time in UTC.
     */
    get utcNow() {
        return moment(new Date()).utc().format();
    }
    /**
     * @see IRepository.countAll
     */
    countAll(atomicSession) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.executeQuery(query => {
                return query.count('id as total');
            }, atomicSession);
            // In case with Postgres, `count` returns a bigint type which will be a String 
            // and not a Number.
            /* istanbul ignore next */
            return (isEmpty(result) ? 0 : +(result[0]['total']));
        });
    }
    /**
     * @see IRepository.create
     */
    create(model, atomicSession) {
        return __awaiter(this, void 0, void 0, function* () {
            /* istanbul ignore else */
            if (this.isAuditable) {
                model['createdAt'] = this.utcNow;
                model['updatedAt'] = this.utcNow;
            }
            let entity = this.toEntity(model, false), newEnt;
            newEnt = yield this.executeCommand(query => {
                return query.insert(entity);
            }, atomicSession);
            return this.toDTO(newEnt, false);
        });
    }
    /**
     * @see IRepository.delete
     */
    delete(id, atomicSession) {
        return __awaiter(this, void 0, void 0, function* () {
            let affectedRows;
            if (this.isSoftDeletable) {
                affectedRows = yield this.patch({
                    id,
                    deletedAt: this.utcNow
                }, atomicSession);
            }
            else {
                try {
                    console.log('before delete(%d)', id);
                    affectedRows = yield this.executeCommand(query => {
                        return query.deleteById(id).then(r => {
                            console.log('after delete (%d): ', id, r);
                            if (r == 0) {
                                debugger;
                            }
                        });
                    }, atomicSession);
                }
                catch (err) {
                    console.error('delete error: ', err);
                }
            }
            return affectedRows;
        });
    }
    /**
     * @see IRepository.find
     */
    find(id, atomicSession) {
        return __awaiter(this, void 0, void 0, function* () {
            let foundEnt = yield this.executeQuery(query => {
                return query.findById(id);
            }, atomicSession);
            return this.toDTO(foundEnt, false);
        });
    }
    /**
     * @see IRepository.page
     */
    page(pageIndex, pageSize, atomicSession) {
        return __awaiter(this, void 0, void 0, function* () {
            let foundList, dtoList, affectedRows;
            foundList = yield this.executeQuery(query => {
                return query.page(pageIndex, pageSize);
            }, atomicSession);
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
    patch(model, atomicSession) {
        return __awaiter(this, void 0, void 0, function* () {
            back_lib_common_util_1.Guard.assertArgDefined('model.id', model.id);
            /* istanbul ignore else */
            if (this.isAuditable) {
                let modelAlias = model;
                modelAlias['updatedAt'] = this.utcNow;
            }
            let entity = this.toEntity(model, true), affectedRows;
            affectedRows = yield this.executeCommand(query => {
                return query.where('id', entity.id).patch(entity);
            }, atomicSession);
            return affectedRows;
        });
    }
    /**
     * @see IRepository.update
     */
    update(model, atomicSession) {
        return __awaiter(this, void 0, void 0, function* () {
            back_lib_common_util_1.Guard.assertArgDefined('model.id', model.id);
            /* istanbul ignore else */
            if (this.isAuditable) {
                model['updatedAt'] = this.utcNow;
            }
            let entity = this.toEntity(model, false), affectedRows;
            affectedRows = yield this.executeCommand(query => {
                return query.where('id', entity.id).update(entity);
            }, atomicSession);
            return affectedRows;
        });
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
};
RepositoryBase = __decorate([
    back_lib_common_util_1.injectable(),
    __metadata("design:paramtypes", [Object])
], RepositoryBase);
exports.RepositoryBase = RepositoryBase;

//# sourceMappingURL=RepositoryBase.js.map
