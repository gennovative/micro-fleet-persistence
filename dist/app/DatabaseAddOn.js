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
const back_lib_common_constants_1 = require("back-lib-common-constants");
const back_lib_common_contracts_1 = require("back-lib-common-contracts");
const back_lib_common_util_1 = require("back-lib-common-util");
const Types_1 = require("./Types");
/**
 * Initializes database connections.
 */
let DatabaseAddOn = class DatabaseAddOn {
    constructor(_configProvider, _dbConnector) {
        this._configProvider = _configProvider;
        this._dbConnector = _dbConnector;
        back_lib_common_util_1.Guard.assertArgDefined('_configProvider', _configProvider);
        back_lib_common_util_1.Guard.assertArgDefined('_dbConnector', _dbConnector);
    }
    /**
     * @see IServiceAddOn.init
     */
    init() {
        this.addConnections();
        return Promise.resolve();
    }
    /**
     * @see IServiceAddOn.deadLetter
     */
    deadLetter() {
        return Promise.resolve();
    }
    /**
     * @see IServiceAddOn.dispose
     */
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._dbConnector.dispose();
            this._dbConnector = null;
            this._configProvider = null;
        });
    }
    addConnections() {
        let nConn = this._configProvider.get(back_lib_common_constants_1.DbSettingKeys.DB_NUM_CONN), connDetail;
        for (let i = 0; i < nConn; ++i) {
            connDetail = this.buildConnDetails(i);
            if (!connDetail) {
                continue;
            }
            this._dbConnector.addConnection(connDetail);
        }
        if (!this._dbConnector.connections.length) {
            throw new back_lib_common_util_1.CriticalException('No database settings!');
        }
    }
    buildConnDetails(connIdx) {
        let provider = this._configProvider, cnnDetail = {
            clientName: provider.get(back_lib_common_constants_1.DbSettingKeys.DB_ENGINE + connIdx) // Must belong to `DbClient`
        }, value;
        // 1st priority: connect to a local file.
        value = provider.get(back_lib_common_constants_1.DbSettingKeys.DB_FILE + connIdx);
        if (value) {
            cnnDetail.filePath = value;
            return cnnDetail;
        }
        // 2nd priority: connect with a connection string.
        value = provider.get(back_lib_common_constants_1.DbSettingKeys.DB_CONN_STRING + connIdx);
        if (value) {
            cnnDetail.connectionString = value;
            return cnnDetail;
        }
        // Last priority: connect with host credentials.
        value = provider.get(back_lib_common_constants_1.DbSettingKeys.DB_HOST + connIdx);
        if (value) {
            cnnDetail.host = {
                address: provider.get(back_lib_common_constants_1.DbSettingKeys.DB_HOST + connIdx),
                user: provider.get(back_lib_common_constants_1.DbSettingKeys.DB_USER + connIdx),
                password: provider.get(back_lib_common_constants_1.DbSettingKeys.DB_PASSWORD + connIdx),
                database: provider.get(back_lib_common_constants_1.DbSettingKeys.DB_NAME + connIdx),
            };
            return cnnDetail;
        }
        return null;
    }
};
DatabaseAddOn = __decorate([
    back_lib_common_util_1.injectable(),
    __param(0, back_lib_common_util_1.inject(back_lib_common_contracts_1.Types.CONFIG_PROVIDER)),
    __param(1, back_lib_common_util_1.inject(Types_1.Types.DB_CONNECTOR)),
    __metadata("design:paramtypes", [Object, Object])
], DatabaseAddOn);
exports.DatabaseAddOn = DatabaseAddOn;

//# sourceMappingURL=DatabaseAddOn.js.map
