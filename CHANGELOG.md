## VERSIONS

### 2.1.0 (Coming soon)
- **RepositoryBase** will supports version controlling.

### 2.0.5

### 2.0.4

### 2.0.3
- Converted from internal project to Github one.
- Removed support for multiple connections. From now on, each instance of database connector only manages one connection.

### 2.0.2
- Set `utcNow` as public.
- Handles `createdAt` and `updatedAt`.

### 2.0.1
- Decorated **RepositoryBase** with @unmanaged annotation.

### 2.0.0

- [Breaking change] **RepositoryBase** now supports batch operations and multi-tenancy.
- **RepositoryBase** unit tests provide generated IDs instead of auto-increment database IDs.
- **DatabaseAddOn**: moved from `back-lib-foundation`.
- Moved **IConnectionDetail** to `back-lib-common-contracts`.
- **AtomicSessionFlow** rejects with error when no named connection is found.

### 1.0.0

- Converted **DatabaseAdapter** into **KnexDatabaseConnector** which supports executing same query on multiple database connections at the same time.
- **RepositoryBase** no longer couples with `objection` and `knex`.
- Makes sure all date values loaded from database are converted as UTC format.
- **AtomicSessionFactory**, **AtomicSessionFlow** (use with **AtomicSession**): supports transactional queries to provide atomic operation. Their unittests are skipped, read the `console.warn(...)` in the unittest before running.
- **Test coverage:** 100%

### 0.1.0
- EntityBase
- RepositoryBase