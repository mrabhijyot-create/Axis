"""Create the SQLite schema at `data/ipl.db` (or wherever IPL_DB_URL points)."""
from ipl.db.session import cli_init

if __name__ == "__main__":
    cli_init()
