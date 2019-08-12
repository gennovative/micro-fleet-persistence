import { expect } from 'chai'

import { MinorException, PagedData, ModelAutoMapper,
    TenantId, Maybe } from '@micro-fleet/common'
import { IdGenerator } from '@micro-fleet/id-generator'

import { ORMModelBase, IDatabaseConnector,
    KnexDatabaseConnector, AtomicSessionFactory, AtomicSessionFlow,
    PgCrudRepositoryBase} from '../app'
import DB_DETAILS from './database-details'


const DB_TABLE = 'usersTenant',
    IMPOSSIBLE_ID = '0'


class UserTenantDTO {

    public static readonly translator: ModelAutoMapper<UserTenantDTO> = new ModelAutoMapper(UserTenantDTO)

    // NOTE: Class properties must be initialized, otherwise they
    // will disappear in transpiled code.
    public id: string = undefined
    public tenantId: string = undefined
    public name: string = undefined
    public age: number = undefined
}


class UserTenantEntity extends ORMModelBase {
    /**
     * @override
     */
    public static get tableName(): string {
        return DB_TABLE
    }

    public static readonly idColumn = ['id', 'tenant_id']
    // public static readonly idProp = ['id', 'tenantId']
    public static readonly uniqColumn = ['name']

    public static readonly translator: ModelAutoMapper<UserTenantEntity> = new ModelAutoMapper(UserTenantEntity)

    // NOTE: Class properties must be initialized, otherwise they
    // will disappear in transpiled code.
    public id: string = undefined
    public tenantId: string = undefined
    public name: string = undefined
    public age: number = undefined
}

class UserTenantRepo extends PgCrudRepositoryBase<UserTenantEntity, UserTenantDTO, TenantId> {

    private _sessionFactory: AtomicSessionFactory

    constructor(
        dbConnector: IDatabaseConnector
    ) {
        super(UserTenantEntity, UserTenantDTO, dbConnector)
        this._sessionFactory = new AtomicSessionFactory(dbConnector)
    }

