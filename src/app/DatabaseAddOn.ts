import { DbSettingKeys as S } from 'back-lib-common-constants';
import { IConfigurationProvider, IConnectionDetail, Types as ConT } from 'back-lib-common-contracts';
import { injectable, inject, Guard, CriticalException } from 'back-lib-common-util';

import { IDatabaseConnector } from './connector/IDatabaseConnector';
import { Types as T } from './Types';


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
		this.addConnections();
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


	private addConnections(): void {
		let nConn = <number>this._configProvider.get(S.DB_NUM_CONN),
			connDetail;

		for (let i = 0; i < nConn; ++i) {
			connDetail = this.buildConnDetails(i);
			if (!connDetail) { continue; }
			this._dbConnector.addConnection(connDetail);
		}

		if (!this._dbConnector.connections.length) {
		throw new CriticalException('No database settings!');
		}
	}

	private buildConnDetails(connIdx: number): IConnectionDetail {
		let provider = this._configProvider,
			cnnDetail: IConnectionDetail = {
				clientName: provider.get(S.DB_ENGINE + connIdx) // Must belong to `DbClient`
			},
			value: string;

		// 1st priority: connect to a local file.
		value = provider.get(S.DB_FILE + connIdx);
		if (value) {
			cnnDetail.filePath = value;
			return cnnDetail;
		}

		// 2nd priority: connect with a connection string.
		value = provider.get(S.DB_CONN_STRING + connIdx);
		if (value) {
			cnnDetail.connectionString = value;
			return cnnDetail;
		}

		// Last priority: connect with host credentials.
		value = provider.get(S.DB_HOST + connIdx);
		if (value) {
			cnnDetail.host = {
				address: provider.get(S.DB_HOST + connIdx),
				user: provider.get(S.DB_USER + connIdx),
				password: provider.get(S.DB_PASSWORD + connIdx),
				database: provider.get(S.DB_NAME + connIdx),
			};
			return cnnDetail;
		}
		return null;
	}
}