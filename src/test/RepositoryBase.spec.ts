import 'reflect-metadata';
import 'automapper-ts'; // Singleton
import { expect } from 'chai';
import * as moment from 'moment';

import { InvalidArgumentException } from 'back-lib-common-util';
import { PagedArray } from 'back-lib-common-contracts';

import { RepositoryBase, EntityBase, QueryCallback, IDatabaseConnector,
		KnexDatabaseConnector, DbClient } from '../app';


const CONN_FILE = `${process.cwd()}/database-adapter-test.sqlite`,
	CONN_FILE_2 = `${process.cwd()}/database-adapter-test-second.sqlite`,
	// For SQLite3 file
	DB_TABLE = 'userdata',

	// For PostgreSQL
	//DB_TABLE = 'gennova.userdata',

	IMPOSSIBLE_ID = '0';


// Should put this in Types.ts
const TYPE_USER_DTO = Symbol('UserDTO'),
	TYPE_USER_ENT = Symbol('UserEntity');

class UserDTO implements IModelDTO {
	// NOTE: Class variales must be initialized, otherwise they
	// will disappear in transpiled code.
	public id: BigSInt = undefined;
	public name: string = undefined;
	public age: number = undefined;
	public deleted_at: number = undefined;
}

class UserEntity extends EntityBase {
	/* override */ static get tableName(): string {
		return DB_TABLE;
	}

	// NOTE: Class variales must be initialized, otherwise they
	// will disappear in transpiled code.
	public name: string = undefined;
	public age: number = undefined;
	public deleted_at: number = undefined;
}

class UserRepo extends RepositoryBase<UserEntity, UserDTO> {
	
	constructor(
		modelMapper: AutoMapper,
		dbConnector: IDatabaseConnector
	) {
		super(modelMapper, dbConnector);
	}

	/**
	 * @override
	 */
	protected prepare<UserEntity>(callback: QueryCallback<UserEntity>, ...names: string[]): Promise<any>[] {
		return this._dbConnector.prepare(UserEntity, <any>callback, ...names);
	}

	/**
	 * @override
	 */
	protected createModelMap(): void {
		let mapper = this._modelMapper;
		mapper.createMap(UserDTO, UserEntity);
		mapper.createMap(UserEntity, UserDTO);
			// Ignores all properties that UserEntity has but UserDTO doesn't.
			//.convertToType(UserDTO);
	}

	/**
	 * @override
	 */
	protected toEntity(from: UserDTO | UserDTO[]): UserEntity & UserEntity[] {
		return this._modelMapper.map(UserDTO, UserEntity, from);
							// (DTO)===^         ^===(Entity)
	}

	/**
	 * @override
	 */
	protected toDTO(from: UserEntity | UserEntity[]): UserDTO & UserDTO[] {
		return this._modelMapper.map(UserEntity, UserDTO, from);
							// (Entity)===^         ^===(DTO)
								// Be EXTREMELY careful! It's very easy to make mistake here!
	}
}

let cachedDTO: UserDTO,
	dbConnector: IDatabaseConnector;

