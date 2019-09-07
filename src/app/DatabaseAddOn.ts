import { IConfigurationProvider, Types as ConT, constants, decorators as d,
    CriticalException, Maybe, Guard, IServiceAddOn } from '@micro-fleet/common'

import { IDatabaseConnector } from './connector/IDatabaseConnector'
import { DbConnectionDetail } from './interfaces'
import { Types as T } from './Types'

const {
    Database: D,
} = constants


/**
 * Initializes database connections.
 */
@d.injectable()
export class DatabaseAddOn implements IServiceAddOn {

    public readonly name: string = 'DatabaseAddOn'

    private _beforeInitConnector: (connDetail: DbConnectionDetail) => void

    constructor(
        @d.inject(ConT.CONFIG_PROVIDER) private _config: IConfigurationProvider,
        @d.inject(T.DB_CONNECTOR) private _dbConnector: IDatabaseConnector,
    ) {
        Guard.assertArgDefined('Configuration provider', _config)
        Guard.assertArgDefined('Database connector', _dbConnector)
        this._beforeInitConnector = () => { /* Noop function */ }
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
        this._beforeInitConnector = null
    }

    public beforeInitConnector(handler: (connDetail: DbConnectionDetail) => void) {
        this._beforeInitConnector = handler
    }


    private _prepareConnection(): void {
        const connDetail = this._buildConnDetails()
        if (connDetail.isNothing) {
            throw new CriticalException('No database settings!')
        }
        this._beforeInitConnector(connDetail.value)
        this._dbConnector.init(connDetail.value)

    }

    private _buildConnDetails(): Maybe<DbConnectionDetail> {
        const provider = this._config

        return (provider.get(D.DB_ENGINE) as Maybe<any>)
            .chain(clientName => {
                const cnnDetail: DbConnectionDetail = {
                    clientName,
                }
                let setting: Maybe<string>

                // 1st priority: connect to a local file.
                setting = provider.get(D.DB_FILE)
                if (setting.isJust) {
                    cnnDetail.filePath = setting.value
                    return Maybe.Just(cnnDetail)
                }

                // 2nd priority: connect with a connection string.
                setting = provider.get(D.DB_CONN_STRING)
                if (setting.isJust) {
                    cnnDetail.connectionString = setting.value
                    return Maybe.Just(cnnDetail)
                }

                // Last priority: connect with host credentials.
                setting = provider.get(D.DB_HOST)
                if (setting.isJust) {
                    cnnDetail.host = {
                        address: provider.get(D.DB_HOST).value,
                        port: provider.get(D.DB_PORT).tryGetValue(null),
                        user: provider.get(D.DB_USER).value,
                        password: provider.get(D.DB_PASSWORD).value,
                        database: provider.get(D.DB_NAME).value,
                    }
                    return Maybe.Just(cnnDetail)
                }
                return Maybe.Nothing()
            })
            .map((cnnDetail: DbConnectionDetail) => {
                cnnDetail.pool = {}
                provider.get(D.DB_POOL_MIN)
                    .map(value => cnnDetail.pool.min = value)
                provider.get(D.DB_POOL_MAX)
                    .map(value => cnnDetail.pool.max = value)
                return cnnDetail
            })
    }
}
