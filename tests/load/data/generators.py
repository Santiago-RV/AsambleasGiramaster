#!/usr/bin/env python3
"""
Generador de datos de prueba para pruebas de estrés
Uso: python generators.py --api-url http://localhost:8000 --count 1000
"""

import argparse
import requests
import random
import json
import time
import os
from datetime import datetime, timedelta

class DataGenerator:
    def __init__(self, api_url, count=1000):
        self.api_url = api_url
        self.api_version = '/api/v1'
        self.count = count
        self.admin_token = None
        self.residential_unit_id = None
        self.users_created = []
        self.meetings_created = []
        
    def login_admin(self):
        """Iniciar sesión como admin"""
        print("=== Iniciando sesión como admin ===")
        url = f"{self.api_url}{self.api_version}/auth/login"
        
        # OAuth2PasswordRequestForm espera datos en formato form-urlencoded
        # La contraseña por defecto del admin es "Super@dmin.12345"
        data = {
            "username": "admin",
            "password": "Super@dmin.12345"
        }
        
        try:
            response = requests.post(url, data=data, timeout=30)  # data= en lugar de json=
            if response.status_code == 200:
                self.admin_token = response.json().get('data', {}).get('access_token')
                if not self.admin_token:
                    self.admin_token = response.json().get('access_token')
                print(f"✓ Admin logueado exitosamente")
                return True
            else:
                print(f"✗ Error al hacer login: {response.status_code}")
                print(response.text)
                return False
        except Exception as e:
            print(f"✗ Error de conexión: {e}")
            return False
    
    def get_headers(self):
        """Obtener headers con autenticación"""
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.admin_token}'
        }
    
    def get_or_create_residential_unit(self):
        """Obtener o crear una unidad residencial de prueba"""
        print("=== Buscando unidad residencial ===")
        
        # La ruta correcta es /api/v1/residential/units
        url = f"{self.api_url}{self.api_version}/residential/units"
        
        try:
            response = requests.get(url, headers=self.get_headers(), timeout=30)
            print(f"GET residential/units response: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                units = data.get('data', []) if isinstance(data, dict) else []
                print(f"Unidades encontradas: {len(units)}")
                
                if units and len(units) > 0:
                    for unit in units:
                        if unit.get('id'):
                            self.residential_unit_id = unit['id']
                            print(f"✓ Usando unidad residencial existente ID: {self.residential_unit_id}")
                            return True
            
            # Crear nueva unidad
            print("=== Creando unidad residencial de prueba ===")
            
            admin_id = 1
            
            unit_data = {
                "str_residential_code": f"UR{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "str_name": f"Conjunto Prueba {datetime.now().strftime('%Y%m%d%H%M%S')}",
                "str_nit": f"900.{random.randint(100000, 999999)}-{random.randint(0, 9)}",
                "str_unit_type": "Conjunto Residencial",
                "int_total_apartments": 100,
                "str_address": "Dirección de prueba 123",
                "str_city": "Bogotá",
                "str_state": "Cundinamarca",
                "created_by": admin_id,
                "updated_by": admin_id,
            }
            
            # Endpoint correcto: /residential/create_unit
            create_url = f"{self.api_url}{self.api_version}/residential/create_unit"
            response = requests.post(create_url, json=unit_data, headers=self.get_headers(), timeout=30)
            print(f"POST create_unit response: {response.status_code}")
            print(f"Response: {response.text[:300]}")
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.residential_unit_id = data.get('data', {}).get('id') or data.get('id')
                print(f"✓ Unidad residencial creada ID: {self.residential_unit_id}")
                return True
            else:
                print(f"✗ No se pudo crear la unidad: {response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"✗ Error: {e}")
            return False
    
    def create_unit_admin(self):
        """Asignar administrador usando SQL directo"""
        print("=== Asignando administrador via SQL ===")
        
        # Credenciales de DB del proyecto
        db_host = 'localhost'
        db_user = 'develop_db'
        db_pass = 'Database_develop-user-2025'
        db_name = 'db_giramaster'
        
        # SQL para verificar si ya existe admin y si no asignar uno
        sql_check = f"""
SELECT ur.id, ur.int_user_id 
FROM tbl_user_residential_units ur
INNER JOIN tbl_users u ON ur.int_user_id = u.id
WHERE ur.int_residential_unit_id = {self.residential_unit_id} 
AND u.bln_allow_entry = 1
LIMIT 1;
"""
        
        try:
            # Verificar si ya existe admin
            result = os.popen(f"mysql -h {db_host} -u {db_user} -p'{db_pass}' {db_name} -N -e \"{sql_check}\"").read()
            
            if result.strip():
                print(f"✓ Ya existe un admin en la unidad")
                return True
            
            # Si no hay admin, buscar cualquier usuario en la unidad
            sql_user = f"""
SELECT ur.id, ur.int_user_id 
FROM tbl_user_residential_units ur
WHERE ur.int_residential_unit_id = {self.residential_unit_id}
LIMIT 1;
"""
            result = os.popen(f"mysql -h {db_host} -u {db_user} -p'{db_pass}' {db_name} -N -e \"{sql_user}\"").read()
            
            if result.strip():
                user_row_id = result.strip().split()[0]
                user_id = result.strip().split()[1]
                
                # Actualizar para que sea admin
                sql_update = f"UPDATE tbl_user_residential_units SET bool_is_admin = 1 WHERE id = {user_row_id};"
                os.popen(f"mysql -h {db_host} -u {db_user} -p'{db_pass}' {db_name} -N -e \"{sql_update}\"")
                
                sql_update_user = f"UPDATE tbl_users SET bln_allow_entry = 1, int_id_rol = 2 WHERE id = {user_id};"
                os.popen(f"mysql -h {db_host} -u {db_user} -p'{db_pass}' {db_name} -N -e \"{sql_update_user}\"")
                
                print(f"✓ Usuario {user_id} asignado como admin via SQL")
                return True
            
            # Si no hay usuarios en la unidad, usar usuario 1 (super admin)
            sql_assign = f"""
INSERT INTO tbl_user_residential_units 
(int_user_id, int_residential_unit_id, str_apartment_number, bool_is_admin, dec_default_voting_weight, created_at, updated_at)
VALUES (1, {self.residential_unit_id}, 'ADMIN', 1, 1.0, NOW(), NOW());
"""
            os.popen(f"mysql -h {db_host} -u {db_user} -p'{db_pass}' {db_name} -N -e \"{sql_assign}\"")
            
            sql_update_user = f"UPDATE tbl_users SET bln_allow_entry = 1, int_id_rol = 2 WHERE id = 1;"
            os.popen(f"mysql -h {db_host} -u {db_user} -p'{db_pass}' {db_name} -N -e \"{sql_update_user}\"")
            
            print(f"✓ Administrador asignado via SQL (user_id=1)")
            return True
            
        except Exception as e:
            print(f"✗ Error SQL: {e}")
            return True  # Continuar aunque falle
    
    def create_users(self):
        """Crear usuarios de prueba (copropietarios)"""
        print(f"=== Creando {self.count} usuarios de prueba ===")
        
        # La ruta correcta es /api/v1/residential/units/{unit_id}/residents
        url = f"{self.api_url}{self.api_version}/residential/units/{self.residential_unit_id}/residents"
        
        errores = 0
        
        # Crear usuarios (el administrador se crea por separado con create_unit_admin)
        for i in range(0, self.count):
            user_num = i + 1
            
            user_data = {
                "firstname": f"Usuario{user_num}",
                "lastname": f"Prueba{user_num}",
                "email": f"testuser{user_num}@example.com",
                "username": f"user_{user_num}",
                "apartment_number": f"{random.randint(1, 50)}{random.choice(['A', 'B', 'C', 'D'])}",
                "phone": f"+57{random.randint(3000000000, 3999999999)}"
            }
            
            try:
                response = requests.post(
                    url, 
                    json=user_data,
                    headers=self.get_headers(),
                    timeout=30
                )
                
                if response.status_code in [200, 201]:
                    self.users_created.append(user_data)
                    if user_num % 50 == 0:
                        print(f"✓ Creados {user_num} usuarios (total: {self.count})")
                else:
                    errores += 1
                    if errores <= 3:
                        print(f"✗ Error creando usuario {user_num}: {response.status_code}")
                        
            except Exception as e:
                errores += 1
                if errores <= 3:
                    print(f"✗ Error: {e}")
            
            time.sleep(0.3)
        
        print(f"✓ Total usuarios creados: {len(self.users_created)}")
        print(f"⚠️ Errores: {errores}")
        return len(self.users_created)
    
    def create_meetings(self):
        """Buscar reuniones existentes"""
        print("=== Buscando reuniones existentes ===")
        
        url = f"{self.api_url}{self.api_version}/meetings"
        
        try:
            response = requests.get(url, headers=self.get_headers(), timeout=30)
            if response.status_code == 200:
                data = response.json()
                meetings = data.get('data', []) if isinstance(data, dict) else []
                
                if meetings and len(meetings) > 0:
                    print(f"✓ Se encontraron {len(meetings)} reuniones existentes")
                    self.meetings_created = meetings[:5]  # Usar las primeras 5
                    return len(self.meetings_created)
                    
        except Exception as e:
            print(f"Error al buscar reuniones: {e}")
        
        # Si no hay reuniones, intentar crear
        print("=== Creando reuniones de prueba ===")
        
        meeting_count = 5
        url = f"{self.api_url}{self.api_version}/meetings"
        
        for i in range(meeting_count):
            days_ahead = random.randint(0, 7)
            meeting_date = datetime.now() + timedelta(days=days_ahead)
            
            meeting_data = {
                "int_id_residential_unit": self.residential_unit_id,
                "str_title": f"Asambleas de Prueba {i+1}",
                "str_description": f"Reunión de prueba número {i+1} para stress testing",
                "dat_schedule_date": meeting_date.isoformat(),
                "int_estimated_duration": random.choice([60, 90, 120]),
                "str_modality": random.choice(['virtual', 'presencial']),
                "str_meeting_type": "Ordinaria"
            }
            
            try:
                response = requests.post(
                    url, 
                    json=meeting_data,
                    headers=self.get_headers(),
                    timeout=30
                )
                
                if response.status_code in [200, 201]:
                    meeting = response.json().get('data', {})
                    self.meetings_created.append(meeting)
                    print(f"✓ Reunión creada: {meeting.get('str_title')} (ID: {meeting.get('id')})")
                else:
                    print(f"✗ Error creando reunión {i+1}: {response.status_code} - {response.text[:100]}")
                    
            except Exception as e:
                print(f"✗ Error: {e}")
        
        return len(self.meetings_created)
    
    def create_polls(self):
        """Crear encuestas de prueba para las reuniones"""
        print("=== Creando encuestas de prueba ===")
        
        poll_types = ['single', 'multiple', 'text', 'numeric']
        
        for meeting in self.meetings_created:
            meeting_id = meeting.get('id')
            if not meeting_id:
                continue
            
            # Crear 2-3 encuestas por reunión
            num_polls = random.randint(2, 3)
            
            for p in range(num_polls):
                poll_type = random.choice(poll_types)
                
                poll_data = {
                    "int_meeting_id": meeting_id,
                    "str_title": f"Encuesta {p+1} - {poll_type}",
                    "str_description": f"Encuesta de prueba tipo {poll_type}",
                    "str_poll_type": poll_type,
                    "bln_is_anonymous": random.choice([True, False]),
                    "bln_requires_quorum": random.choice([True, False]),
                    "bln_allows_abstention": True,
                }
                
                # Agregar opciones para tipos single/multiple
                if poll_type in ['single', 'multiple']:
                    poll_data["options"] = [
                        {"str_option_text": "Opción A", "int_option_order": 1},
                        {"str_option_text": "Opción B", "int_option_order": 2},
                        {"str_option_text": "Opción C", "int_option_order": 3},
                    ]
                    if poll_type == 'multiple':
                        poll_data["int_max_selections"] = 2
                
                try:
                    url = f"{self.api_url}{self.api_version}/polls"
                    response = requests.post(
                        url,
                        json=poll_data,
                        headers=self.get_headers(),
                        timeout=30
                    )
                    
                    if response.status_code in [200, 201]:
                        poll = response.json().get('data', {})
                        
                        # Iniciar algunas encuestas
                        if random.random() > 0.3:
                            start_url = f"{url}/{poll.get('id')}/start"
                            requests.post(start_url, headers=self.get_headers(), timeout=30)
                            print(f"✓ Encuesta creada e iniciada: {poll.get('str_title')}")
                        else:
                            print(f"✓ Encuesta creada: {poll.get('str_title')}")
                    else:
                        print(f"✗ Error creando encuesta: {response.status_code}")
                        
                except Exception as e:
                    print(f"✗ Error: {e}")
        
        print("✓ Encuestas creadas")
    
    def generate_invitations(self):
        """Crear invitaciones para usuarios a reuniones"""
        print("=== Creando invitaciones ===")
        
        for meeting in self.meetings_created:
            meeting_id = meeting.get('id')
            if not meeting_id:
                continue
            
            # Crear invitaciones para los primeros 100 usuarios
            invitations = []
            for i in range(min(100, len(self.users_created))):
                user = self.users_created[i]
                invitations.append({
                    "int_user_id": user.get('id', i + 1),
                    "str_apartment_number": user.get('apartment_number', f"{i+1}A"),
                    "bln_attended": False
                })
            
            try:
                url = f"{self.api_url}{self.api_version}/meetings/{meeting_id}/invitations/bulk"
                response = requests.post(
                    url,
                    json={"invitations": invitations},
                    headers=self.get_headers(),
                    timeout=60
                )
                
                if response.status_code in [200, 201]:
                    print(f"✓ {len(invitations)} invitaciones creadas para reunión {meeting_id}")
                else:
                    print(f"✗ Error creando invitaciones: {response.status_code}")
                    
            except Exception as e:
                print(f"✗ Error: {e}")
    
    def run(self):
        """Ejecutar generación de datos"""
        print("\n" + "="*50)
        print("GENERADOR DE DATOS DE PRUEBA")
        print("="*50)
        
        # 1. Login como admin
        if not self.login_admin():
            print("Error: No se pudo iniciar sesión")
            return False
        
        # 2. Obtener o crear unidad residencial
        if not self.get_or_create_residential_unit():
            print("Error: No se pudo obtener unidad residencial")
            return False
        
        # 3. Crear usuarios PRIMERO (incluye usuario 2)
        self.create_users()
        
        # 4. Asignar administrador DESPUÉS de crear usuarios
        self.create_unit_admin()
        
        # 5. Crear reuniones
        self.create_meetings()
        
        # 5. Crear encuestas
        self.create_polls()
        
        # 6. Crear invitaciones
        if self.users_created:
            self.generate_invitations()
        
        print("\n" + "="*50)
        print("RESUMEN")
        print("="*50)
        print(f"Usuarios creados: {len(self.users_created)}")
        print(f"Reuniones creadas: {len(self.meetings_created)}")
        print(f"Unidad residencial ID: {self.residential_unit_id}")
        print("\n✓ Datos de prueba generados exitosamente!")
        
        # Guardar info para pruebas
        info = {
            "api_url": self.api_url,
            "residential_unit_id": self.residential_unit_id,
            "user_count": len(self.users_created),
            "meeting_ids": [m.get('id') for m in self.meetings_created]
        }
        
        with open('test_data.json', 'w') as f:
            json.dump(info, f, indent=2)
        
        print("\nInfo guardada en test_data.json")
        return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generador de datos de prueba')
    parser.add_argument('--api-url', default='http://localhost:8001', help='URL de la API')
    parser.add_argument('--count', type=int, default=100, help='Cantidad de usuarios a crear')
    
    args = parser.parse_args()
    
    generator = DataGenerator(args.api_url, args.count)
    generator.run()
