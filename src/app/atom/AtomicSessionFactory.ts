import { Guard, decorators as d } from '@micro-fleet/common'

import { Types } from '../Types'
import { IDatabaseConnector } from '../connector/IDatabaseConnector'
import { AtomicSessionFlow } from './AtomicSessionFlow'


/**
 * Provides methods to create atomic sessions.
 */
@d.injectable()
export class AtomicSessionFactory {

    constructor(
        @d.inject(Types.DB_CONNECTOR) protected _dbConnector: IDatabaseConnector
    ) {
        Guard.assertArgDefined('_dbConnector', _dbConnector)
    }

    /**
     * Starts executing queries in transactions.
     * @param {string[]} names Only executes the queries on connections with specified names.
     */
    public startSession(): AtomicSessionFlow {
        return new AtomicSessionFlow(this._dbConnector)
    }
}
