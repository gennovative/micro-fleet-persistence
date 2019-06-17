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
    /**
     * Initializes database connections.
     */
    constructor() {
        this.name = 'DatabaseAddOn';
        // private _buildConnDetails(): Maybe<DbConnectionDetail> {
        //     const provider = this._configProvider
        //     const clientName = provider.get(S.DB_ENGINE) as Maybe<DbClient> // Must belong to `DbClient`
        //     if (!clientName.isJust) {
        //         return Maybe.Nothing()
        //     }
        //     const cnnDetail: DbConnectionDetail = {
        //         clientName: clientName.value,
        //     }
        //     let setting: Maybe<string>
        //     // 1st priority: connect to a local file.
        //     setting = provider.get(S.DB_FILE) as Maybe<string>
        //     if (setting.isJust) {
        //         cnnDetail.filePath = setting.value
        //         return Maybe.Just(cnnDetail)
        //     }
        //     // 2nd priority: connect with a connection string.
        //     setting = provider.get(S.DB_CONN_STRING) as Maybe<string>
        //     if (setting.isJust) {
        //         cnnDetail.connectionString = setting.value
        //         return Maybe.Just(cnnDetail)
        //     }
        //     // Last priority: connect with host credentials.
        //     setting = provider.get(S.DB_ADDRESS) as Maybe<string>
        //     if (setting.isJust) {
        //         cnnDetail.host = {
        //             address: provider.get(S.DB_ADDRESS).value as string,
        //             user: provider.get(S.DB_USER).value as string,
        //             password: provider.get(S.DB_PASSWORD).value as string,
        //             database: provider.get(S.DB_NAME).value as string,
        //         }
        //         return Maybe.Just(cnnDetail)
        //     }
        //     return Maybe.Nothing()
        // }
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
        if (connDetail.isNothing) {
            throw new common_1.CriticalException('No database settings!');
        }
        this._dbConnector.init(connDetail.value);
    }
    _buildConnDetails() {
        const provider = this._configProvider;
        // const clientName = provider.get(S.DB_ENGINE) as Maybe<DbClient>
        // if (!clientName.isJust) {
        //     return Maybe.Nothing()
        // }
        return provider.get(S.DB_ENGINE)
            .chain(clientName => {
            const cnnDetail = {
                clientName,
            };
            let setting;
            // 1st priority: connect to a local file.
            setting = provider.get(S.DB_FILE)
                .map(value => cnnDetail.filePath = value);
            if (setting.isJust) {
                return common_1.Maybe.Just(cnnDetail);
            }
            // 2nd priority: connect with a connection string.
            setting = provider.get(S.DB_CONN_STRING)
                .map(value => cnnDetail.connectionString = value);
            if (setting.isJust) {
                return common_1.Maybe.Just(cnnDetail);
            }
            // Last priority: connect with host credentials.
            setting = provider.get(S.DB_ADDRESS);
            if (setting.isJust) {
                cnnDetail.host = {
                    address: provider.get(S.DB_ADDRESS).value,
                    user: provider.get(S.DB_USER).value,
                    password: provider.get(S.DB_PASSWORD).value,
                    database: provider.get(S.DB_NAME).value,
                };
                return common_1.Maybe.Just(cnnDetail);
            }
            return common_1.Maybe.Nothing();
        });
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
    common_1.injectable()
], DatabaseAddOn);
exports.DatabaseAddOn = DatabaseAddOn;
//# sourceMappingURL=DatabaseAddOn.js.map