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
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@micro-fleet/common");
const Types_1 = require("./Types");
const { DbSettingKeys: S } = common_1.constants;
/**
 * Initializes database connections.
 */
let DatabaseAddOn = class DatabaseAddOn {
    constructor() {
        this.name = 'DatabaseAddOn';
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
        this._configProvider = null;
    }
    _prepareConnection() {
        const connDetail = this._buildConnDetails();
        if (!connDetail.hasValue) {
            throw new common_1.CriticalException('No database settings!');
        }
        this._dbConnector.init(connDetail.value);
    }
    _buildConnDetails() {
        const provider = this._configProvider;
        const clientName = provider.get(S.DB_ENGINE); // Must belong to `DbClient`
        if (!clientName.hasValue) {
            return new common_1.Maybe;
        }
        const cnnDetail = {
            clientName: clientName.value
        };
        let setting;
        // 1st priority: connect to a local file.
        setting = provider.get(S.DB_FILE);
        if (setting.hasValue) {
            cnnDetail.filePath = setting.value;
            return new common_1.Maybe(cnnDetail);
        }
        // 2nd priority: connect with a connection string.
        setting = provider.get(S.DB_CONN_STRING);
        if (setting.hasValue) {
            cnnDetail.connectionString = setting.value;
            return new common_1.Maybe(cnnDetail);
        }
        // Last priority: connect with host credentials.
        setting = provider.get(S.DB_ADDRESS);
        if (setting.hasValue) {
            cnnDetail.host = {
                address: provider.get(S.DB_ADDRESS).value,
                user: provider.get(S.DB_USER).value,
                password: provider.get(S.DB_PASSWORD).value,
                database: provider.get(S.DB_NAME).value,
            };
            return new common_1.Maybe(cnnDetail);
        }
        return new common_1.Maybe;
    }
};
__decorate([
    common_1.lazyInject(common_1.Types.CONFIG_PROVIDER),
    __metadata("design:type", Object)
], DatabaseAddOn.prototype, "_configProvider", void 0);
__decorate([
    common_1.lazyInject(Types_1.Types.DB_CONNECTOR),
    __metadata("design:type", Object)
], DatabaseAddOn.prototype, "_dbConnector", void 0);
DatabaseAddOn = __decorate([
    common_1.injectable(),
    __metadata("design:paramtypes", [])
], DatabaseAddOn);
exports.DatabaseAddOn = DatabaseAddOn;
//# sourceMappingURL=DatabaseAddOn.js.map