// Commented. Because these tests make real connection to SqlLite file.
// Change `describe.skip(...)` to `describe(...)` to enable these tests.
describe('RepositoryBase', () => {
	
	beforeEach('Initialize db adapter', () => {
		dbConnector = new KnexDatabaseConnector();
		dbConnector.addConnection({
			// // For SQLite3 file
			clientName: DbClient.SQLITE3,
			fileName: CONN_FILE,

			// // For PostgreSQL
			// clientName: DbClient.POSTGRESQL,
			// host: {
			// 	address: 'localhost',
			// 	user: 'postgres',
			// 	password: 'postgres',
			// 	database: 'unittest',
			// }
		});
	});

	afterEach('Tear down db adapter', async () => {
		await dbConnector.dispose();
		dbConnector = null;
	});

	describe('create', () => {
		it('should insert a row to database', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector),
				model = new UserDTO();
			model.name = 'Hiri';
			model.age = 29;

			// Act
			let createdDTO: UserDTO = cachedDTO = await usrRepo.create(model);

			// Assert
			expect(createdDTO).to.be.not.null;
			expect(+createdDTO.id).to.be.greaterThan(0); // Need parse to int, because Postgres returns bigint as string.
			expect(createdDTO.name).to.equal(model.name);
			expect(createdDTO.age).to.equal(model.age);
		});
		
		it('should throw error if not success on all connections', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector),
				model = new UserDTO();
			model.name = 'Hiri';
			model.age = 29;

			dbConnector.addConnection({
				clientName: DbClient.SQLITE3,
				fileName: CONN_FILE_2,
			});

			// Act
			try {
				let createdDTO: UserDTO = await usrRepo.create(model);
				expect(createdDTO).to.be.null;
			} catch (ex) {
				expect(ex).to.be.not.null;
			}
		});
	}); // END describe 'create'

	describe('find', () => {
		it('should return an model instance if found', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector);
			
			// Act
			let foundDTO: UserDTO = await usrRepo.find(cachedDTO.id);
			
			// Assert
			expect(foundDTO).to.be.not.null;
			expect(foundDTO.id).to.equal(cachedDTO.id);
			expect(foundDTO.name).to.equal(cachedDTO.name);
			expect(foundDTO.age).to.equal(cachedDTO.age);
		});
		
		it('should return `undefined` if not found', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector);
			
			// Act
			let model: UserDTO = await usrRepo.find(IMPOSSIBLE_ID);
			
			// Assert
			expect(model).to.be.undefined;
		});
	}); // END describe 'find'

	describe('patch', () => {
		it('should return a possitive number if found', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector),
				newAge = 45;
			
			// Act
			let affectedRows: number = await usrRepo.patch({ id: cachedDTO.id, age: newAge}),
				refetchedDTO: UserDTO = await usrRepo.find(cachedDTO.id);
			
			// Assert
			expect(affectedRows).to.be.greaterThan(0);
			expect(refetchedDTO).to.be.not.null;
			expect(refetchedDTO.id).to.equal(cachedDTO.id);
			expect(refetchedDTO.name).to.equal(cachedDTO.name);
			expect(refetchedDTO.age).to.equal(newAge);
		});
		
		it('should return 0 if not found', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector),
				newAge = 45;
			
			// Act
			let affectedRows: number = await usrRepo.patch({ id: IMPOSSIBLE_ID, age: newAge}),
				refetchedDTO: UserDTO = await usrRepo.find(IMPOSSIBLE_ID);
			
			// Assert
			expect(affectedRows).to.equal(0);
			// If `patch` returns 0, but we actually find an entity with the id, then something is wrong.
			expect(refetchedDTO).to.be.undefined;
		});
		
		it('should throw exception if `id` is not provided', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector),
				newAge = 45;

			// Act
			let affectedRows = -1,
				exception = null;
			try {
				affectedRows = await usrRepo.patch({ age: newAge });
			} catch (ex) {
				exception = ex;
			}

			// Assert
			expect(affectedRows).to.equal(-1);
			expect(exception).to.be.an.instanceOf(InvalidArgumentException);
		});
	}); // END describe 'patch'

	describe('update', () => {
		it('should return a possitive number if found', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector),
				newName = 'Brian',
				updatedDTO: UserDTO = Object.assign(new UserDTO, cachedDTO);
			updatedDTO.name = newName;
			
			// Act
			let affectedRows: number = await usrRepo.update(<UserDTO>updatedDTO),
				refetchedDTO: UserDTO = await usrRepo.find(cachedDTO.id);
			
			// Assert
			expect(affectedRows).to.be.greaterThan(0);
			expect(refetchedDTO).to.be.not.null;
			expect(refetchedDTO.id).to.equal(cachedDTO.id);
			expect(refetchedDTO.name).to.equal(newName);
			expect(refetchedDTO.age).to.equal(cachedDTO.age);
		});
		
		it('should return 0 if not found', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector),
				newName = 'Brian',
				updatedDTO: UserDTO = Object.assign(new UserDTO, cachedDTO);
			updatedDTO.id = IMPOSSIBLE_ID;
			updatedDTO.name = newName;
			
			// Act
			let affectedRows: number = await usrRepo.update(<UserDTO>updatedDTO),
				refetchedDTO: UserDTO = await usrRepo.find(updatedDTO.id);
			
			// Assert
			expect(affectedRows).to.equal(0);
			// If `update` returns 0, but we actually find an entity with the id, then something is wrong.
			expect(refetchedDTO).to.be.undefined;
		});
		
		it('should throw exception if `id` is not provided', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector),
				newName = 'Brian',
				updatedDTO: UserDTO = Object.assign(new UserDTO, cachedDTO);
			delete updatedDTO.id;
			updatedDTO.name = newName;

			// Act
			let affectedRows = -1,
				exception = null;
			try {
				affectedRows = await usrRepo.update(<UserDTO>updatedDTO);
			} catch (ex) {
				exception = ex;
			}

			// Assert
			expect(affectedRows).to.equal(-1);
			expect(exception).to.be.an.instanceOf(InvalidArgumentException);
		});
	}); // END describe 'update'

	describe('delete (soft)', () => {
		it('should return a possitive number and the record is still in database', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector),
				model = new UserDTO();
			
			usrRepo['_isSoftDelete'] = true; // Default

			model.name = 'Hiri';
			model.age = 29;

			cachedDTO = await usrRepo.create(model);

			// Act
			let affectedRows: number = await usrRepo.delete(cachedDTO.id),
				refetchedDTO: UserDTO = await usrRepo.find(cachedDTO.id);
			
			// Assert
			expect(affectedRows).to.be.greaterThan(0);
			// If `delete` is successful, we must be able to still find that entity with the id.
			expect(refetchedDTO).to.exist;
			expect(refetchedDTO.deleted_at).to.exist;
		});
	});

	describe('delete (hard)', () => {
		it('should return a possitive number if found', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector);
			usrRepo['_isSoftDelete'] = false;
			
			// Act
			let affectedRows: number = await usrRepo.delete(cachedDTO.id),
				refetchedDTO: UserDTO = await usrRepo.find(cachedDTO.id);
			
			// Assert
			expect(affectedRows).to.be.greaterThan(0);
			// If `delete` is successful, but we still find an entity with the id, then something is wrong.
			expect(refetchedDTO).to.be.undefined;
		});
		
		it('should return 0 if not found', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector);
			
			// Act
			let affectedRows: number = await usrRepo.delete(IMPOSSIBLE_ID),
				refetchedDTO: UserDTO = await usrRepo.find(IMPOSSIBLE_ID);
			
			// Assert
			expect(affectedRows).to.equal(0);
			// If `delete` returns 0, but we actually find an entity with the id, then something is wrong.
			expect(refetchedDTO).to.be.undefined;
		});		
	}); // END describe 'delete'
	
	describe('page', () => {
		it('Should return `null` if there is no records', async () => {
			// Arrange
			const PAGE = 1,
				SIZE = 10;
			let usrRepo = new UserRepo(automapper, dbConnector);

			// Deletes all from DB
			await Promise.all(usrRepo['prepare'](query => query.delete()));

			// Act
			let models: PagedArray<UserDTO> = await usrRepo.page(PAGE, SIZE);
			
			// Assert
			expect(models).to.be.null;
		});

		it('Should return specified number of items if there are more records in database', async () => {
			// Arrange
			const PAGE = 1,
				SIZE = 10,
				TOTAL = SIZE * 2;
			let usrRepo = new UserRepo(automapper, dbConnector),
				entity: UserDTO;

			// Deletes all from DB
			await Promise.all(usrRepo['prepare'](query => query.delete()));

			for (let i = 0; i < TOTAL; i++) {
				entity = new UserDTO();
				entity.name = 'Hiri' + i;
				entity.age = Math.ceil(29 * Math.random());
				await usrRepo.create(entity);
			}

			// Act
			let models: PagedArray<UserDTO> = await usrRepo.page(PAGE, SIZE);

			// Assert
			expect(models).to.be.not.null;
			expect(models.length).to.be.equal(SIZE);
			expect(models.total).to.be.equal(TOTAL);
		});
	}); // END describe 'page'

	describe('count', () => {
		it('Should return a positive number if there are records in database.', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector);

			// Act
			let count = await usrRepo.countAll();
			
			// Assert
			expect(count).to.be.greaterThan(0);
		});

		it('Should return 0 if there is no records in database.', async () => {
			// Arrange
			let usrRepo = new UserRepo(automapper, dbConnector);

			// Deletes all from DB
			await Promise.all(usrRepo['prepare'](query => query.delete()));

			// Act
			let count = await usrRepo.countAll();

			// Assert
			expect(count).to.equal(0);
		});
	}); // END describe 'count'

});