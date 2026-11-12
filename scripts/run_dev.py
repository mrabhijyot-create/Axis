"""Convenience runner — start uvicorn for the FastAPI app."""
import uvicorn

from ipl.config import settings

if __name__ == "__main__":
    # Loopback unless IPL_API_HOST says otherwise; set IPL_API_TOKEN before
    # exposing the API to other machines.
    uvicorn.run("ipl.api.main:app", host=settings.ipl_api_host, port=8000, reload=True)
