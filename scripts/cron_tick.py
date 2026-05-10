"""GitHub Actions / cron entry point. Real logic lives in `ipl.cron`."""
import sys

from ipl.cron import main

if __name__ == "__main__":
    sys.exit(main())