    public createCoupleWithTransaction(adam: UserTenantDTO, eva: UserTenantDTO): Promise<UserTenantDTO[]> {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => this.create(adam, { atomicSession }))
            .pipe((atomicSession, createdAdam) => {
                if (!createdAdam) {
                    debugger
                    // In fact, this scenario should never happen.
                    // Because when we come to this point, the previous task must have been successfull.
                    return Promise.reject('Cannot live without my husband!')
                }
                return this.create(eva, { atomicSession })
                    .then(createdEva => [createdAdam, createdEva])
            })
            .closePipe()
    }

    private _counter = 0
    public firstOutput: any
    public failOnSecondTransaction(adam: UserTenantDTO, eva: UserTenantDTO): Promise<UserTenantDTO[]> {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => this.create(adam, { atomicSession }))
            .pipe((atomicSession, createdAdam) => {
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
                        this.create(eva, { atomicSession })
                            .then(createdEva => {
                                this.firstOutput = [createdAdam, createdEva]
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

    public createSessionPipe(adam: UserTenantDTO, eva: UserTenantDTO): AtomicSessionFlow {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => this.create(adam, { atomicSession }))
            .pipe((atomicSession, createdAdam) => {
                if (!createdAdam) {
                    debugger
                    // In fact, this scenario should never happen.
                    // Because when we come to this point, the previous task must have been successfull.
                    return Promise.reject('Cannot live without my husband!')
                }
                return this.create(eva, { atomicSession })
                    .then(createdEva => [createdAdam, createdEva])
            })
            // .closePipe() // Not closing pipe
    }

    public createEmptyPipe(adam: UserTenantDTO, eva: UserTenantDTO): AtomicSessionFlow {
        return this._sessionFactory.startSession()
            .pipe(session => {
                return Promise.resolve('Nothing')
            })
            // .closePipe() // Not closing pipe
    }

    public deleteAll(): Promise<void> {
        return this.executeQuery(query => query.delete())
    }
}

let cachedDTO: UserTenantDTO,
    cachedTenantId: string,
    globalDbConnector: IDatabaseConnector,
    usrRepo: UserTenantRepo

const idGen = new IdGenerator()


// These test suites make real changes to database.
describe('RepositoryBase-tenant', function() {
    // this.timeout(50000)

    beforeEach('Initialize db adapter', () => {
        globalDbConnector = new KnexDatabaseConnector()
        // // For SQLite3 file
        // dbConnector.addConnection({
            // clientName: DbClient.SQLITE3,
            // filePath: CONN_FILE,
        // })

        // // For PostgreSQL
        globalDbConnector.init(DB_DETAILS)
        usrRepo = new UserTenantRepo(globalDbConnector)
    })

    afterEach('Tear down db adapter', async () => {
        await globalDbConnector.dispose()
        globalDbConnector = null
    })

    describe('create with transaction', () => {
        it('should insert two rows on each database', async () => {
            // Arrange
            const modelOne = new UserTenantDTO(),
                modelTwo = new UserTenantDTO()

            modelOne.id = idGen.nextBigInt().toString()
            modelOne.tenantId = idGen.nextBigInt().toString()
            modelOne.name = 'One'
            modelOne.age = 11

            modelTwo.id = modelOne.id
            modelTwo.tenantId = idGen.nextBigInt().toString()
            modelTwo.name = 'Two'
            modelTwo.age = 22

            try {
                // Act
                const output = await usrRepo.createCoupleWithTransaction(modelOne, modelTwo)
                expect(output).to.exist

                const [createdOne, createdTwo] = output
                // Assert
                expect(createdOne).to.exist
                expect(createdTwo).to.exist
                expect(createdOne.id).to.be.equal(modelOne.id)
                expect(createdTwo.id).to.be.equal(modelTwo.id)
                expect(createdOne.name).to.equal(modelOne.name)
                expect(createdOne.age).to.equal(modelOne.age)
                expect(createdTwo.name).to.equal(modelTwo.name)
                expect(createdTwo.age).to.equal(modelTwo.age)

                // Clean up
                await Promise.all([
                    usrRepo.deleteSingle(new TenantId(createdOne.id, createdOne.id)),
                    usrRepo.deleteSingle(new TenantId(createdTwo.id, createdTwo.id)),
                ])
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

            const modelOne = new UserTenantDTO(),
                modelTwo = new UserTenantDTO()

            modelOne.id = modelTwo.id = idGen.nextBigInt().toString()
            modelOne.tenantId = idGen.nextBigInt().toString()
            modelOne.name = 'One'
            modelOne.age = 11

            modelTwo.tenantId = idGen.nextBigInt().toString()
            modelTwo.name = null // fail
            modelTwo.age = 22

            try {
                // Act
                const output = await usrRepo.createCoupleWithTransaction(modelOne, modelTwo)
                expect(output).not.to.exist
            } catch (error) {
                // Assert
                expect(error).to.exist
                expect(error.message).to.include('violates not-null constraint')
            }
            // Assert
            let count = await usrRepo.countAll({
                tenantId: modelOne.tenantId,
            })
            expect(count).to.equal(0)

            count = await usrRepo.countAll({
                tenantId: modelTwo.tenantId,
            })
            expect(count).to.equal(0)
        })

        it('should resolve same result if calling `closePipe` multiple times', async () => {
            // Arrange
            const modelOne = new UserTenantDTO(),
                modelTwo = new UserTenantDTO()

            modelOne.id = modelTwo.id = idGen.nextBigInt().toString()
            modelOne.tenantId = idGen.nextBigInt().toString()
            modelOne.name = 'One'
            modelOne.age = 11

            modelTwo.tenantId = idGen.nextBigInt().toString()
            modelTwo.name = 'Two'
            modelTwo.age = 22

            try {
                // Act
                const flow = usrRepo.createSessionPipe(modelOne, modelTwo),
                    outputOne = await flow.closePipe(),
                    outputTwo = await flow.closePipe()

                // Assert
                expect(outputOne).to.exist
                expect(outputTwo).to.exist
                expect(outputOne[0]).to.equal(outputTwo[0])
                expect(outputOne[1]).to.equal(outputTwo[1])

                // Clean up
                await Promise.all([
                    usrRepo.deleteSingle(new TenantId(outputOne[0].id, outputOne[0].tenantId)),
                    usrRepo.deleteSingle(new TenantId(outputOne[1].id, outputOne[1].tenantId)),
                ])
            } catch (err) {
                console.error(err)
                expect(err).not.to.exist
            }
        })

        it('should throw error if calling `pipe` after `closePipe`', async () => {
            // Arrange
            const modelOne = new UserTenantDTO(),
                modelTwo = new UserTenantDTO()

            modelOne.id = modelTwo.id = idGen.nextBigInt().toString()
            modelOne.tenantId = idGen.nextBigInt().toString()
            modelOne.name = 'One'
            modelOne.age = 11

            modelTwo.tenantId = idGen.nextBigInt().toString()
            modelTwo.name = 'Two'
            modelTwo.age = 22

            try {
                // Act
                const flow = usrRepo.createEmptyPipe(modelOne, modelTwo)

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
            const model = new UserTenantDTO(),
                tenantId = idGen.nextBigInt().toString()
            model.id = idGen.nextBigInt().toString()
            model.tenantId = tenantId
            model.name = 'Hiri'
            model.age = 29

            // Act
            const createdDTO: UserTenantDTO = cachedDTO = await usrRepo.create(model) as UserTenantDTO

            // Assert
            expect(createdDTO).to.be.not.null
            expect(createdDTO.id).to.equal(model.id)
            expect(createdDTO.name).to.equal(model.name)
            expect(createdDTO.age).to.equal(model.age)
        })
    }) // END describe 'create'

    describe('find', () => {
        it('should return an model instance if found', async () => {
            // Act
            const foundDTO: Maybe<UserTenantDTO> = await usrRepo.findById(new TenantId(
                cachedDTO.id,
                cachedDTO.tenantId,
            ))

            // Assert
            expect(foundDTO.isJust).to.be.true
            expect(foundDTO.value.id).to.equal(cachedDTO.id)
            expect(foundDTO.value.name).to.equal(cachedDTO.name)
            expect(foundDTO.value.age).to.equal(cachedDTO.age)
        })

        it('should return `null` if not found', async () => {
            // Act
            const model: Maybe<UserTenantDTO> = await usrRepo.findById(new TenantId(
                IMPOSSIBLE_ID,
                '0',
            ))

            // Assert
            expect(model.isNothing).to.be.true
        })
    }) // END describe 'find'

    describe('patch', () => {
        it('should return an object with updated properties if found', async () => {
            // Arrange
            const newAge = 45

            // Act
            const partial: Maybe<UserTenantDTO> = await usrRepo.patch({
                    id: cachedDTO.id,
                    tenantId: cachedDTO.tenantId,
                    age: newAge,
                })
            const refetchedDTO: Maybe<UserTenantDTO> = await usrRepo.findById(new TenantId(
                    cachedDTO.id,
                    cachedDTO.tenantId,
                ))

            // Assert
            expect(partial.isJust).to.be.true
            expect(partial.value.id).to.equal(cachedDTO.id)
            expect(partial.value.age).to.equal(newAge)
            expect(refetchedDTO.isJust).to.be.true
            expect(refetchedDTO.value.id).to.equal(cachedDTO.id)
            expect(refetchedDTO.value.name).to.equal(cachedDTO.name)
            expect(refetchedDTO.value.age).to.equal(newAge)
        })

        it('should return `null` if not found', async () => {
            // Arrange
            const newAge = 45

            // Act
            const partial: Maybe<UserTenantDTO> = await usrRepo.patch({
                    id: IMPOSSIBLE_ID,
                    tenantId: '0',
                    age: newAge,
                })
            const refetchedDTO: Maybe<UserTenantDTO> = await usrRepo.findById(new TenantId(
                    IMPOSSIBLE_ID,
                    '0',
                ))

            // Assert
            expect(partial.isNothing).to.be.true
            // If `patch` returns Nothing, but we actually find an entity with the id, then something is wrong.
            expect(refetchedDTO.isNothing).to.be.true
        })
    }) // END describe 'patch'

    describe('update', () => {
        it('should return an updated model if found', async () => {
            // Arrange
            const newName = 'Brian',
                updatedDTO: UserTenantDTO = Object.assign(new UserTenantDTO, cachedDTO)
            updatedDTO.name = newName

            // Act
            const modified: Maybe<UserTenantDTO> = await usrRepo.update(updatedDTO),
                refetchedDTO: Maybe<UserTenantDTO> = await usrRepo.findById(new TenantId(
                    cachedDTO.id,
                    cachedDTO.tenantId,
                ))

            // Assert
            expect(modified.isJust).to.be.true
            expect(modified.value.id).to.equal(cachedDTO.id)
            expect(modified.value.name).to.equal(newName)
            expect(refetchedDTO.isJust).to.be.true
            expect(refetchedDTO.value.id).to.equal(cachedDTO.id)
            expect(refetchedDTO.value.name).to.equal(newName)
            expect(refetchedDTO.value.age).to.equal(cachedDTO.age)
        })

        it('should return `null` if not found', async () => {
            // Arrange
            const newName = 'Brian',
                updatedDTO: UserTenantDTO = Object.assign(new UserTenantDTO, cachedDTO)
            updatedDTO.id = IMPOSSIBLE_ID
            updatedDTO.name = newName

            // Act
            const modified: Maybe<UserTenantDTO> = await usrRepo.update(updatedDTO),
                refetchedDTO: Maybe<UserTenantDTO> = await usrRepo.findById(new TenantId(
                    updatedDTO.id,
                    updatedDTO.tenantId,
                ))

            // Assert
            expect(modified.isNothing).to.be.true
            // If `update` returns Nothing, but we actually find an entity with the id, then something is wrong.
            expect(refetchedDTO.isNothing).to.be.true
        })
    }) // END describe 'update'

    describe('deleteSingle (hard)', () => {
        it('should return a possitive number if found', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteSingle(new TenantId(
                    cachedDTO.id,
                    cachedDTO.tenantId,
                ))
            const refetchedDTO: Maybe<UserTenantDTO> = await usrRepo.findById(new TenantId(
                    cachedDTO.id,
                    cachedDTO.tenantId,
                ))

            // Assert
            expect(affectedRows).to.be.greaterThan(0)
            // If `delete` is successful, but we still find an entity with the id, then something is wrong.
            expect(refetchedDTO.isNothing).to.be.true
        })

        it('should return 0 if not found', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteSingle(new TenantId(
                    IMPOSSIBLE_ID,
                    '0',
                )),
                refetchedDTO: Maybe<UserTenantDTO> = await usrRepo.findById(new TenantId(
                    IMPOSSIBLE_ID,
                    '0',
                ))

            // Assert
            expect(affectedRows).to.equal(0)
            // If `delete` returns 0, but we actually find an entity with the id, then something is wrong.
            expect(refetchedDTO.isNothing).to.be.true
        })
    }) // END describe 'deleteSingle (hard)'

    describe('page', function() {
        this.timeout(5000)

        it('Should return empty array if there is no records', async () => {
            // Arrange
            const PAGE = 1,
                SIZE = 10

            // Deletes all from DB
            await usrRepo.deleteAll()

            // Act
            const models: PagedData<UserTenantDTO> = await usrRepo.page({
                pageIndex: PAGE,
                pageSize: SIZE,
                tenantId: '0',
            })

            // Assert
            expect(models.length).to.equal(0)
        })

        it('Should return specified number of items if there are more records in database', async () => {
            // Arrange
            const PAGE = 1,
                SIZE = 10,
                TOTAL = SIZE * 2
            const tenantId = cachedTenantId = idGen.nextBigInt().toString()

            // Deletes all from DB
            await usrRepo.deleteAll()

            const createJobs = []

            let model: UserTenantDTO
            for (let i = 0; i < TOTAL; i++) {
                model = new UserTenantDTO()
                model.id = idGen.nextBigInt().toString()
                model.tenantId = tenantId
                model.name = 'Hiri' + i
                model.age = Math.ceil(29 * Math.random())
                createJobs.push(usrRepo.create(model))
            }

            await Promise.all(createJobs)

            // Act
            const models: PagedData<UserTenantDTO> = await usrRepo.page({
                pageIndex: PAGE,
                pageSize: SIZE,
                tenantId: tenantId,
            })

            // Assert
            expect(models).to.be.not.null
            expect(models.length).to.be.equal(SIZE)
            expect(models.total).to.be.equal(TOTAL)
        })
    }) // END describe 'page'

    describe('countAll', () => {
        it('Should return a positive number if there are records in database.', async () => {
            // Act
            const count = await usrRepo.countAll({
                tenantId: cachedTenantId,
            })

            // Assert
            expect(count).to.be.greaterThan(0)
        })

        it('Should return 0 if there is no records in database.', async () => {
            // Deletes all from DB
            await usrRepo.deleteAll()

            // Act
            const count = await usrRepo.countAll({
                tenantId: cachedTenantId,
            })

            // Assert
            expect(count).to.equal(0)
        })
    }) // END describe 'count'

})
