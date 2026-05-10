"""Daily entry point: refresh ipl_schedule.json from CricAPI."""
import sys

from ipl.etl.fixtures import refresh

if __name__ == "__main__":
    n = refresh()
    print(f"refreshed {n} matches")
    sys.exit(0)
