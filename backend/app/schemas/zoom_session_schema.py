from pydantic import BaseModel, Field
from datetime import datetime

class ZoomSessionBase(BaseModel):
    id: int = Field(..., description="el id de la sesión de zoom")
    int_meeting_id = Field(..., description="el id de la reunión")
    str_zoom_session_id = Field(..., description="el id de la sesión de zoom")
    str_zoom_meeting_id = Field(..., description="el id de la reunión de zoom")
    str_zoom_uuid = Field(..., description="el uuid de la sesión de zoom")
    str_zoom_session_key = Field(..., description="la clave de la sesión de zoom")
    int_host_user_id = Field(..., description="el id del usuario host")
    bln_recording_enabled = Field(..., description="si la grabación está habilitada")
    bln_recording_consent_required = Field(..., description="si el consentimiento de grabación es requerido")
    int_max_participants = Field(..., description="el número máximo de participantes")
    int_total_unique_participants = Field(..., description="el número total de participantes únicos")
    int_session_duration_minutes = Field(..., description="la duración de la sesión de zoom")
    dat_session_started_at = Field(..., description="la fecha y hora de la sesión de zoom iniciada")
    dat_session_ended_at = Field(..., description="la fecha y hora de la sesión de zoom terminada")
    dat_recording_started_at = Field(..., description="la fecha y hora de la grabación iniciada")
    dat_recording_ended_at = Field(..., description="la fecha y hora de la grabación terminada")
    json_recording_files = Field(..., description="los archivos de la grabación")
    str_recording_password = Field(..., description="la contraseña de la grabación")
    str_recording_download_url = Field(..., description="la url de descarga de la grabación")
    json_zoom_report_data = Field(..., description="los datos de reporte de la sesión de zoom")
    json_participants_report = Field(..., description="el reporte de participantes de la sesión de zoom")

class ZoomSessionCreate(ZoomSessionBase):
    created_at: datetime = Field(..., description="la fecha y hora de la creación")

class ZoomSessionUpdate(ZoomSessionBase):
    updated_at: datetime = Field(..., description="la fecha y hora de la actualización")