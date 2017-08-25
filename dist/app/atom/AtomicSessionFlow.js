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
const back_lib_common_util_1 = require("back-lib-common-util");
const back_lib_common_contracts_1 = require("back-lib-common-contracts");
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
        this._sessions = [];
        this._tasks = [];
        this.initSessions(names);
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
     * Adds a task to session, it will be executed inside transaction of each connections
     * This method is chainable and can only be called before `closePipe()` is invoked.
     */
    pipe(task) {
        if (this.isPipeClosed) {
            throw new back_lib_common_util_1.MinorException('Pipe has been closed!');
        }
        this._tasks.push(task);
        return this;
    }
    initSessions(names) {
        return this._initPromise = new Promise((resolveInit, rejectInit) => {
            let transPromises = [], conns = this._dbConnector.connections, len = conns.length, i = 0;
            // Start a new transaction for each connection.
            for (let knexConn of conns) {
                if (names && names.length && !names.includes(knexConn.customName)) {
                    continue;
                }
                // `transPro` resolves when transaction is commited. Otherwise, it rejects.
                let transPro = objection_1.transaction(knexConn, trans => {
                    this._sessions.push(new back_lib_common_contracts_1.AtomicSession(knexConn, trans));
                    i++;
                    // Last connection
                    if (i == len || (names && names.length && i == names.length)) {
                        resolveInit(transPromises);
                    }
                    return null;
                });
                transPromises.push(transPro);
            } // END for
            if (!transPromises.length) {
                rejectInit(new back_lib_common_util_1.MinorException('No transaction was created!'));
            }
        });
    }
    doTask(prevOutputs) {
        let task = this._tasks.shift();
        prevOutputs = prevOutputs || [];
        if (!task) {
            // When there's no more task, we commit all transactions.
            this.resolveAllTransactions(prevOutputs);
            return null;
        }
        return this.collectTasksOutputs(task, prevOutputs);
    }
    collectTasksOutputs(task, prevOutputs) {
        // Unlike Promise.all(), this promise collects all query errors.
        return new Promise((resolve, reject) => {
            let i = 0, sessions = this._sessions, sLen = sessions.length, results = [], errors = [];
            // Execute each task on all sessions (transactions).
            for (let s of sessions) {
                task.call(null, s, prevOutputs[i])
                    .then(r => {
                    // Collect results
                    results.push(r);
                    if (++i == sLen) {
                        // If there is at least one error,
                        // all transactions are marked as failure.
                        if (errors.length) {
                            /* istanbul ignore next */
                            reject(errors.length == 1 ? errors[0] : errors);
                        }
                        else {
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
                        /* istanbul ignore next */
                        reject(errors.length == 1 ? errors[0] : errors);
                    }
                });
            } // END for
        });
    }
    loop(prevOutputs) {
        let prevWorks = this.doTask(prevOutputs);
        if (!prevWorks) {
            return;
        }
        prevWorks
            .then(prev => {
            this.loop(prev);
        })
            .catch(err => this.rejectAllTransactions(err))
            .catch(this._abortFn);
    }
    resolveAllTransactions(outputs) {
        this._sessions.forEach((s, i) => s.knexTransaction.commit(outputs[i]));
        this._sessions = this._tasks = null; // Clean up
    }
    rejectAllTransactions(error) {
        this._sessions.forEach(s => s.knexTransaction.rollback(error));
    }
}
exports.AtomicSessionFlow = AtomicSessionFlow;

//# sourceMappingURL=AtomicSessionFlow.js.map
