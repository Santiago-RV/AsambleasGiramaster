from datetime import datetime
import pytz

COLOMBIA_TZ = pytz.timezone("America/Bogota")


def colombia_now() -> datetime:
    """Retorna la hora actual en zona horaria Colombia/Lima (UTC-5) como datetime naive."""
    return datetime.now(COLOMBIA_TZ).replace(tzinfo=None)
