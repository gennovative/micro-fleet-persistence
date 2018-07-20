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
const common_1 = require("@micro-fleet/common");
const RepositoryBase_1 = require("./RepositoryBase");
let SoftDelRepositoryBase = class SoftDelRepositoryBase extends RepositoryBase_1.RepositoryBase {
    constructor(EntityClass, DtoClass, dbConnector, options = {}) {
        super(EntityClass, DtoClass, dbConnector, options);
    }
    /**
     * @see IRepository.countAll
     */
    async countAll(opts = {}) {
        opts = Object.assign({
            excludeDeleted: true
        }, opts);
        return this._processor.countAll(opts);
    }
    /**
     * @see ISoftDelRepository.deleteSoft
     */
    deleteSoft(pk, opts = {}) {
        return this._processor.deleteSoft(pk, opts);
    }
    /**
     * @see IRepository.exists
     */
    async exists(props, opts = {}) {
        opts = Object.assign({
            excludeDeleted: true
        }, opts);
        return this._processor.exists(props, opts);
    }
    /**
     * @see IRepository.page
     */
    async page(pageIndex, pageSize, opts = {}) {
        opts = Object.assign({
            excludeDeleted: true
        }, opts);
        return this._processor.page(pageIndex, pageSize, opts);
    }
    /**
     * @see ISoftDelRepository.recover
     */
    async recover(pk, opts = {}) {
        return this._processor.recover(pk, opts);
    }
};
SoftDelRepositoryBase = __decorate([
    common_1.injectable(),
    __param(0, common_1.unmanaged()), __param(1, common_1.unmanaged()),
    __param(2, common_1.unmanaged()), __param(3, common_1.unmanaged()),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], SoftDelRepositoryBase);
exports.SoftDelRepositoryBase = SoftDelRepositoryBase;
//# sourceMappingURL=SoftDelRepositoryBase.js.map