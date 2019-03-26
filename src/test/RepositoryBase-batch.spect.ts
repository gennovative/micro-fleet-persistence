/// <reference types="debug" />

const debug: debug.IDebugger = require('debug')('MonoProcessor')
import { expect } from 'chai'

import { MinorException, ModelAutoMapper, DtoBase } from '@micro-fleet/common'
import { IdGenerator } from '@micro-fleet/id-generator'

import { RepositoryBase, EntityBase, IRepository, IDatabaseConnector,
        KnexDatabaseConnector, AtomicSessionFactory, AtomicSessionFlow } from '../app'
import DB_DETAILS from './database-details'


const DB_TABLE = 'usersBatch',
    IMPOSSIBLE_IDs = [0n, -1n]

class UserBatchDTO extends DtoBase implements ISoftDeletable {

    public static readonly translator: ModelAutoMapper<UserBatchDTO> = new ModelAutoMapper(UserBatchDTO)

    // NOTE: Class properties must be initialized, otherwise they
    // will disappear in transpiled code.
    public id: bigint = undefined
    public name: string = undefined
    public age: number = undefined
    public deletedAt: Date = undefined
}


class UserBatchEntity extends EntityBase {
    /**
     * @override
     */
    public static get tableName(): string {
        return DB_TABLE
    }

    public static readonly idColumn = ['id']
    public static readonly uniqColumn = ['name', 'age']

    public static readonly translator: ModelAutoMapper<UserBatchEntity> = new ModelAutoMapper(UserBatchEntity)

    // NOTE: Class properties must be initialized, otherwise they
    // will disappear in transpiled code.
    public id: bigint = undefined
    public name: string = undefined
    public age: number = undefined
    public deletedAt: string = undefined
}

class UserBatchRepo
    extends RepositoryBase<UserBatchEntity, UserBatchDTO>
    implements IRepository<UserBatchDTO> {

    private _sessionFactory: AtomicSessionFactory

    constructor(
        dbConnector: IDatabaseConnector
    ) {
        super(UserBatchEntity, UserBatchDTO, dbConnector)
        this._sessionFactory = new AtomicSessionFactory(dbConnector)
    }

    protected get pkCol(): string[] {
        return UserBatchEntity.idColumn
    }

    protected get pkProp(): string[] {
        return UserBatchEntity.idProp
    }

    protected get ukCol(): string[] {
        return UserBatchEntity.uniqColumn
    }


    public createTwoCouplesWithTransaction(adams: UserBatchDTO[], evas: UserBatchDTO[]): Promise<UserBatchDTO[]> {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => {
                debug('Creating Adam')
                return this.create(adams, { atomicSession })
            })
            .pipe((atomicSession, createdAdams) => {
                if (!createdAdams) {
                    debugger
                    // In fact, this scenario should never happen.
                    // Because when we come to this point, the previous task must have been successfull.
                    return Promise.reject('Cannot live without our husbands!')
                }
                debug('Creating Eva')
                return this.create(evas, { atomicSession })
                    .then(createdEvas => [...createdAdams, ...(createdEvas as UserBatchDTO[])])
            })
            .closePipe()
    }

    private _counter = 0
    public firstOutput: UserBatchDTO[]
    public failOnSecondTransaction(adams: UserBatchDTO[], evas: UserBatchDTO[]): Promise<UserBatchDTO[]> {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => this.create(adams, { atomicSession }))
            .pipe((atomicSession, createdAdams) => {
                this._counter++
                // If this is transaction of the second connection
                if (this._counter == 2) {
                    return new Promise((resolve, reject) => {
                        // Delay here to let first transaction to finish,
                        // but throw MinorException before it resolves.
                        setTimeout(() => {
                            reject(new MinorException('Error on second transaction'))
                        }, 100)
                })
                } else {
                    return new Promise((resolve, reject) => {
                        this.create(evas, { atomicSession })
                            .then(createdEvas => {
                                this.firstOutput = [...createdAdams, ...(createdEvas as UserBatchDTO[])]
                                // First transaction has finished but not yet resolves,
                                // it must delay here to let second transaction to fail
                                setTimeout(() => {
                                    resolve(this.firstOutput)
                                }, 200)
                            })
                    })
                }
            })
            .closePipe()
    }

    public createSessionPipe(adams: UserBatchDTO[], evas: UserBatchDTO[]): AtomicSessionFlow {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => this.create(adams, { atomicSession }))
            .pipe((atomicSession, createdAdams) => {
                if (!createdAdams) {
                    debugger
                    // In fact, this scenario should never happen.
                    // Because when we come to this point, the previous task must have been successfull.
                    return Promise.reject('Cannot live without my husband!')
                }
                return this.create(evas, { atomicSession })
                    .then(createdEvas => [...createdAdams, ...(createdEvas as UserBatchDTO[])])
            })
            // .closePipe() // Not closing pipe
    }

    public createEmptyPipe(adams: UserBatchDTO[], eva: UserBatchDTO[]): AtomicSessionFlow {
        return this._sessionFactory.startSession()
            .pipe(session => {
                return Promise.resolve('Nothing')
            })
            // .closePipe() // Not closing pipe
    }

    public async find(id: bigint): Promise<UserBatchDTO> {
        const foundEnt: UserBatchEntity = await this._processor.executeQuery(query => {
                return query.findById(id as any)
            }, null)

        return this._processor.toDTO(foundEnt, false) as UserBatchDTO
    }

    public deleteAll(): Promise<void> {
        return this._processor.executeQuery(query => query.delete())
    }
}

