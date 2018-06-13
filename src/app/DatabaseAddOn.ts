import { IConfigurationProvider, DbConnectionDetail, Types as ConT, constants,
	injectable, inject, Guard, CriticalException, Maybe } from '@micro-fleet/common';

import { IDatabaseConnector } from './connector/IDatabaseConnector';
import { Types as T } from './Types';

const { DbSettingKeys: S } = constants;

/**
 * Initializes database connections.
 */
@injectable()
export class DatabaseAddOn implements IServiceAddOn {
	
	constructor(
		@inject(ConT.CONFIG_PROVIDER) private _configProvider: IConfigurationProvider,
		@inject(T.DB_CONNECTOR) private _dbConnector: IDatabaseConnector
	) {
		Guard.assertArgDefined('_configProvider', _configProvider);
		Guard.assertArgDefined('_dbConnector', _dbConnector);
	}

	/**
	 * @see IServiceAddOn.init
	 */
	public init(): Promise<void> {
		this._prepareConnection();
		return Promise.resolve();
	}

	/**
	 * @see IServiceAddOn.deadLetter
	 */
	public deadLetter(): Promise<void> {
		return Promise.resolve();
	}

	/**
	 * @see IServiceAddOn.dispose
	 */
	public async dispose(): Promise<void> {
		await this._dbConnector.dispose();
		this._dbConnector = null;
		this._configProvider = null;
	}


	private _prepareConnection(): void {
		const connDetail = this._buildConnDetails();
		if (!connDetail.hasValue) {
			throw new CriticalException('No database settings!');
		}
		this._dbConnector.init(connDetail.value);

	}

	private _buildConnDetails(): Maybe<DbConnectionDetail> {
		let provider = this._configProvider,
			cnnDetail: DbConnectionDetail = {
				clientName: provider.get(S.DB_ENGINE).value as string // Must belong to `DbClient`
			},
			setting: Maybe<string>;

		// 1st priority: connect to a local file.
		setting = provider.get(S.DB_FILE) as Maybe<string>;
		if (setting.hasValue) {
			cnnDetail.filePath = setting.value;
			return new Maybe(cnnDetail);
		}

		// 2nd priority: connect with a connection string.
		setting = provider.get(S.DB_CONN_STRING) as Maybe<string>;
		if (setting.hasValue) {
			cnnDetail.connectionString = setting.value;
			return new Maybe(cnnDetail);
		}

		// Last priority: connect with host credentials.
		setting = provider.get(S.DB_ADDRESS) as Maybe<string>;
		if (setting.hasValue) {
			cnnDetail.host = {
				address: provider.get(S.DB_ADDRESS).value as string,
				user: provider.get(S.DB_USER).value as string,
				password: provider.get(S.DB_PASSWORD).value as string,
				database: provider.get(S.DB_NAME).value as string,
			};
			return new Maybe(cnnDetail);
		}
		return new Maybe;
	}
}