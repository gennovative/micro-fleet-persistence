import objection from 'objection'

import { KnexConnection } from '../connector/IDatabaseConnector'

/**
 * Wraps a database connection and transaction.
 */
export class AtomicSession {

    constructor(
        public knexConnection: KnexConnection,
        public knexTransaction: objection.Transaction
    ) {
    }
}
