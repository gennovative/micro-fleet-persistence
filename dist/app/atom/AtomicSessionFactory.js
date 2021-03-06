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
const Types_1 = require("../Types");
const AtomicSessionFlow_1 = require("./AtomicSessionFlow");
/**
 * Provides methods to create atomic sessions.
 */
let AtomicSessionFactory = class AtomicSessionFactory {
    constructor(_dbConnector) {
        this._dbConnector = _dbConnector;
        common_1.Guard.assertArgDefined('_dbConnector', _dbConnector);
    }
    /**
     * Starts executing queries in transactions.
     */
    startSession() {
        return new AtomicSessionFlow_1.AtomicSessionFlow(this._dbConnector);
    }
};
AtomicSessionFactory = __decorate([
    common_1.decorators.injectable(),
    __param(0, common_1.decorators.inject(Types_1.Types.DB_CONNECTOR)),
    __metadata("design:paramtypes", [Object])
], AtomicSessionFactory);
exports.AtomicSessionFactory = AtomicSessionFactory;
//# sourceMappingURL=AtomicSessionFactory.js.map