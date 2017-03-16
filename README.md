# Gennova backend persistence library

# INSTALLATION

`import 'automapper-ts';` only once in the entire program.

# Versions
## 1.0.0
- Converted `DatabaseAdapter` into `KnexDatabaseConnector` which supports executing same query on multiple database connections at the same time.
- `RepositoryBase` no longer couples with `objection` and `knex`.
- **Test coverage:** 100%

## 0.1.0
- EntityBase
- RepositoryBase