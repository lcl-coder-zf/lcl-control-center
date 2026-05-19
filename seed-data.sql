-- ============================================================
--  LCL Control Center — Datos de prueba (SQL plano)
-- ============================================================

-- Actualizar info de clientes principales
UPDATE companies SET sector='Transporte', city='Bogotá',      service_type='BASC',      contact_name='Carlos Díaz',    contact_phone='310 555 0001' WHERE name='Colfletar SAS';
UPDATE companies SET sector='Transporte', city='Medellín',    service_type='BASC',      contact_name='Andrea Jamar',   contact_phone='311 555 0002' WHERE name='Transportes Jamar';
UPDATE companies SET sector='Logística',  city='Cali',        service_type='ISO',       contact_name='Pedro Ruiz',     contact_phone='312 555 0003' WHERE name='Logisticar';
UPDATE companies SET sector='Comercio',   city='Bogotá',      service_type='SAGRILAFT', contact_name='María González', contact_phone='313 555 0004' WHERE name='ICONYK';
UPDATE companies SET sector='Inversiones',city='Bogotá',      service_type='PTEE',      contact_name='Juan Muvar',     contact_phone='314 555 0005' WHERE name='Inversiones Muvar';
UPDATE companies SET sector='Transporte', city='Barranquilla',service_type='BASC',      contact_name='Rosa Carga',     contact_phone='315 555 0006' WHERE name='Plus Carga';
UPDATE companies SET sector='Transporte', city='Bogotá',      service_type='SG-SST',    contact_name='Luis Acero',     contact_phone='316 555 0007' WHERE name='Cargaceros';
UPDATE companies SET sector='Comercio',   city='Cali',        service_type='BASC',      contact_name='Diana Zar',      contact_phone='317 555 0008' WHERE name='Colzar';

-- ============================================================
-- PROYECTOS
-- ============================================================
INSERT INTO projects (company_id, name, type, status, progress, responsible_id, start_date, end_date, value, paid, risks, next_action)
VALUES
  ((SELECT id FROM companies WHERE name='Colfletar SAS'        LIMIT 1), 'Implementación BASC 2026',       'BASC',      'activo',    65, (SELECT id FROM profiles WHERE full_name='Ximena Vega'   LIMIT 1), '2026-01-15','2026-06-30', 8500000, 5000000, 'Documentación de procesos incompleta',          'Reunión con gerencia el 20 de mayo'),
  ((SELECT id FROM companies WHERE name='Transportes Jamar'    LIMIT 1), 'Renovación Certificación BASC',  'BASC',      'activo',    80, (SELECT id FROM profiles WHERE full_name='Laura'         LIMIT 1), '2026-02-01','2026-05-31', 6000000, 6000000, NULL,                                            'Auditoría programada para el 28 de mayo'),
  ((SELECT id FROM companies WHERE name='Logisticar'           LIMIT 1), 'ISO 9001:2015 - Fase II',        'ISO',       'activo',    40, (SELECT id FROM profiles WHERE full_name='Camila Lopez'  LIMIT 1), '2026-03-01','2026-08-31',12000000, 4000000, 'Equipo con poca disponibilidad los viernes',    'Enviar checklist de documentos requeridos'),
  ((SELECT id FROM companies WHERE name='ICONYK'               LIMIT 1), 'SAGRILAFT Implementación',       'SAGRILAFT', 'activo',    30, (SELECT id FROM profiles WHERE full_name='Ximena Vega'   LIMIT 1), '2026-04-01','2026-07-15', 5500000, 2000000, NULL,                                            'Capacitación al equipo financiero pendiente'),
  ((SELECT id FROM companies WHERE name='Inversiones Muvar'    LIMIT 1), 'PTEE Programa de Transparencia', 'PTEE',      'activo',    55, (SELECT id FROM profiles WHERE full_name='Camila Lopez'  LIMIT 1), '2026-02-15','2026-06-15', 4800000, 2400000, 'Director de cumplimiento cambió recientemente', 'Actualizar matriz de riesgos'),
  ((SELECT id FROM companies WHERE name='Plus Carga'           LIMIT 1), 'Certificación BASC Plus Carga',  'BASC',      'pausado',   25, (SELECT id FROM profiles WHERE full_name='Ximena Vega'   LIMIT 1), '2026-01-10','2026-09-30', 7200000, 1800000, 'Cliente solicitó pausa por reestructuración',   'Retomar en junio según confirmación cliente'),
  ((SELECT id FROM companies WHERE name='Cargaceros'           LIMIT 1), 'SG-SST Implementación',          'SG-SST',    'activo',    70, (SELECT id FROM profiles WHERE full_name='Laura'         LIMIT 1), '2025-10-01','2026-05-20', 9000000, 9000000, NULL,                                            'Entregar informe final esta semana'),
  ((SELECT id FROM companies WHERE name='Colzar'               LIMIT 1), 'Auditoría Interna BASC Colzar',  'BASC',      'completado',100, (SELECT id FROM profiles WHERE full_name='Ximena Vega'  LIMIT 1), '2025-11-01','2026-03-15', 3500000, 3500000, NULL,                                            NULL);

