import asyncio
import base64

from app.celery_app import celery_app
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

EXCEL_TASK_KEY = "excel_task"


@celery_app.task(bind=True, name='app.tasks.excel_tasks.process_excel_upload')
def process_excel_upload(self, file_content_b64: str, unit_id: int, created_by: int, task_id: str):
    """
    Procesa un archivo Excel de copropietarios en segundo plano.
    Actualiza progreso en Redis y despacha la tarea de emails al completar.
    """
    logger.info(f"📊 Iniciando Excel upload task: task_id={task_id}, unit_id={unit_id}")

    async def _run():
        import redis.asyncio as aioredis
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from app.services.residential_unit_service import ResidentialUnitService

        engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False, pool_pre_ping=True)
        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        r = await aioredis.from_url(settings.REDIS_URL)
        key = f"{EXCEL_TASK_KEY}:{task_id}"

        await r.hset(key, mapping={
            'phase': 'processing',
            'current': '0',
            'total': '0',
            'progress': '0',
            'status': 'processing',
            'successful': '0',
            'failed': '0',
            'email_task_id': '',
        })
        await r.expire(key, 7200)

        try:
            import pandas as pd
            import io as _io

            file_content = base64.b64decode(file_content_b64)

            # Obtener el total de filas antes de procesar para mostrarlo desde el inicio
            df_preview = pd.read_excel(_io.BytesIO(file_content))
            total_rows_count = len(df_preview)
            del df_preview

            await r.hset(key, mapping={
                'total': str(total_rows_count),
                'progress': '1',  # sliver visible desde el inicio
            })
            await r.expire(key, 7200)

            async def on_progress(current: int, total: int):
                pct = int((current / total) * 100) if total > 0 else 0
                await r.hset(key, mapping={
                    'current': str(current),
                    'total': str(total),
                    'progress': str(pct),
                    'status': 'processing',
                    'phase': 'processing',
                })
                await r.expire(key, 7200)

            async with async_session_maker() as db:
                service = ResidentialUnitService(db)
                results = await service.process_residents_excel_file(
                    file_content=file_content,
                    unit_id=unit_id,
                    created_by=created_by,
                    progress_callback=on_progress,
                )

            await r.hset(key, mapping={
                'phase': 'completed',
                'status': 'completed',
                'current': str(results['total_rows']),
                'total': str(results['total_rows']),
                'progress': '100',
                'successful': str(results['successful']),
                'failed': str(results['failed']),
                'email_task_id': '',
            })
            await r.expire(key, 7200)
            logger.info(f"✅ Excel task completada: task_id={task_id}, exitosos={results['successful']}, fallidos={results['failed']}")

        except Exception as e:
            logger.error(f"❌ Error en Excel task {task_id}: {str(e)}")
            await r.hset(key, mapping={
                'phase': 'failed',
                'status': 'failed',
                'progress': '0',
                'error_msg': str(e)[:500],
            })
            await r.expire(key, 3600)
        finally:
            await r.close()
            await engine.dispose()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_run())
    finally:
        loop.close()
