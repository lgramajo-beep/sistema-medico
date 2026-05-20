-- ============================================================
-- SISTEMA MÉDICO IL GROUP — Esquema de Base de Datos
-- Ejecutar en: Supabase → SQL Editor → New Query → Pegar → Run
-- ============================================================

-- 1. Tabla de usuarios del sistema
CREATE TABLE usuarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT DEFAULT 'medico' CHECK (rol IN ('admin','medico')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de pacientes (ficha médica permanente)
CREATE TABLE pacientes (
  id TEXT PRIMARY KEY,  -- PM-2026-0001
  nombre TEXT NOT NULL,
  sexo TEXT CHECK (sexo IN ('M','F')),
  edad TEXT,
  residencia TEXT,
  telefono TEXT,
  puesto TEXT DEFAULT 'Piloto Profesional',
  talla TEXT,
  tipo_sangre TEXT DEFAULT 'No refiere',
  alergias TEXT DEFAULT '',
  medicamentos TEXT DEFAULT '',
  cirugias TEXT DEFAULT '',
  condiciones_cronicas TEXT DEFAULT '',
  aptitud TEXT DEFAULT 'Apto' CHECK (aptitud IN ('Apto','No Apto','Condicionado')),
  aptitud_vence TEXT,
  ingresado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de visitas (historial médico)
CREATE TABLE visitas (
  vid TEXT PRIMARY KEY,  -- V0001
  paciente_id TEXT REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL,
  peso TEXT,
  presion_s TEXT,
  presion_d TEXT,
  fr TEXT DEFAULT '20',
  pulso TEXT,
  temp TEXT DEFAULT '36.5',
  oxigeno TEXT,
  ritmo TEXT,
  glucosa TEXT,
  glucosa_tipo TEXT DEFAULT 'postprandial',
  garganta TEXT DEFAULT 'Saludable',
  vision TEXT DEFAULT 'Saludable',
  auditiva TEXT DEFAULT 'Saludable',
  pulmones TEXT DEFAULT 'Normal',
  abdomen TEXT DEFAULT 'Flexible',
  extremidades TEXT DEFAULT 'Simétricas',
  vertigo TEXT DEFAULT 'Saludable',
  convulsiones TEXT DEFAULT 'Saludable',
  fuma TEXT DEFAULT 'No',
  drogas TEXT DEFAULT 'Negativo',
  info_general TEXT DEFAULT '',
  recomendaciones TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  covid_pts TEXT DEFAULT '0',
  responsable TEXT,
  ingresado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Secuencia para IDs
CREATE TABLE contadores (
  clave TEXT PRIMARY KEY,
  valor INTEGER NOT NULL DEFAULT 0
);

INSERT INTO contadores (clave, valor) VALUES ('paciente_seq', 5), ('visita_seq', 5);

-- 5. Índices para búsquedas rápidas
CREATE INDEX idx_pacientes_nombre ON pacientes USING gin (to_tsvector('spanish', nombre));
CREATE INDEX idx_visitas_paciente ON visitas (paciente_id);
CREATE INDEX idx_visitas_fecha ON visitas (fecha);

-- 6. Usuarios iniciales
INSERT INTO usuarios (usuario, password, nombre, rol) VALUES
  ('admin', 'ilgroup2026', 'Administrador', 'admin'),
  ('aylin', 'clinica2026', 'Aylin Estrada', 'medico'),
  ('medico', 'medico2026', 'Médico General', 'medico');

-- 7. Datos iniciales (los 5 pilotos ya evaluados)
INSERT INTO pacientes (id, nombre, sexo, edad, residencia, telefono, puesto, talla, tipo_sangre, alergias, condiciones_cronicas, aptitud, aptitud_vence, ingresado_por) VALUES
  ('PM-2026-0001','David Davila Gonzalez','M','34','1era calle lote 24 masagua Escuintla','3345-4489','Piloto Profesional','1.64','No refiere','No es alérgico a medicamentos','','Apto','19/11/2026','Sistema'),
  ('PM-2026-0002','Samuel Cordon Lemus','M','31','Santo Tomas de Castilla','4669-1382','Piloto Profesional','1.64','No refiere','No es alérgico a medicamentos','','Apto','20/11/2026','Sistema'),
  ('PM-2026-0003','Helber Genaro Alias Arévalo','M','48','Tiquisate Wisisil Las Trozas','5128-3839','Piloto Profesional','1.64','No refiere','No es alérgico a medicamentos','','Apto','20/11/2026','Sistema'),
  ('PM-2026-0004','Samuel Castañeda Estrada','M','55','Col. Bosques de Viena zona 2 Jalapa lote 210','3029-1953','Piloto Profesional','1.64','No refiere','No es alérgico a medicamentos','','Apto','20/11/2026','Sistema'),
  ('PM-2026-0005','William Fernando Hernández Cruz','M','42','San Jerónimo Baja Verapaz','5015-8278','Piloto Profesional','1.70','No refiere','No es alérgico a medicamentos','Diabético e Hipertenso','Condicionado','20/08/2026','Sistema');

INSERT INTO visitas (vid, paciente_id, fecha, peso, presion_s, presion_d, fr, pulso, temp, oxigeno, ritmo, glucosa, glucosa_tipo, fuma, drogas, info_general, recomendaciones, observaciones, covid_pts, responsable, ingresado_por) VALUES
  ('V0001','PM-2026-0001','19/05/2026','190','137','81','20','85','36.5','97','74','114','postprandial','No','Negativo','Paciente consciente y orientado. No presenta tatuajes','Uso de EPP.','Desparasitarse – Vitaminas','0','Aylin Estrada','Sistema'),
  ('V0002','PM-2026-0002','20/05/2026','134','129','87','20','85','36.5','97','74','144','postprandial','Sí','Negativo','Paciente consciente y orientado. No presenta tatuajes','Uso de EPP.','Desparasitarse – Vitaminas','0','Aylin Estrada','Sistema'),
  ('V0003','PM-2026-0003','20/05/2026','200','108','79','20','85','36.5','97','74','159','postprandial','Sí','Negativo','Paciente consciente y orientado. No presenta tatuajes','Uso de EPP.','Desparasitarse – Vitaminas','0','Aylin Estrada','Sistema'),
  ('V0004','PM-2026-0004','20/05/2026','234','124','77','20','85','36.5','97','74','169','postprandial','No','Negativo','Paciente consciente y orientado. No presenta tatuajes','Uso de EPP.','Desparasitarse – Vitaminas','0','Aylin Estrada','Sistema'),
  ('V0005','PM-2026-0005','20/05/2026','273','139','85','20','90','36.5','97','74','88','postprandial','No','Negativo','Paciente consciente y orientado. SI presenta tatuajes','Uso de EPP. Control de diabetes e hipertensión.','Desparasitarse – Vitaminas','0','Aylin Estrada','Sistema');

-- 8. Habilitar acceso desde la app (Row Level Security)
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE contadores ENABLE ROW LEVEL SECURITY;

-- Políticas: permitir todo para usuarios autenticados con anon key (la app maneja auth)
CREATE POLICY "Allow all on pacientes" ON pacientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on visitas" ON visitas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contadores" ON contadores FOR ALL USING (true) WITH CHECK (true);
