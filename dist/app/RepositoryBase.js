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
const back_lib_common_util_1 = require("back-lib-common-util");
class PagedArray extends Array {
    constructor(_total, source) {
        super();
        this._total = _total;
        Array.prototype.push.apply(this, source);
    }
    /**
     * Gets total number of items in database.
     */
    get total() {
        return this._total;
    }
}
exports.PagedArray = PagedArray;
let RepositoryBase = class RepositoryBase {
    constructor(_modelMapper, _dbConnector) {
        this._modelMapper = _modelMapper;
        this._dbConnector = _dbConnector;
        back_lib_common_util_1.Guard.assertDefined('modelMapper', this._modelMapper);
        this.createModelMap();
    }
    countAll() {
        return __awaiter(this, void 0, void 0, function* () {
            let promises = this.query(query => {
                return query.count('id as total');
            }, '0'), // Only fetch data from primary connection. By convention, the firstly added connection is the primary.
            result = yield this.first(promises);
            // In case with Postgres, `count` returns a bigint type which will be a String 
            // and not a Number.
            /* istanbul ignore next */
            return (result && result.length ? +(result[0]['total']) : 0);
        });
    }
    create(model) {
        return __awaiter(this, void 0, void 0, function* () {
            let promises = this.query(query => {
                return query.insert(model);
            }), newEnt = yield this.first(promises);
            return this.toDTO(newEnt);
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let promises = this.query(query => {
                return query.deleteById(id);
            }), affectedRows = yield this.first(promises);
            return affectedRows;
        });
    }
    find(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let promises = this.query(query => {
                return query.findById(id);
            }, '0'), foundEnt = yield this.first(promises);
            return this.toDTO(foundEnt);
        });
    }
    patch(model) {
        return __awaiter(this, void 0, void 0, function* () {
            back_lib_common_util_1.Guard.assertDefined('entity.id', model.id);
            let promises = this.query(query => {
                return query.where('id', model.id).patch(model);
            }), affectedRows = yield this.first(promises);
            return affectedRows;
        });
    }
    page(pageIndex, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            let foundList, dtoList, affectedRows;
            let promises = this.query(query => {
                return query.page(pageIndex, pageSize);
            }, '0');
            foundList = yield this.first(promises);
            if (!foundList || !foundList.results || !foundList.results.length) {
                return null;
            }
            dtoList = this.toDTO(foundList.results);
            return new PagedArray(foundList.total, dtoList);
        });
    }
    update(model) {
        return __awaiter(this, void 0, void 0, function* () {
            back_lib_common_util_1.Guard.assertDefined('entity.id', model.id);
            let promises = this.query(query => {
                return query.where('id', model.id).update(model);
            }), affectedRows = yield this.first(promises);
            return affectedRows;
        });
    }
    /**
     * Waits for query execution on first connection which is primary,
     * do not care about the others, which is for backup.
     * TODO: Consider putting database access layer in a separate microservice.
     */
    first(promises) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield promises[0];
        });
    }
};
RepositoryBase = __decorate([
    back_lib_common_util_1.injectable(),
    __metadata("design:paramtypes", [Object, Object])
], RepositoryBase);
exports.RepositoryBase = RepositoryBase;

//# sourceMappingURL=RepositoryBase.js.map