-- ============================================================
-- TAREAS
-- ============================================================
INSERT INTO tasks (company_id, project_id, title, assigned_to, priority, status, due_date, created_by)
VALUES
-- Activas
  ((SELECT id FROM companies WHERE name='Colfletar SAS'     LIMIT 1), (SELECT id FROM projects WHERE name='Implementación BASC 2026'       LIMIT 1), 'Revisar manual de procedimientos BASC',        (SELECT id FROM profiles WHERE full_name='Ximena Vega'  LIMIT 1), 'alta',   'en_progreso', '2026-05-22', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Colfletar SAS'     LIMIT 1), (SELECT id FROM projects WHERE name='Implementación BASC 2026'       LIMIT 1), 'Capacitar al personal de seguridad',           (SELECT id FROM profiles WHERE full_name='Ximena Vega'  LIMIT 1), 'media',  'pendiente',   '2026-05-28', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Transportes Jamar' LIMIT 1), (SELECT id FROM projects WHERE name='Renovación Certificación BASC'  LIMIT 1), 'Preparar documentos para auditoría',           (SELECT id FROM profiles WHERE full_name='Laura'        LIMIT 1), 'critica','en_progreso', '2026-05-25', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Transportes Jamar' LIMIT 1), (SELECT id FROM projects WHERE name='Renovación Certificación BASC'  LIMIT 1), 'Verificar estado de proveedores críticos',      (SELECT id FROM profiles WHERE full_name='Laura'        LIMIT 1), 'alta',   'pendiente',   '2026-05-27', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Logisticar'        LIMIT 1), (SELECT id FROM projects WHERE name='ISO 9001:2015 - Fase II'        LIMIT 1), 'Levantar mapa de procesos ISO',                (SELECT id FROM profiles WHERE full_name='Camila Lopez' LIMIT 1), 'alta',   'pendiente',   '2026-06-05', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Logisticar'        LIMIT 1), (SELECT id FROM projects WHERE name='ISO 9001:2015 - Fase II'        LIMIT 1), 'Socializar política de calidad con el equipo',  (SELECT id FROM profiles WHERE full_name='Camila Lopez' LIMIT 1), 'media',  'pendiente',   '2026-06-12', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='ICONYK'            LIMIT 1), (SELECT id FROM projects WHERE name='SAGRILAFT Implementación'       LIMIT 1), 'Identificar PEPs en base de datos clientes',   (SELECT id FROM profiles WHERE full_name='Ximena Vega'  LIMIT 1), 'alta',   'en_progreso', '2026-05-26', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='ICONYK'            LIMIT 1), (SELECT id FROM projects WHERE name='SAGRILAFT Implementación'       LIMIT 1), 'Actualizar formulario vinculación clientes',    (SELECT id FROM profiles WHERE full_name='Ximena Vega'  LIMIT 1), 'media',  'pendiente',   '2026-05-30', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Inversiones Muvar' LIMIT 1), (SELECT id FROM projects WHERE name='PTEE Programa de Transparencia' LIMIT 1), 'Elaborar código de ética actualizado',          (SELECT id FROM profiles WHERE full_name='Camila Lopez' LIMIT 1), 'media',  'pendiente',   '2026-06-01', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Cargaceros'        LIMIT 1), (SELECT id FROM projects WHERE name='SG-SST Implementación'         LIMIT 1), 'Entregar informe final SG-SST',                (SELECT id FROM profiles WHERE full_name='Laura'        LIMIT 1), 'critica','pendiente',   '2026-05-18', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
