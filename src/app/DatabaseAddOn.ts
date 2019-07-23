import { IConfigurationProvider, Types as ConT, constants,
    injectable, CriticalException, Maybe, inject, Guard, IServiceAddOn } from '@micro-fleet/common'

import { IDatabaseConnector } from './connector/IDatabaseConnector'
import { DbConnectionDetail } from './interfaces'
import { Types as T } from './Types'
import { DbClient } from '@micro-fleet/common/dist/app/constants/DbClient'

const { DbSettingKeys: S } = constants

/**
 * Initializes database connections.
 */
@injectable()
export class DatabaseAddOn implements IServiceAddOn {

    public readonly name: string = 'DatabaseAddOn'

    constructor(
        @inject(ConT.CONFIG_PROVIDER) private _config: IConfigurationProvider,
        @inject(T.DB_CONNECTOR) private _dbConnector: IDatabaseConnector,
    ) {
        Guard.assertArgDefined('Configuration provider', _config)
        Guard.assertArgDefined('Database connector', _dbConnector)
    }

    /**
     * @see IServiceAddOn.init
     */
    public init(): Promise<void> {
        this._prepareConnection()
        return Promise.resolve()
    }

    /**
     * @see IServiceAddOn.deadLetter
     */
    public deadLetter(): Promise<void> {
        return Promise.resolve()
    }

    /**
     * @see IServiceAddOn.dispose
     */
    public async dispose(): Promise<void> {
        await this._dbConnector.dispose()
        this._dbConnector = null
        this._config = null
    }


    private _prepareConnection(): void {
        const connDetail = this._buildConnDetails()
        if (connDetail.isNothing) {
            throw new CriticalException('No database settings!')
        }
        this._dbConnector.init(connDetail.value)

    }

    private _buildConnDetails(): Maybe<DbConnectionDetail> {
        const provider = this._config

        return (provider.get(S.DB_ENGINE) as Maybe<DbClient>)
            .chain(clientName => {
                const cnnDetail: DbConnectionDetail = {
                    clientName,
                }
                let setting: Maybe<string>

                // 1st priority: connect to a local file.
                setting = (provider.get(S.DB_FILE) as Maybe<string>)
                    .map(value => cnnDetail.filePath = value)
                if (setting.isJust) {
                    return Maybe.Just(cnnDetail)
                }

                // 2nd priority: connect with a connection string.
                setting = (provider.get(S.DB_CONN_STRING) as Maybe<string>)
                    .map(value => cnnDetail.connectionString = value)
                if (setting.isJust) {
                    return Maybe.Just(cnnDetail)
                }

                // Last priority: connect with host credentials.
                setting = provider.get(S.DB_ADDRESS) as Maybe<string>
                if (setting.isJust) {
                    cnnDetail.host = {
                        address: provider.get(S.DB_ADDRESS).value as string,
                        user: provider.get(S.DB_USER).value as string,
                        password: provider.get(S.DB_PASSWORD).value as string,
                        database: provider.get(S.DB_NAME).value as string,
                    }
                    return Maybe.Just(cnnDetail)
                }
                return Maybe.Nothing()
            })
    }
}