let cachedDTOs: UserBatchDTO[],
    globalDbConnector: IDatabaseConnector,
    usrRepo: UserBatchRepo

const idGen = new IdGenerator()

// These test suites make real changes to database.
describe('RepositoryBase-batch', function() {
    // this.timeout(50000)

    beforeEach('Initialize db adapter', () => {
        globalDbConnector = new KnexDatabaseConnector()
        // // For SQLite3 file
        // dbConnector.addConnection({
            // clientName: DbClient.SQLITE3,
            // fileName: CONN_FILE,
        // })

        // // For PostgreSQL
        globalDbConnector.init(DB_DETAILS)
        usrRepo = new UserBatchRepo(globalDbConnector)
    })

    afterEach('Tear down db adapter', async () => {
        await globalDbConnector.dispose()
        globalDbConnector = null
    })

    describe('create with transaction', () => {

        it('should insert four rows on each database', async () => {
            // Arrange
            const adamOne = new UserBatchDTO(),
                adamTwo = new UserBatchDTO(),
                evaOne = new UserBatchDTO(),
                evaTwo = new UserBatchDTO()

            adamOne.id = idGen.nextBigInt()
            adamOne.name = 'Adam One'
            adamOne.age = 11

            adamTwo.id = idGen.nextBigInt()
            adamTwo.name = 'Adam Two'
            adamTwo.age = 22

            evaOne.id = idGen.nextBigInt()
            evaOne.name = 'Eva One'
            evaOne.age = 33

            evaTwo.id = idGen.nextBigInt()
            evaTwo.name = 'Eva Two'
            evaTwo.age = 44

            const sources = [adamOne, adamTwo, evaOne, evaTwo]

            try {
                // Act
                const output = await usrRepo.createTwoCouplesWithTransaction([adamOne, adamTwo], [evaOne, evaTwo])
                expect(output).to.exist
                expect(output.length).to.equal(4)

                output.forEach((u, i) => {
                    expect(u.id).to.equal(sources[i].id)
                    expect(u.name).to.equal(sources[i].name)
                    expect(u.age).to.equal(sources[i].age)
                })

                // Clean up
                await usrRepo.deleteHard(output.map(u => u.id))
            } catch (err) {
                console.error(err)
                expect(err).not.to.exist
            }
        })

        it('should rollback all transactions when a query fails either on one or all transactions', async () => {
            // Arrange
            try {
                await usrRepo.deleteAll()
            } catch (ex) {
                // Empty
            }

            const adamOne = new UserBatchDTO(),
                adamTwo = new UserBatchDTO(),
                evaOne = new UserBatchDTO(),
                evaTwo = new UserBatchDTO()

            adamOne.id = idGen.nextBigInt()
            adamOne.name = 'Adam One'
            adamOne.age = 11

            adamTwo.id = idGen.nextBigInt()
            adamTwo.name = 'Adam Two'
            adamTwo.age = 22

            evaOne.id = idGen.nextBigInt()
            evaOne.name = 'Eva One'
            evaOne.age = 33

            evaTwo.id = idGen.nextBigInt()
            evaTwo.name = null // fail
            evaTwo.age = 44

            try {
                // Act
                const output = await usrRepo.createTwoCouplesWithTransaction([adamOne, adamTwo], [evaOne, evaTwo])
                expect(output).not.to.exist
            } catch (error) {
                // Assert
                expect(error).to.exist
                expect(error.message).to.include('violates not-null constraint')
            }
            // Assert
            const count = await usrRepo.countAll()
            expect(count).to.equal(0)
        })

        it('should resolve same result if calling `closePipe` multiple times', async () => {
            // Arrange
            const adamOne = new UserBatchDTO(),
                adamTwo = new UserBatchDTO(),
                evaOne = new UserBatchDTO(),
                evaTwo = new UserBatchDTO()

            adamOne.id = idGen.nextBigInt()
            adamOne.name = 'Adam One'
            adamOne.age = 11

            adamTwo.id = idGen.nextBigInt()
            adamTwo.name = 'Adam Two'
            adamTwo.age = 22

            evaOne.id = idGen.nextBigInt()
            evaOne.name = 'Eva One'
            evaOne.age = 33

            evaTwo.id = idGen.nextBigInt()
            evaTwo.name = 'Eva Two'
            evaTwo.age = 44

            try {
                // Act
                const flow = usrRepo.createSessionPipe([adamOne, adamTwo], [evaOne, evaTwo]),
                    outputOne: any[] = await flow.closePipe(),
                    outputTwo: any[] = await flow.closePipe()

                // Assert
                expect(outputOne).to.exist
                expect(outputTwo).to.exist
                expect(outputOne.length).to.equal(4)
                expect(outputOne.length).to.equal(outputTwo.length)
                for (let i = 0; i < outputOne.length; ++i) {
                    expect(outputOne[i]).to.equal(outputTwo[i])
                }

                // Clean up
                await Promise.all([
                    usrRepo.deleteHard(outputOne.map(u => u.id)),
                ])
            } catch (err) {
                console.error(err)
                expect(err).not.to.exist
            }
        })

        it('should throw error if calling `pipe` after `closePipe`', async () => {
            try {
                // Act
                const flow = usrRepo.createEmptyPipe([], [])

                await flow.closePipe()
                flow.pipe(s => {
                    expect(null, 'Should not go here!').to.exist
                    return Promise.reject(null)
                })
            } catch (err) {
                // Assert
                expect(err).to.exist
                expect(err).to.be.instanceOf(MinorException)
                expect(err.message).to.equal('Pipe has been closed!')
            }
        })
    })

    describe('create without transaction', () => {
        it('should insert a row to database without transaction', async () => {
            // Arrange
            const modelOne = new UserBatchDTO()
            modelOne.id = idGen.nextBigInt()
            modelOne.name = 'One'
            modelOne.age = 29

            const modelTwo = new UserBatchDTO()
            modelTwo.id = idGen.nextBigInt()
            modelTwo.name = 'Two'
            modelTwo.age = 92

            const sources = [modelOne, modelTwo]

            // Act
            const createdDTOs: UserBatchDTO[] = cachedDTOs = await usrRepo.create([modelOne, modelTwo]) as UserBatchDTO[]

            // Assert
            expect(createdDTOs).to.be.not.null
            expect(createdDTOs.length).to.equal(sources.length)
            createdDTOs.forEach((u, i) => {
                expect(u.id).to.equal(sources[i].id)
                expect(u.name).to.equal(sources[i].name)
                expect(u.age).to.equal(sources[i].age)
            })
        })
    }) // END describe 'create'

    describe('patch', () => {
        it('should return an object with updated properties if found', async () => {
            // Arrange
            const newAgeOne = 45,
                newAgeTwo = 54

            // Act
            const partials: Partial<UserBatchDTO>[] = await usrRepo.patch([
                    { id: cachedDTOs[0].id, age: newAgeOne},
                    { id: cachedDTOs[1].id, age: newAgeTwo},
                ]) as Partial<UserBatchDTO>[],
                refetchedOne: UserBatchDTO = await usrRepo.findByPk(cachedDTOs[0].id),
                refetchedTwo: UserBatchDTO = await usrRepo.findByPk(cachedDTOs[1].id)

            // Assert
            expect(partials).to.exist
            expect(partials.length).to.equal(2)
            expect(partials[0].id).to.equal(cachedDTOs[0].id)
            expect(partials[0].age).to.equal(newAgeOne)

            expect(partials[1].id).to.equal(cachedDTOs[1].id)
            expect(partials[1].age).to.equal(newAgeTwo)

            expect(refetchedOne).to.be.not.null
            expect(refetchedOne.id).to.equal(cachedDTOs[0].id)
            expect(refetchedOne.name).to.equal(cachedDTOs[0].name)
            expect(refetchedOne.age).to.equal(newAgeOne)

            expect(refetchedTwo).to.be.not.null
            expect(refetchedTwo.id).to.equal(cachedDTOs[1].id)
            expect(refetchedTwo.name).to.equal(cachedDTOs[1].name)
            expect(refetchedTwo.age).to.equal(newAgeTwo)
        })

        it('should return `null` if not found', async () => {
            // Arrange
            const newAgeOne = 45,
                newAgeTwo = 54

            // Act
            const partial: Partial<UserBatchDTO>[] = await usrRepo.patch([
                    { id: IMPOSSIBLE_IDs[0], age: newAgeOne},
                    { id: IMPOSSIBLE_IDs[1], age: newAgeTwo},
                ]) as Partial<UserBatchDTO>[],
                refetchedOne: UserBatchDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[0]),
                refetchedTwo: UserBatchDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[1])

            // Assert
            expect(partial).to.exist
            expect(partial.length).to.equal(2)
            expect(partial[0]).to.be.null
            expect(partial[1]).to.be.null
            // If `patch` returns `null`, but we actually find an entity with the id, then something is wrong.
            expect(refetchedOne).to.be.null
            expect(refetchedTwo).to.be.null
        })
    }) // END describe 'patch'

    describe('update', () => {
        it('should return an updated model if found', async () => {
            // Arrange
            const newNameOne = 'Brian',
                newNameTwo = 'Rein',
                updatedOne: UserBatchDTO = Object.assign(new UserBatchDTO, cachedDTOs[0]),
                updatedTwo: UserBatchDTO = Object.assign(new UserBatchDTO, cachedDTOs[1])
            updatedOne.name = newNameOne
            updatedTwo.name = newNameTwo

            // Act
            const modified = await usrRepo.update([updatedOne, updatedTwo]) as UserBatchDTO[],
                refetchedOne: UserBatchDTO = await usrRepo.findByPk(cachedDTOs[0].id),
                refetchedTwo: UserBatchDTO = await usrRepo.findByPk(cachedDTOs[1].id)

            // Assert
            expect(modified).to.exist
            expect(modified.length).to.equal(2)

            expect(modified[0].id).to.equal(cachedDTOs[0].id)
            expect(modified[0].name).to.equal(newNameOne)

            expect(modified[1].id).to.equal(cachedDTOs[1].id)
            expect(modified[1].name).to.equal(newNameTwo)

            expect(refetchedOne).to.exist
            expect(refetchedOne.id).to.equal(cachedDTOs[0].id)
            expect(refetchedOne.name).to.equal(newNameOne)
            expect(refetchedOne.age).to.equal(cachedDTOs[0].age)

            expect(refetchedTwo).to.exist
            expect(refetchedTwo.id).to.equal(cachedDTOs[1].id)
            expect(refetchedTwo.name).to.equal(newNameTwo)
            expect(refetchedTwo.age).to.equal(cachedDTOs[1].age)
        })

        it('should return `null` if not found', async () => {
            // Arrange
            const newNameOne = 'Brian',
                newNameTwo = 'Rein',
                updatedOne: UserBatchDTO = Object.assign(new UserBatchDTO, cachedDTOs[0]),
                updatedTwo: UserBatchDTO = Object.assign(new UserBatchDTO, cachedDTOs[1])

            updatedOne.id = IMPOSSIBLE_IDs[0]
            updatedOne.name = newNameOne

            updatedTwo.id = IMPOSSIBLE_IDs[1]
            updatedTwo.name = newNameTwo

            // Act
            const modified = await usrRepo.update([updatedOne, updatedTwo]) as UserBatchDTO[],
                refetchedOne: UserBatchDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[0]),
                refetchedTwo: UserBatchDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[1])

            // Assert
            expect(modified).to.exist
            expect(modified.length).to.equal(2)
            expect(modified[0]).to.be.null
            expect(modified[1]).to.be.null
            // If `update` returns `null`, but we actually find an entity with the id, then something is wrong.
            expect(refetchedOne).to.be.null
            expect(refetchedTwo).to.be.null
        })
    }) // END describe 'update'

    /*
    describe('delete (soft)', () => {
        it('should return a possitive number and the record is still in database', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteSoft([cachedDTOs[0].id, cachedDTOs[1].id]),
                refetchedOne: UserBatchDTO = await usrRepo.findByPk(cachedDTOs[0].id),
                refetchedTwo: UserBatchDTO = await usrRepo.findByPk(cachedDTOs[1].id)

            // Assert
            expect(affectedRows).to.be.equal(2)
            // If soft `delete` is successful, we must be able to still find that entity with the id.
            expect(refetchedOne).to.exist
            expect(refetchedOne.deletedAt).to.exist
            expect(refetchedTwo).to.exist
            expect(refetchedTwo.deletedAt).to.exist
        })

        it('should return a number and the affected records', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteSoft([cachedDTOs[0].id, IMPOSSIBLE_IDs[1]])

            // Assert
            expect(affectedRows).to.be.equal(1)
        })
    }) // END describe 'delete (soft)'

    describe('recover', () => {
        it('should return a possitive number if success', async () => {
            // Act
            const affectedRows: number = await usrRepo.recover([cachedDTOs[0].id, cachedDTOs[1].id]),
                refetchedOne: UserBatchDTO = await usrRepo.findByPk(cachedDTOs[0].id),
                refetchedTwo: UserBatchDTO = await usrRepo.findByPk(cachedDTOs[1].id)

            // Assert
            expect(affectedRows).to.be.equal(2)
            // If soft `delete` is successful, we must be able to still find that entity with the id.
            expect(refetchedOne).to.exist
            expect(refetchedOne.deletedAt).to.be.null
            expect(refetchedTwo).to.exist
            expect(refetchedTwo.deletedAt).to.be.null
        })

        it('should return a number and the affected records', async () => {
            // Arrage
            await usrRepo.deleteSoft([cachedDTOs[0].id, cachedDTOs[1].id])

            // Act
            const affectedRows: number = await usrRepo.recover([cachedDTOs[0].id, IMPOSSIBLE_IDs[1]])

            // Assert
            expect(affectedRows).to.be.equal(1)
        })
    }) // END describe 'recover'
    //*/

    describe('delete (hard)', () => {
        it('should return a possitive number if found', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteHard([cachedDTOs[0].id, cachedDTOs[1].id]),
                refetchedOne: UserBatchDTO = await usrRepo.findByPk(cachedDTOs[0].id),
                refetchedTwo: UserBatchDTO = await usrRepo.findByPk(cachedDTOs[1].id)

            // Assert
            expect(affectedRows).to.be.equal(2)
            // If hard `delete` is successful, but we still find an entity with the id, then something is wrong.
            expect(refetchedOne).to.be.null
            expect(refetchedTwo).to.be.null
        })

        it('should return 0 if not found', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteHard(IMPOSSIBLE_IDs),
                refetchedOne: UserBatchDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[0]),
                refetchedTwo: UserBatchDTO = await usrRepo.findByPk(IMPOSSIBLE_IDs[1])

            // Assert
            expect(affectedRows).to.equal(0)
            // If hard `delete` returns 0, but we actually find an entity with the id, then something is wrong.
            expect(refetchedOne).to.be.null
            expect(refetchedTwo).to.be.null
        })
    }) // END describe 'delete (hard)'
})
