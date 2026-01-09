#!/usr/bin/env python
from app.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
tables = inspector.get_table_names()

ddl_statements = []
for table_name in tables:
    columns = inspector.get_columns(table_name)
    pk_columns = inspector.get_pk_constraint(table_name)['constrained_columns']

    ddl = f"CREATE TABLE {table_name} (\n"
    column_defs = []

    for col in columns:
        col_def = f"    {col['name']} {col['type']}"
        if not col['nullable']:
            col_def += " NOT NULL"
        if col['name'] in pk_columns:
            col_def += " PRIMARY KEY"
        column_defs.append(col_def)

    ddl += ",\n".join(column_defs)
    ddl += "\n);\n\n"
    ddl_statements.append(ddl)

with open('schema.sql', 'w') as f:
    f.writelines(ddl_statements)

print("✓ Generated schema.sql")
