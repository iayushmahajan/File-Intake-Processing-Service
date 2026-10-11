# Import workspace

## Map a file and save a template

1. Choose a CSV. The importer inspects its headers and suggests matches for the 12 transaction fields.
2. Confirm each source column. Source columns must be unique across the mapping. Extra columns are ignored.
3. Optionally add allowed values, numeric bounds or a date format under **Additional validation rules**. Base transaction validation always applies; templates cannot disable it.
4. Save a new template, or save a new version of a selected template. A version check prevents one editor from overwriting a newer version unknowingly.
5. Select **Preview validation**, then **Upload and Analyze CSV**. Changing a mapping, rule or selected template invalidates the preview.

The preview checks the first 10 records and creates no processing job. Full-file validation and duplicate detection happen in the worker. Previewing a few valid rows is not a guarantee that the whole dataset is valid.

Every accepted job saves its exact mapping, rules and optional template ID/version. Updating a template affects future imports; historical jobs and their correction descendants use their saved configuration.

## Explore and correct results

For a completed import, the dataset explorer queries all persisted records, with pagination, value/error search, accepted/rejected filters and error-category filters. Click an error category in the Validation chart to open that filter. Sorting by a data field is alphabetical; record numbers sort numerically. Column visibility changes the view; the filtered export always includes all canonical fields.

**Export filtered CSV** uses the same search/status/category/sort selection and includes every matching record, regardless of the visible page. It exports mapped source values, status, original logical record number and error explanations. The existing **Cleaned CSV** download contains normalized accepted values.

Select **Correct record** to edit a rejected record. Invalid fields have explanations; duplicate errors apply to the whole record. Changes survive paging/filtering within the current workspace. **Undo this record** or **Undo all corrections** restores source values. Drafts are held in browser state until submitted and are not saved when navigating to another job or closing the workspace.

Select **Validate corrections** before **Reprocess corrected dataset**. This checks field and cross-field rules for edited records. Reprocessing reruns the full file, including duplicate detection and analytics, so a field-valid edit can still produce a rejected duplicate. Subsequent corrections can resolve it.

The child job shows accepted/rejected counts and quality score against its parent, with links to both jobs and a saved before/after change log. Original files, original analytics and original output reports are never overwritten.

## Persistence and worker safety

Migration `0003` adds three tables without altering existing jobs:

- `job_records`: canonical source values, normalized accepted values, structured issues and searchable text. Composite keys identify the job and logical CSV record; a job/status/record index supports filtering.
- `job_imports`: immutable mapping/rule snapshot, optional parent ID, cumulative corrections and the changes submitted for this revision.
- `import_templates`: named configuration and its current version. Job snapshots preserve prior versions used by imports.

A worker produces record data alongside the existing reports. The attempt-token check, record inserts, availability flag and final job/analytics changes commit in the same database transaction. Failed or superseded attempts cannot publish a partial record index. Record insertion failure leaves the job eligible for the existing lease recovery mechanism.

Each correction copies the original input to a new unique input filename, commits a new job plus dispatch intent and applies a cumulative correction overlay in the worker. The copied input remains the original source bytes; corrected canonical values are recorded in the index and generated reports. Workers never modify the parent job. Repeated correction submissions create separate child jobs, not overwrites.

Historical jobs without a record index remain readable and downloadable. Re-upload the original to use the explorer; the migration does not silently rebuild old analytics or change old outcomes.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/imports/preview` | Multipart file, optional `import_options` JSON; sample and mapping suggestions |
| GET / POST | `/api/v1/imports/templates` | List / create saved templates |
| PUT | `/api/v1/imports/templates/{id}` | Save a version using `expected_version` |
| POST | `/api/v1/uploads` | Existing upload plus optional `import_options` JSON form field |
| GET | `/api/v1/jobs/{id}/records` | Paginated record query |
| GET | `/api/v1/jobs/{id}/records/export` | Stream the full filtered result as CSV |
| POST | `/api/v1/jobs/{id}/corrections/validate` | Check proposed field changes without saving them |
| POST | `/api/v1/jobs/{id}/corrections` | Accept a new linked job; HTTP 202 |

Record queries accept `page`, `page_size` (1–100), `status` (`all`, `accepted`, `rejected`), `search`, `category`, `sort` and `direction`. Export uses the same filters and ordering and ignores pagination. Both endpoints require an available completed index.

Correction bodies use logical CSV record numbers, including the header as record 1:

```json
{"patches": {"3": {"email": "bob@example.com", "currency": "EUR"}}}
```

Only rejected records and known fields are editable. A batch supports up to 200 records, 10,000 characters per corrected cell and 1 MiB of supplied values. Cumulative correction JSON cannot exceed the configured upload limit. Rows with mismatched column counts require source-file repair; filling a cell cannot remove an extra CSV column.

Mapping headers are limited to 100 source columns and 200 characters per name. Rule configuration is declarative: no custom Python, SQL or expressions. Optional AI summaries retain the existing aggregate-only allowlist and do not include correction values or row records.

This remains a local single-operator application. All records are persisted for exploration, increasing database size. Processing remains bounded by the upload limit and retains in-memory row collections; this phase does not claim streaming analytics or unlimited-file scalability.

## Verification

Backend tests cover search beyond the old 100-row preview, export/filter consistency, correction validation, duplicate reevaluation, chained corrections, stale template versions, original preservation, migration preservation and atomic record publication. Browser tests exercise mapping, template reuse, editing, reprocessing, comparison and mobile layout. `scripts/verify_async_stack.py` also invokes `scripts/verify_import_workspace.py` against its disposable PostgreSQL/Redis/Celery stack.
