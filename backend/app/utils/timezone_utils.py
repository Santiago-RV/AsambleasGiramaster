from datetime import datetime
import pytz

COLOMBIA_TZ = pytz.timezone("America/Bogota")


def colombia_now() -> datetime:
    """Retorna la hora actual en zona horaria Colombia/Lima (UTC-5) como datetime naive."""
    return datetime.now(COLOMBIA_TZ).replace(tzinfo=None)


def utc_to_colombia(dt: datetime) -> datetime:
    """
    Convierte un datetime UTC (naive o aware) a hora Colombia como datetime naive.
    Necesario para comparar fechas provenientes de JWT (que usan UTC) contra las
    columnas de BD, que se guardan en hora Colombia vía colombia_now().
    """
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    return dt.astimezone(COLOMBIA_TZ).replace(tzinfo=None)
