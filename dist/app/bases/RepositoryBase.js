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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@micro-fleet/common");
const MonoProcessor_1 = require("./MonoProcessor");
const BatchProcessor_1 = require("./BatchProcessor");
const VersionControlledProcessor_1 = require("./VersionControlledProcessor");
let RepositoryBase = class RepositoryBase {
    constructor(EntityClass, DtoClass, dbConnector, options = {}) {
        common_1.Guard.assertArgDefined('EntityClass', EntityClass);
        common_1.Guard.assertIsTruthy(EntityClass['tableName'] && EntityClass['translator'], 'Param "EntityClass" must inherit base class "EntityBase"!');
        common_1.Guard.assertArgDefined('DtoClass', DtoClass);
        common_1.Guard.assertIsTruthy(DtoClass['translator'], 'Param "DtoClass" must inherit base class "DtoBase"!');
        common_1.Guard.assertArgDefined('dbConnector', dbConnector);
        let crud;
        if (options.isVersionControlled) {
            // TODO: Should let `VersionControlledProcessor` accepts `MonoProcessor` as argument.
            crud = options.versionProcessor || new VersionControlledProcessor_1.VersionControlledProcessor(EntityClass, DtoClass, dbConnector, options);
        }
        else {
            crud = options.monoProcessor || new MonoProcessor_1.MonoProcessor(EntityClass, DtoClass, dbConnector, options);
        }
        this._processor = options.batchProcessor || new BatchProcessor_1.BatchProcessor(crud, dbConnector);
    }
    /**
     * @see IRepository.countAll
     */
    countAll(opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._processor.countAll(opts);
        });
    }
    /**
     * @see IRepository.create
     */
    create(model, opts = {}) {
        return this._processor.create(model, opts);
    }
    /**
     * @see ISoftDelRepository.deleteSoft
     */
    deleteSoft(pk, opts = {}) {
        return this._processor.deleteSoft(pk, opts);
    }
    /**
     * @see IRepository.deleteHard
     */
    deleteHard(pk, opts = {}) {
        return this._processor.deleteHard(pk, opts);
    }
    /**
     * @see IRepository.exists
     */
    exists(props, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._processor.exists(props, opts);
        });
    }
    /**
     * @see IRepository.findByPk
     */
    findByPk(pk, opts = {}) {
        return this._processor.findByPk(pk, opts);
    }
    /**
     * @see IRepository.page
     */
    page(pageIndex, pageSize, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._processor.page(pageIndex, pageSize, opts);
        });
    }
    /**
     * @see IRepository.patch
     */
    patch(model, opts = {}) {
        return this._processor.patch(model, opts);
    }
    /**
     * @see ISoftDelRepository.recover
     */
    recover(pk, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._processor.recover(pk, opts);
        });
    }
    /**
     * @see IRepository.update
     */
    update(model, opts = {}) {
        return this._processor.update(model, opts);
    }
};
RepositoryBase = __decorate([
    common_1.injectable(),
    __param(0, common_1.unmanaged()), __param(1, common_1.unmanaged()),
    __param(2, common_1.unmanaged()), __param(3, common_1.unmanaged()),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], RepositoryBase);
exports.RepositoryBase = RepositoryBase;
//# sourceMappingURL=RepositoryBase.js.map