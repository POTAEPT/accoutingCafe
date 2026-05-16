Run one of the following to add is_cup columns:

1) SQL (psql):
   psql -d <your_db> -f backend/scripts/migrate_is_cup.sql

2) Node script:
   node backend/scripts/migrate_is_cup.js

If you already ran init_db.js after the latest changes, this is not required.
