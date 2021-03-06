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
const Types_1 = require("./Types");
const { Database: D, } = common_1.constants;
/**
 * Initializes database connections.
 */
let DatabaseAddOn = class DatabaseAddOn {
    constructor(_config, _dbConnector) {
        this._config = _config;
        this._dbConnector = _dbConnector;
        this.name = 'DatabaseAddOn';
        common_1.Guard.assertArgDefined('Configuration provider', _config);
        common_1.Guard.assertArgDefined('Database connector', _dbConnector);
        this._beforeInitConnector = () => { };
    }
    /**
     * @see IServiceAddOn.init
     */
    init() {
        this._prepareConnection();
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
    async dispose() {
        await this._dbConnector.dispose();
        this._dbConnector = null;
        this._config = null;
        this._beforeInitConnector = null;
    }
    beforeInitConnector(handler) {
        this._beforeInitConnector = handler;
    }
    _prepareConnection() {
        const connDetail = this._buildConnDetails();
        if (connDetail.isNothing) {
            throw new common_1.CriticalException('No database settings!');
        }
        this._beforeInitConnector(connDetail.value);
        this._dbConnector.init(connDetail.value);
    }
    _buildConnDetails() {
        const provider = this._config;
        return provider.get(D.DB_ENGINE)
            .chain(clientName => {
            const cnnDetail = {
                clientName,
            };
            let setting;
            // 1st priority: connect to a local file.
            setting = provider.get(D.DB_FILE);
            if (setting.isJust) {
                cnnDetail.filePath = setting.value;
                return common_1.Maybe.Just(cnnDetail);
            }
            // 2nd priority: connect with a connection string.
            setting = provider.get(D.DB_CONN_STRING);
            if (setting.isJust) {
                cnnDetail.connectionString = setting.value;
                return common_1.Maybe.Just(cnnDetail);
            }
            // Last priority: connect with host credentials.
            setting = provider.get(D.DB_HOST);
            if (setting.isJust) {
                cnnDetail.host = {
                    address: provider.get(D.DB_HOST).value,
                    port: provider.get(D.DB_PORT).tryGetValue(null),
                    user: provider.get(D.DB_USER).value,
                    password: provider.get(D.DB_PASSWORD).value,
                    database: provider.get(D.DB_NAME).value,
                };
                return common_1.Maybe.Just(cnnDetail);
            }
            return common_1.Maybe.Nothing();
        })
            .map((cnnDetail) => {
            cnnDetail.pool = {};
            provider.get(D.DB_POOL_MIN)
                .map(value => cnnDetail.pool.min = value);
            provider.get(D.DB_POOL_MAX)
                .map(value => cnnDetail.pool.max = value);
            return cnnDetail;
        });
    }
};
DatabaseAddOn = __decorate([
    common_1.decorators.injectable(),
    __param(0, common_1.decorators.inject(common_1.Types.CONFIG_PROVIDER)),
    __param(1, common_1.decorators.inject(Types_1.Types.DB_CONNECTOR)),
    __metadata("design:paramtypes", [Object, Object])
], DatabaseAddOn);
exports.DatabaseAddOn = DatabaseAddOn;
//# sourceMappingURL=DatabaseAddOn.js.map