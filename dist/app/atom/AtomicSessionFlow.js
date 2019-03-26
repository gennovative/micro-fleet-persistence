"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objection_1 = require("objection");
const common_1 = require("@micro-fleet/common");
const AtomicSession_1 = require("./AtomicSession");
/**
 * Provides method to execute queries on many database connections, but still make
 * sure those queries are wrapped in transactions.
 */
class AtomicSessionFlow {
    /**
     *
     * @param {string[]} names Only executes the queries on connections with specified names.
     */
    constructor(_dbConnector) {
        this._dbConnector = _dbConnector;
        this._tasks = [];
        this._initSession();
    }
    /**
     * Checks if it is possible to call "pipe()".
     */
    get isPipeClosed() {
        return (this._finalPromise != null);
    }
    /**
     * Returns a promise which resolves to the output of the last query
     * on primary (first) connection.
     * This method must be called at the end of the pipe chain.
     */
    closePipe() {
        if (!this.isPipeClosed) {
            this._finalPromise = new Promise(async (resolve, reject) => {
                this._abortFn = reject;
                try {
                    const { transProm } = await this._initPromise;
                    // Clean up
                    this._initPromise = null;
                    // Start executing enqueued tasks
                    this._loop();
                    // Waits for all transaction to complete,
                    // but only takes output from primary (first) one.
                    // `transPromises` resolves when `resolveAllTransactions` is called,
                    // and reject when ``rejectAllTransactions()` is called.
                    const outputs = await transProm;
                    resolve(outputs);
                }
                // Error on init transaction
                catch (err) {
                    reject(err);
                }
            });
        }
        return this._finalPromise;
    }
    /**
     * Adds a task to be executed inside transaction.
     * This method is chainable and can only be called before `closePipe()` is invoked.
     */
    pipe(task) {
        if (this.isPipeClosed) {
            throw new common_1.MinorException('Pipe has been closed!');
        }
        this._tasks.push(task);
        return this;
    }
    _initSession() {
        const knexConn = this._dbConnector.connection;
        return this._initPromise = new Promise(resolve => {
            const transProm = objection_1.transaction(knexConn, trans => {
                this._session = new AtomicSession_1.AtomicSession(knexConn, trans);
                // Avoid passing a promise to resolve(),
                // as it will wait forever
                resolve({ transProm });
                return null;
            });
        });
    }
    _doTask(prevOutput) {
        const task = this._tasks.shift();
        prevOutput = prevOutput || [];
        if (!task) {
            // When there's no more task, we commit all transactions.
            this._resolveTransactions(prevOutput);
            return null;
        }
        // return this.collectTasksOutputs(task, prevOutputs)
        return task(this._session, prevOutput);
    }
    async _loop(prevOutput) {
        const prevWorks = this._doTask(prevOutput);
        if (!prevWorks) {
            return;
        }
        prevWorks
            .then(prev => {
            return this._loop(prev);
        })
            .catch(err => this._rejectTransactions(err))
            // This catches both promise errors and AtomicSessionFlow's errors.
            .catch(this._abortFn);
    }
    _resolveTransactions(output) {
        this._session.knexTransaction.commit(output);
        this._session = this._tasks = null; // Clean up
    }
    _rejectTransactions(error) {
        this._session.knexTransaction.rollback(error);
        this._session = this._tasks = null; // Clean up
    }
}
exports.AtomicSessionFlow = AtomicSessionFlow;
//# sourceMappingURL=AtomicSessionFlow.js.map