-- Vencidas
  ((SELECT id FROM companies WHERE name='Colfletar SAS'     LIMIT 1), (SELECT id FROM projects WHERE name='Implementación BASC 2026'       LIMIT 1), 'Actualizar matriz de riesgos',                  (SELECT id FROM profiles WHERE full_name='Ximena Vega'  LIMIT 1), 'alta',   'vencida',     '2026-05-10', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Transportes Jamar' LIMIT 1), (SELECT id FROM projects WHERE name='Renovación Certificación BASC'  LIMIT 1), 'Enviar carta de compromiso gerencia',           (SELECT id FROM profiles WHERE full_name='Laura'        LIMIT 1), 'media',  'vencida',     '2026-05-08', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Logisticar'        LIMIT 1), (SELECT id FROM projects WHERE name='ISO 9001:2015 - Fase II'        LIMIT 1), 'Recopilar evidencias proceso de compras',       (SELECT id FROM profiles WHERE full_name='Camila Lopez' LIMIT 1), 'alta',   'vencida',     '2026-05-12', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
-- Completadas
  ((SELECT id FROM companies WHERE name='Cargaceros'        LIMIT 1), (SELECT id FROM projects WHERE name='SG-SST Implementación'         LIMIT 1), 'Diagnóstico inicial SG-SST',                   (SELECT id FROM profiles WHERE full_name='Laura'        LIMIT 1), 'alta',   'completada',  '2026-04-15', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Colzar'            LIMIT 1), (SELECT id FROM projects WHERE name='Auditoría Interna BASC Colzar' LIMIT 1), 'Revisión previa auditoría Colzar',             (SELECT id FROM profiles WHERE full_name='Ximena Vega'  LIMIT 1), 'media',  'completada',  '2026-03-10', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1));

-- ============================================================
-- VENCIMIENTOS
-- ============================================================
INSERT INTO calendar_events (company_id, project_id, title, type, due_date, alert_15, alert_7, alert_1, status)
VALUES
  ((SELECT id FROM companies WHERE name='Transportes Jamar' LIMIT 1), (SELECT id FROM projects WHERE name='Renovación Certificación BASC'  LIMIT 1), 'Auditoría BASC Transportes Jamar',        'auditoria',       '2026-05-28', true,  true,  true,  'pendiente'),
  ((SELECT id FROM companies WHERE name='Colfletar SAS'     LIMIT 1), (SELECT id FROM projects WHERE name='Implementación BASC 2026'       LIMIT 1), 'Entrega manual procedimientos Colfletar', 'entrega',         '2026-05-30', true,  true,  true,  'pendiente'),
  ((SELECT id FROM companies WHERE name='Logisticar'        LIMIT 1), (SELECT id FROM projects WHERE name='ISO 9001:2015 - Fase II'        LIMIT 1), 'Recertificación ISO 9001 Logisticar',     'recertificacion', '2026-07-15', true,  true,  false, 'pendiente'),
  ((SELECT id FROM companies WHERE name='ICONYK'            LIMIT 1), (SELECT id FROM projects WHERE name='SAGRILAFT Implementación'       LIMIT 1), 'Reporte SAGRILAFT Semestral ICONYK',      'reporte',         '2026-06-30', true,  false, false, 'pendiente'),
  ((SELECT id FROM companies WHERE name='Inversiones Muvar' LIMIT 1), (SELECT id FROM projects WHERE name='PTEE Programa de Transparencia' LIMIT 1), 'Entrega PTEE - Fase 1 Inv. Muvar',       'entrega',         '2026-06-15', true,  true,  true,  'pendiente'),
  ((SELECT id FROM companies WHERE name='Plus Carga'        LIMIT 1), NULL,                                                                          'Vencimiento póliza seguridad Plus Carga','vencimiento',     '2026-06-01', true,  true,  true,  'pendiente'),
  ((SELECT id FROM companies WHERE name='Cargaceros'        LIMIT 1), (SELECT id FROM projects WHERE name='SG-SST Implementación'         LIMIT 1), 'Cierre proyecto SG-SST Cargaceros',      'entrega',         '2026-05-20', true,  true,  true,  'pendiente'),
  ((SELECT id FROM companies WHERE name='Colzar'            LIMIT 1), NULL,                                                                          'Renovación registro Colzar',             'vencimiento',     '2026-05-05', true,  true,  true,  'vencido'),
  ((SELECT id FROM companies WHERE name='Cargaceros'        LIMIT 1), NULL,                                                                          'Diagnóstico inicial Cargaceros',         'entrega',         '2026-04-10', true,  true,  true,  'completado');

-- ============================================================
-- DOCUMENTOS
-- ============================================================
INSERT INTO documents (company_id, project_id, name, type, status, version, expires_at, uploaded_by)
VALUES
  ((SELECT id FROM companies WHERE name='Colfletar SAS'     LIMIT 1), (SELECT id FROM projects WHERE name='Implementación BASC 2026'       LIMIT 1), 'Manual de Seguridad BASC',               'Manual',        'aprobado',  '2.1', '2027-01-15', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Colfletar SAS'     LIMIT 1), (SELECT id FROM projects WHERE name='Implementación BASC 2026'       LIMIT 1), 'Política de Cadena de Custodia',         'Política',      'aprobado',  '1.3', '2026-12-31', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Transportes Jamar' LIMIT 1), (SELECT id FROM projects WHERE name='Renovación Certificación BASC'  LIMIT 1), 'Certificado BASC vigente',               'Certificado',   'aprobado',  '1.0', '2026-05-31', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Transportes Jamar' LIMIT 1), (SELECT id FROM projects WHERE name='Renovación Certificación BASC'  LIMIT 1), 'Acta de revisión gerencial',             'Acta',          'pendiente', '1.0', NULL,         (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Logisticar'        LIMIT 1), (SELECT id FROM projects WHERE name='ISO 9001:2015 - Fase II'        LIMIT 1), 'Manual de Calidad ISO 9001',             'Manual',        'pendiente', '3.0', NULL,         (SELECT id FROM profiles WHERE full_name='Camila Lopez' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Logisticar'        LIMIT 1), (SELECT id FROM projects WHERE name='ISO 9001:2015 - Fase II'        LIMIT 1), 'Procedimiento control de documentos',    'Procedimiento', 'aprobado',  '2.0', '2027-03-01', (SELECT id FROM profiles WHERE full_name='Camila Lopez' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='ICONYK'            LIMIT 1), (SELECT id FROM projects WHERE name='SAGRILAFT Implementación'       LIMIT 1), 'Formato Vinculación Clientes SAGRILAFT', 'Formato',       'aprobado',  '1.5', '2026-11-30', (SELECT id FROM profiles WHERE full_name='Ximena Vega' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='ICONYK'            LIMIT 1), (SELECT id FROM projects WHERE name='SAGRILAFT Implementación'       LIMIT 1), 'Política Prevención Lavado Activos',     'Política',      'pendiente', '2.0', NULL,         (SELECT id FROM profiles WHERE full_name='Ximena Vega' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Inversiones Muvar' LIMIT 1), (SELECT id FROM projects WHERE name='PTEE Programa de Transparencia' LIMIT 1), 'Código de Ética Empresarial',           'Política',      'pendiente', '1.0', NULL,         (SELECT id FROM profiles WHERE full_name='Camila Lopez' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Cargaceros'        LIMIT 1), (SELECT id FROM projects WHERE name='SG-SST Implementación'         LIMIT 1), 'Matriz de Peligros SG-SST',             'Formato',       'aprobado',  '4.0', '2026-10-01', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1)),
  ((SELECT id FROM companies WHERE name='Colzar'            LIMIT 1), NULL,                                                                          'Certificado BASC Colzar 2024',          'Certificado',   'vencido',   '1.0', '2025-12-31', (SELECT id FROM profiles WHERE full_name='Laura' LIMIT 1));
