from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, SessionLocal
from app.routes.api import router
from app import crud

Base.metadata.create_all(engine)


def _migrate_pnr_index():
    """Older databases were created with a UNIQUE index on bookings.pnr, which breaks multi-seat bookings."""
    from sqlalchemy import inspect, text
    try:
        idx = [i for i in inspect(engine).get_indexes("bookings") if i["column_names"] == ["pnr"] and i.get("unique")]
        if idx:
            with engine.begin() as c:
                c.execute(text(f'DROP INDEX "{idx[0]["name"]}"'))
                c.execute(text("CREATE INDEX IF NOT EXISTS ix_bookings_pnr ON bookings (pnr)"))
    except Exception as e:  # never block startup on a migration hiccup
        print("pnr index migration skipped:", e)


_migrate_pnr_index()
with SessionLocal() as db: crud.seed(db)

app = FastAPI(
    title="RailEase",
    description=(
        "Railease is a seat reservation system for trains, allowing users to hold and book seats efficiently."
    ),
    version="1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True)
app.include_router(router)


def _friendly(err: dict) -> str:
    loc = [str(x) for x in err["loc"]]
    field = loc[-1].replace("_", " ")
    msg = err["msg"].removeprefix("Value error, ")
    who = ""
    if "passengers" in loc:  # e.g. ("body", "passengers", 1, "email") -> "Passenger 2: "
        i = loc.index("passengers")
        if i + 1 < len(loc) and loc[i + 1].isdigit():
            who = f"Passenger {int(loc[i + 1]) + 1}: "
    if err["type"] == "missing":
        return f"{who}{field.capitalize()} is required"
    if field == "email":
        return f"{who}Enter a valid email address"
    return f"{who}{msg}"


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "; ".join(_friendly(e) for e in exc.errors())})


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side. Please try again."})
