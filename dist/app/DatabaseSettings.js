"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@micro-fleet/common");
const { Database: S } = common_1.constants;
/**
 * Represents an array of database settings.
 * @deprecated
 */
class DatabaseSettings extends Array {
    /**
     * Parses from connection detail.
     * @param {DbConnectionDetail} detail Connection detail loaded from JSON data source.
     */
    static fromConnectionDetail(detail) {
        const settings = new DatabaseSettings;
        if (detail.clientName) {
            settings.push(common_1.SettingItem.from({
                name: S.DB_ENGINE,
                dataType: common_1.SettingItemDataType.String,
                value: detail.clientName,
            }));
        }
        else {
            return common_1.Maybe.Nothing();
        }
        if (detail.filePath) {
            settings.push(common_1.SettingItem.from({
                name: S.DB_FILE,
                dataType: common_1.SettingItemDataType.String,
                value: detail.filePath,
            }));
        }
        else if (detail.connectionString) {
            settings.push(common_1.SettingItem.from({
                name: S.DB_CONN_STRING,
                dataType: common_1.SettingItemDataType.String,
                value: detail.connectionString,
            }));
        }
        else if (detail.host) {
            settings.push(common_1.SettingItem.from({
                name: S.DB_HOST,
                dataType: common_1.SettingItemDataType.String,
                value: detail.host.address,
            }));
            settings.push(common_1.SettingItem.from({
                name: S.DB_USER,
                dataType: common_1.SettingItemDataType.String,
                value: detail.host.user,
            }));
            settings.push(common_1.SettingItem.from({
                name: S.DB_PASSWORD,
                dataType: common_1.SettingItemDataType.String,
                value: detail.host.password,
            }));
            settings.push(common_1.SettingItem.from({
                name: S.DB_NAME,
                dataType: common_1.SettingItemDataType.String,
                value: detail.host.database,
            }));
        }
        else {
            return common_1.Maybe.Nothing();
        }
        return settings.length ? common_1.Maybe.Just(settings) : common_1.Maybe.Nothing();
    }
    constructor() {
        super();
    }
}
exports.DatabaseSettings = DatabaseSettings;
//# sourceMappingURL=DatabaseSettings.js.map