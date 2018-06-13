"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const objection_1 = require("objection");
const common_util_1 = require("@micro-fleet/common-util");
const common_contracts_1 = require("@micro-fleet/common-contracts");
/**
 * Provides method to execute queries on many database connections, but still make
 * sure those queries are wrapped in transactions.
 */
class AtomicSessionFlow {
    /**
     *
     * @param {string[]} names Only executes the queries on connections with specified names.
     */
    constructor(_dbConnector, names) {
        this._dbConnector = _dbConnector;
        this._tasks = [];
        this.initSession();
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
            this._finalPromise = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                this._abortFn = reject;
                try {
                    let transPromises = yield this._initPromise;
                    // Clean up
                    this._initPromise = null;
                    // Start executing enqueued tasks
                    this.loop();
                    // Waits for all transaction to complete,
                    // but only takes output from primary (first) one.
                    // `transPromises` resolves when `resolveAllTransactions` is called,
                    // and reject when ``rejectAllTransactions()` is called.
                    let outputs = yield Promise.all(transPromises);
                    resolve(outputs[0]);
                }
                // Error on init transaction
                catch (err) {
                    reject(err);
                }
            }));
        }
        return this._finalPromise;
    }
    /**
     * Adds a task to be executed inside transaction.
     * This method is chainable and can only be called before `closePipe()` is invoked.
     */
    pipe(task) {
        if (this.isPipeClosed) {
            throw new common_util_1.MinorException('Pipe has been closed!');
        }
        this._tasks.push(task);
        return this;
    }
    initSession() {
        const knexConn = this._dbConnector.connection;
        return this._initPromise = objection_1.transaction(knexConn, trans => {
            this._session = new common_contracts_1.AtomicSession(knexConn, trans);
            return null;
        });
    }
    doTask(prevOutput) {
        let task = this._tasks.shift();
        prevOutput = prevOutput || [];
        if (!task) {
            // When there's no more task, we commit all transactions.
            this.resolveTransactions(prevOutput);
            return null;
        }
        // return this.collectTasksOutputs(task, prevOutputs);
        return task(this._session, prevOutput);
    }
    /*
    private collectTasksOutputs(task, prevOutputs): Promise<any> {
        // Unlike Promise.all(), this promise collects all query errors.
        return new Promise((resolve, reject) => {
            let i = 0,
                session = this._session,
                results = [],
                errors = [];

            // Execute each task on all sessions (transactions).
            // for (let s of sessions) {
                task.call(null, this._session, prevOutputs[i])
                    .then(r => {
                        // Collect results
                        results.push(r);
                        if (++i == sLen) {
                            // If there is at least one error,
                            // all transactions are marked as failure.
                            if (errors.length) {
                                reject(errors.length == 1 ? errors[0] : errors);
                            } else {
                                // All transactions are marked as success
                                // only when all of them finish without error.
                                resolve(results);
                            }
                        }
                    })
                    .catch(er => {
                        errors.push(er);
                        // Collect error from all queries.
                        if (++i == sLen) {
                            reject(errors.length == 1 ? errors[0] : errors);
                        }
                    });
        });
    }
    //*/
    loop(prevOutput) {
        let prevWorks = this.doTask(prevOutput);
        if (!prevWorks) {
            return;
        }
        prevWorks
            .then(prev => {
            this.loop(prev);
        })
            .catch(err => this.rejectTransactions(err))
            // This catches both promise errors and AtomicSessionFlow's errors.
            .catch(this._abortFn);
    }
    resolveTransactions(output) {
        this._session.knexTransaction.commit(output);
        this._session = this._tasks = null; // Clean up
    }
    rejectTransactions(error) {
        this._session.knexTransaction.rollback(error);
        this._session = this._tasks = null; // Clean up
    }
}
exports.AtomicSessionFlow = AtomicSessionFlow;
//# sourceMappingURL=AtomicSessionFlow.js.map