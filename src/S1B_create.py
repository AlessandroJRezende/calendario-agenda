# (A) CARREGAR PACOTES
import sqlite3, os
from sqlite3 import Error

# (B) BANCO DE DADOS + ARQUIVO SQL
DBFILE = "events.db"
SQLFILE = "S1A_events.sql"

# (C) EXCLUIR BANCO DE DADOS ANTIGO SE EXISTIR
if os.path.exists(DBFILE):
  os.remove(DBFILE)

# (D) IMPORTAR SQL
conn = sqlite3.connect(DBFILE)
with open(SQLFILE) as f:
  conn.executescript(f.read())
conn.commit()
conn.close()
print("Database created!")