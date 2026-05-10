"""Bulk-load every *.json file in the given directory into the local DB."""
from ipl.etl.cricsheet import cli_load

if __name__ == "__main__":
    cli_load()
