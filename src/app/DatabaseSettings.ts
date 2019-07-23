import { Maybe, SettingItem, SettingItemDataType, constants } from '@micro-fleet/common'

import { DbConnectionDetail } from './interfaces'


const { DbSettingKeys: S} = constants

/**
 * Represents an array of database settings.
 * @deprecated
 */
export class DatabaseSettings
    extends Array<SettingItem> {

    /**
     * Parses from connection detail.
     * @param {DbConnectionDetail} detail Connection detail loaded from JSON data source.
     */
    public static fromConnectionDetail(detail: DbConnectionDetail): Maybe<DatabaseSettings> {
        const settings = new DatabaseSettings

        if (detail.clientName) {
            settings.push(SettingItem.translator.whole({
                name: S.DB_ENGINE,
                dataType: SettingItemDataType.String,
                value: detail.clientName,
            }) as SettingItem)
        } else {
            return Maybe.Nothing()
        }

        if (detail.filePath) {
            settings.push(SettingItem.translator.whole({
                name: S.DB_FILE,
                dataType: SettingItemDataType.String,
                value: detail.filePath,
            }) as SettingItem)
        } else if (detail.connectionString) {
            settings.push(SettingItem.translator.whole(
                {
                    name: S.DB_CONN_STRING,
                    dataType: SettingItemDataType.String,
                    value: detail.connectionString,
                }) as SettingItem)
        } else if (detail.host) {
            settings.push(SettingItem.translator.whole({
                name: S.DB_ADDRESS,
                dataType: SettingItemDataType.String,
                value: detail.host.address,
            }) as SettingItem)
            settings.push(SettingItem.translator.whole({
                name: S.DB_USER,
                dataType: SettingItemDataType.String,
                value: detail.host.user,
            }) as SettingItem)
            settings.push(SettingItem.translator.whole({
                name: S.DB_PASSWORD,
                dataType: SettingItemDataType.String,
                value: detail.host.password,
            }) as SettingItem)
            settings.push(SettingItem.translator.whole({
                name: S.DB_NAME,
                dataType: SettingItemDataType.String,
                value: detail.host.database,
            }) as SettingItem)
        } else {
            return Maybe.Nothing()
        }
        return settings.length ? Maybe.Just(settings) : Maybe.Nothing()
    }

    constructor() {
        super()
    }
}
