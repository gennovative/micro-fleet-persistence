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
    constructor(_modelMapper, _dbConnector, _isSoftDelete = true) {
        this._modelMapper = _modelMapper;
        this._dbConnector = _dbConnector;
        this._isSoftDelete = _isSoftDelete;
        back_lib_common_util_1.Guard.assertArgDefined('_modelMapper', _modelMapper);
        this.createModelMap();
    }
    /**
     * @see IRepository.isSoftDelete
     */
    get isSoftDelete() {
        return this._isSoftDelete;
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
    countAll() {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.executeQuery(query => {
                return query.count('id as total');
            });
            // In case with Postgres, `count` returns a bigint type which will be a String 
            // and not a Number.
            /* istanbul ignore next */
            return (isEmpty(result) ? 0 : +(result[0]['total']));
        });
    }
    /**
     * @see IRepository.create
     */
    create(model) {
        return __awaiter(this, void 0, void 0, function* () {
            let entity = this.toEntity(model), newEnt = yield this.executeCommand(query => {
                return query.insert(entity);
            });
            return this.toDTO(newEnt);
        });
    }
    /**
     * @see IRepository.delete
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let affectedRows;
            if (this.isSoftDelete) {
                affectedRows = yield this.patch({
                    id,
                    deletedAt: this.utcNow
                });
            }
            else {
                affectedRows = yield this.executeCommand(query => {
                    return query.deleteById(id);
                });
            }
            return affectedRows;
        });
    }
    /**
     * @see IRepository.find
     */
    find(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let foundEnt = yield this.executeQuery(query => {
                return query.findById(id);
            });
            return this.toDTO(foundEnt);
        });
    }
    /**
     * @see IRepository.page
     */
    page(pageIndex, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            let foundList, dtoList, affectedRows;
            foundList = yield this.executeQuery(query => {
                return query.page(pageIndex, pageSize);
            });
            if (!foundList || isEmpty(foundList.results)) {
                return null;
            }
            dtoList = this.toDTO(foundList.results);
            return new back_lib_common_contracts_1.PagedArray(foundList.total, dtoList);
        });
    }
    /**
     * @see IRepository.patch
     */
    patch(model) {
        return __awaiter(this, void 0, void 0, function* () {
            back_lib_common_util_1.Guard.assertArgDefined('model.id', model.id);
            let entity = this.toEntity(model), affectedRows = yield this.executeCommand(query => {
                return query.where('id', entity.id).patch(entity);
            });
            return affectedRows;
        });
    }
    /**
     * @see IRepository.update
     */
    update(model) {
        return __awaiter(this, void 0, void 0, function* () {
            back_lib_common_util_1.Guard.assertArgDefined('model.id', model.id);
            let entity = this.toEntity(model), affectedRows = yield this.executeCommand(query => {
                return query.where('id', entity.id).update(entity);
            });
            return affectedRows;
        });
    }
    /**
     * Executing an query that does something and doesn't expect return value.
     * This kind of query is executed on all added connections.
     * @return A promise that resolve to affected rows.
     * @throws {[errorMsg, affectedRows]} When not all connections have same affected rows.
     */
    executeCommand(callback, ...names) {
        let queryJobs = this.prepare(callback, ...names);
        return Promise.all(queryJobs)
            .then((affectedRows) => {
            // If there is no affected rows, or if not all connections have same affected rows.
            /* istanbul ignore next */
            if (isEmpty(affectedRows) || !every(affectedRows, r => r == affectedRows[0])) {
                throw ['Not successful on all connections', affectedRows];
            }
            // If all connections have same affected rows, it means the execution was successful.
            return affectedRows[0];
        });
    }
    /**
     * Executing an query that has returned value.
     * This kind of query is executed on the primary (first) connection.
     */
    executeQuery(callback, name = '0') {
        let queryJobs = this.prepare(callback, name);
        // Get value from first connection
        return queryJobs[0];
    }
};
RepositoryBase = __decorate([
    back_lib_common_util_1.injectable(),
    __metadata("design:paramtypes", [Object, Object, Boolean])
], RepositoryBase);
exports.RepositoryBase = RepositoryBase;

//# sourceMappingURL=RepositoryBase.js.map
