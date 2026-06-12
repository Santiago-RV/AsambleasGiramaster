import asyncio
from app.celery_app import celery_app
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

COOWNER_TASK_KEY = "coowner_task"
BATCH_SIZE = 50


@celery_app.task(bind=True, name='app.tasks.coowner_tasks.bulk_toggle_access_task')
def bulk_toggle_access_task(self, user_ids: list, unit_id: int, enabled: bool, created_by: int, task_id: str, frontend_url: str = None):
    logger.info(f"🔄 bulk_toggle_access_task iniciada: task_id={task_id}, unit_id={unit_id}, enabled={enabled}, count={len(user_ids)}")

    async def _run():
        import redis.asyncio as aioredis
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy import select, and_, delete
        from app.models.user_model import UserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel
        from app.models.meeting_model import MeetingModel
        from app.models.meeting_invitation_model import MeetingInvitationModel
        from app.utils.timezone_utils import colombia_now
        from decimal import Decimal
        import uuid as _uuid

        engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False, pool_pre_ping=True)
        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        r = await aioredis.from_url(settings.REDIS_URL)
        key = f"{COOWNER_TASK_KEY}:{task_id}"
        total = len(user_ids)

        await r.hset(key, mapping={
            'status': 'processing',
            'current': '0',
            'total': str(total),
            'progress': '1',
            'successful': '0',
            'failed': '0',
            'already_in_state': '0',
        })
        await r.expire(key, 7200)

        successful = 0
        failed = 0
        already_in_state = 0
        active_meeting_id = None
        programmed_meeting_ids = []

        try:
            # Buscar reunión activa una sola vez (solo si habilitamos)
            if enabled:
                async with async_session_maker() as db:
                    meeting_result = await db.execute(
                        select(MeetingModel).where(
                            and_(
                                MeetingModel.int_id_residential_unit == unit_id,
                                MeetingModel.str_status.in_(["Programada", "En Curso"])
                            )
                        )
                    )
                    active_meeting = meeting_result.scalars().first()
                    if active_meeting:
                        active_meeting_id = active_meeting.id
                        logger.info(f"📋 Reunión activa encontrada: meeting_id={active_meeting_id}")

            if not enabled:
                async with async_session_maker() as db:
                    result = await db.execute(
                        select(MeetingModel.id).where(
                            and_(
                                MeetingModel.int_id_residential_unit == unit_id,
                                MeetingModel.str_status == "Programada"
                            )
                        )
                    )
                    programmed_meeting_ids = [row[0] for row in result.all()]
                    if programmed_meeting_ids:
                        logger.info(f"📋 Reuniones programadas a limpiar: {programmed_meeting_ids}")

            # Procesar en batches
            email_task_id = ''
            all_to_email = []
            for batch_start in range(0, total, BATCH_SIZE):
                batch = user_ids[batch_start:batch_start + BATCH_SIZE]
                batch_new_invitations = []
                batch_to_email = []
                batch_removed_invitations = []

                async with async_session_maker() as db:
                    for uid in batch:
                        try:
                            result = await db.execute(
                                select(UserModel, UserResidentialUnitModel)
                                .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                                .where(
                                    and_(
                                        UserModel.id == uid,
                                        UserResidentialUnitModel.int_residential_unit_id == unit_id
                                    )
                                )
                            )
                            row = result.first()
                            if not row:
                                failed += 1
                                continue

                            user, user_unit = row

                            if user.bln_allow_entry == enabled:
                                already_in_state += 1
                                continue

                            user.bln_allow_entry = enabled
                            user.updated_at = colombia_now()

                            if not enabled and programmed_meeting_ids:
                                await db.execute(
                                    delete(MeetingInvitationModel).where(
                                        and_(
                                            MeetingInvitationModel.int_meeting_id.in_(programmed_meeting_ids),
                                            MeetingInvitationModel.int_user_id == uid
                                        )
                                    )
                                )
                                batch_removed_invitations.append(uid)

                            if enabled and active_meeting_id:
                                existing = await db.execute(
                                    select(MeetingInvitationModel).where(
                                        and_(
                                            MeetingInvitationModel.int_meeting_id == active_meeting_id,
                                            MeetingInvitationModel.int_user_id == uid
                                        )
                                    )
                                )
                                if not existing.scalar_one_or_none():
                                    is_admin_no_apt = user_unit.bool_is_admin and not user_unit.str_apartment_number
                                    quorum_val = Decimal("0") if is_admin_no_apt else (user_unit.dec_default_voting_weight or Decimal("0"))
                                    apt_number = "ADMIN" if is_admin_no_apt else (user_unit.str_apartment_number or "N/A")

                                    inv = MeetingInvitationModel(
                                        int_meeting_id=active_meeting_id,
                                        int_user_id=uid,
                                        dec_voting_weight=quorum_val,
                                        dec_quorum_base=quorum_val,
                                        str_apartment_number=apt_number,
                                        str_invitation_status="pending",
                                        str_response_status="no_response",
                                        dat_sent_at=colombia_now(),
                                        int_delivery_attemps=0,
                                        bln_will_attend=False,
                                        bln_actually_attended=False,
                                        created_by=created_by,
                                        updated_by=created_by
                                    )
                                    db.add(inv)
                                    batch_new_invitations.append(uid)

                                batch_to_email.append(uid)

                            successful += 1

                        except Exception as e:
                            logger.warning(f"⚠️ Error procesando user_id={uid}: {e}")
                            failed += 1

                    await db.commit()

                # Decrementar contador en reuniones programadas por invitaciones eliminadas
                if batch_removed_invitations and programmed_meeting_ids:
                    async with async_session_maker() as upd_db:
                        for mid in programmed_meeting_ids:
                            mtg = await upd_db.get(MeetingModel, mid)
                            if mtg and mtg.int_total_invitated:
                                mtg.int_total_invitated = max(0, mtg.int_total_invitated - len(batch_removed_invitations))
                        await upd_db.commit()

                # Actualizar contador de invitados solo para invitaciones nuevas
                if batch_new_invitations and active_meeting_id:
                    async with async_session_maker() as upd_db:
                        mtg = await upd_db.get(MeetingModel, active_meeting_id)
                        if mtg:
                            mtg.int_total_invitated = (mtg.int_total_invitated or 0) + len(batch_new_invitations)
                            await upd_db.commit()

                if batch_to_email:
                    all_to_email.extend(batch_to_email)

                # Actualizar progreso
                processed = batch_start + len(batch)
                pct = max(1, int((processed / total) * 100)) if total > 0 else 100
                await r.hset(key, mapping={
                    'current': str(processed),
                    'progress': str(pct),
                    'successful': str(successful),
                    'failed': str(failed),
                    'already_in_state': str(already_in_state),
                })
                await r.expire(key, 7200)

            # Encolar correos para todos los habilitados (una sola tarea al final)
            if enabled and active_meeting_id and all_to_email and frontend_url:
                email_task_id = str(_uuid.uuid4())
                try:
                    celery_app.send_task(
                        'app.tasks.email_tasks.send_meeting_invitations',
                        args=[active_meeting_id, email_task_id, frontend_url, all_to_email],
                        task_id=email_task_id,
                        queue='email_tasks'
                    )
                    logger.info(f"📧 Correos encolados para {len(all_to_email)} usuario(s), meeting_id={active_meeting_id}, email_task_id={email_task_id}")
                except Exception as e:
                    logger.warning(f"⚠️ No se pudo encolar correos: {e}")
            elif enabled and all_to_email and not frontend_url:
                logger.warning(f"⚠️ {len(all_to_email)} usuario(s) sin correo — frontend_url no proporcionado")

            await r.hset(key, mapping={
                'status': 'completed',
                'progress': '100',
                'successful': str(successful),
                'failed': str(failed),
                'already_in_state': str(already_in_state),
                'email_task_id': email_task_id,
                'active_meeting_id': str(active_meeting_id) if active_meeting_id else '',
            })
            await r.expire(key, 7200)
            logger.info(f"✅ bulk_toggle_access_task completada: task_id={task_id}, exitosos={successful}, fallidos={failed}")

        except Exception as e:
            logger.error(f"❌ Error en bulk_toggle_access_task {task_id}: {e}")
            await r.hset(key, mapping={
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


@celery_app.task(bind=True, name='app.tasks.coowner_tasks.bulk_delete_task')
def bulk_delete_task(self, user_ids: list, unit_id: int, deleting_user_role: int, task_id: str):
    logger.info(f"🗑️ bulk_delete_task iniciada: task_id={task_id}, unit_id={unit_id}, count={len(user_ids)}")

    async def _run():
        import redis.asyncio as aioredis
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy import select, delete, and_
        from app.models.user_model import UserModel
        from app.models.data_user_model import DataUserModel
        from app.models.user_residential_unit_model import UserResidentialUnitModel

        engine = create_async_engine(settings.ASYNC_DATABASE_URL, echo=False, pool_pre_ping=True)
        async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        r = await aioredis.from_url(settings.REDIS_URL)
        key = f"{COOWNER_TASK_KEY}:{task_id}"
        total = len(user_ids)

        await r.hset(key, mapping={
            'status': 'processing',
            'current': '0',
            'total': str(total),
            'progress': '1',
            'successful': '0',
            'failed': '0',
        })
        await r.expire(key, 7200)

        successful = 0
        failed = 0

        try:
            for batch_start in range(0, total, BATCH_SIZE):
                batch = user_ids[batch_start:batch_start + BATCH_SIZE]

                async with async_session_maker() as db:
                    for uid in batch:
                        try:
                            result = await db.execute(
                                select(UserModel, UserResidentialUnitModel)
                                .join(UserResidentialUnitModel, UserModel.id == UserResidentialUnitModel.int_user_id)
                                .where(
                                    and_(
                                        UserModel.id == uid,
                                        UserResidentialUnitModel.int_residential_unit_id == unit_id
                                    )
                                )
                            )
                            row = result.first()
                            if not row:
                                failed += 1
                                continue

                            user, user_unit = row

                            # Solo SuperAdmin puede eliminar admins
                            is_target_admin = user_unit.bool_is_admin or (user.int_id_rol == 2)
                            if is_target_admin and deleting_user_role != 1:
                                failed += 1
                                continue

                            data_user_id = user.int_data_user_id

                            await db.execute(
                                delete(UserResidentialUnitModel).where(
                                    and_(
                                        UserResidentialUnitModel.int_user_id == uid,
                                        UserResidentialUnitModel.int_residential_unit_id == unit_id
                                    )
                                )
                            )
                            await db.execute(delete(UserModel).where(UserModel.id == uid))
                            if data_user_id:
                                await db.execute(delete(DataUserModel).where(DataUserModel.id == data_user_id))
                            successful += 1

                        except Exception as e:
                            logger.warning(f"⚠️ Error eliminando user_id={uid}: {e}")
                            failed += 1

                    await db.commit()

                # Actualizar progreso
                processed = batch_start + len(batch)
                pct = max(1, int((processed / total) * 100)) if total > 0 else 100
                await r.hset(key, mapping={
                    'current': str(processed),
                    'progress': str(pct),
                    'successful': str(successful),
                    'failed': str(failed),
                })
                await r.expire(key, 7200)

            await r.hset(key, mapping={
                'status': 'completed',
                'progress': '100',
                'successful': str(successful),
                'failed': str(failed),
            })
            await r.expire(key, 7200)
            logger.info(f"✅ bulk_delete_task completada: task_id={task_id}, exitosos={successful}, fallidos={failed}")

        except Exception as e:
            logger.error(f"❌ Error en bulk_delete_task {task_id}: {e}")
            await r.hset(key, mapping={
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
