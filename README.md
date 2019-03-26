# Micro Fleet - Backend Persistence library

Belongs to Micro Fleet framework, provides base repository class with pre-implemented CRUD operations.

## INSTALLATION

- Stable version: `npm i @micro-fleet/persistence`
- Edge (development) version: `npm i git://github.com/gennovative/micro-fleet-persistence.git`

## DEVELOPMENT

  ### TRANSPILE CODE
  - Install packages in `peerDependencies` section with command `npm i --no-save {package name}@{version}`
  - `npm run build` to transpile TypeScript then run unit tests (if any) (equiv. `npm run compile` + `npm run test` (if any)).
  - `npm run compile`: To transpile TypeScript into JavaScript.
  - `npm run watch`: To transpile without running unit tests, then watch for changes in *.ts files and re-transpile on save.
  - `npm run test`: To run unit tests.
    * After tests finish, open file `/coverage/index.html` with a web browser to see the code coverage report which is mapped to TypeScript code.

  ### CREATE UNIT TEST DATABASE
  - One of the quickest ways to set up the test environment is to use Docker:

    `docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:9.6-alpine`

  - Create a database name `unittest-persistence`. If you want to change the name as well as database credentials, edit file `/src/test/database-details.ts` then execute `npm run compile`.
  - Install knex globally: `npm i -g knex`
  - Jump to database migration folder: `cd database`
  - Execute: `knex migrate:latest`
  - Note:
    * Existing tables are dropped.
    * If you want to re-run migration script, truncate all rows in `knex_migrations` table in database.

## RELEASE

- `npm run release`: To transpile and create `app.d.ts` definition file.
- **Note:** Please commit transpiled code in folder `dist` and definition file `app.d.ts` relevant to the TypeScript version.