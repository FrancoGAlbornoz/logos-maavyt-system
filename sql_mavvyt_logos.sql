-- ==========================================================
-- Base de Datos: maavyt_db
-- Motor: MySQL 8.0+
-- ==========================================================

CREATE DATABASE IF NOT EXISTS maavyt_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE maavyt_db;

-- ----------------------------------------------------------
-- 1. Tabla de Clientes / Agencias
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    cuit_rut VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    telefono VARCHAR(50) NULL,
    contacto_nombre VARCHAR(100) NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 2. Tabla de Conductores
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conductores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE NULL,
    telefono VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 3. Tabla de Vehículos / Unidades
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehiculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conductor_id INT NULL,
    numero_unidad VARCHAR(20) NOT NULL, -- Ej: '430'
    patente VARCHAR(20) NOT NULL,
    marca VARCHAR(50) NULL,
    modelo VARCHAR(50) NULL,
    categoria ENUM('Auto Std', 'Auto', 'Ejecutivo', 'Van', 'Minibus') DEFAULT 'Auto Std',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (conductor_id) REFERENCES conductores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 4. Períodos de Liquidación (Quincenas / Meses)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS periodos_liquidacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    anio SMALLINT NOT NULL,
    mes TINYINT NOT NULL, -- 1 a 12
    quincena TINYINT NOT NULL, -- 1 (días 1 al 15) o 2 (días 16 al fin de mes)
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('Abierto', 'Cerrado', 'Liquidado') DEFAULT 'Abierto',
    total_liquidado DECIMAL(12,2) DEFAULT 0.00,
    observaciones TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_periodo (anio, mes, quincena)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 5. Tabla Principal de Servicios / Traslados
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nro_reserva VARCHAR(50) NOT NULL, -- Ej: '229498', '227777-A', 'S/N'
    cliente_id INT NULL,
    periodo_id INT NULL,
    conductor_id INT NULL,
    vehiculo_id INT NULL,
    
    -- Tiempos y Fechas
    fecha_servicio DATE NOT NULL,
    hora_servicio TIME NOT NULL,
    
    -- Configuración del Viaje
    categoria_vehiculo ENUM('Auto Std', 'Auto', 'Ejecutivo', 'Van', 'Minibus') NOT NULL DEFAULT 'Auto Std',
    origen VARCHAR(255) NOT NULL,
    destino VARCHAR(255) NOT NULL,
    vuelo_observacion VARCHAR(255) NULL, -- Ej: 'AR 1476', 'CM 745', 'SALE 09:30', 'CARTEL PFIZER'
    
    -- Estados Operativos
    estado_servicio ENUM('Pendiente', 'Confirmado', 'Realizado', 'No Show', 'Cancelado') DEFAULT 'Confirmado',
    
    -- Aspectos Financieros y Tiempos de Espera
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    minutos_espera INT DEFAULT 0,
    detalle_espera VARCHAR(100) NULL, -- Ej: '25 min espera', '1 hora espera'
    monto_espera DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    monto_adicionales DECIMAL(12,2) NOT NULL DEFAULT 0.00, -- Peajes, desvíos, etc.
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Estado de Conciliación
    liquidado BOOLEAN DEFAULT FALSE,
    observaciones_internas TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para búsqueda rápida
    INDEX idx_fecha_servicio (fecha_servicio),
    INDEX idx_nro_reserva (nro_reserva),
    INDEX idx_estado_servicio (estado_servicio),
    
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    FOREIGN KEY (periodo_id) REFERENCES periodos_liquidacion(id) ON DELETE SET NULL,
    FOREIGN KEY (conductor_id) REFERENCES conductores(id) ON DELETE SET NULL,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 6. Tabla de Pasajeros por Servicio
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pasajeros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    servicio_id INT NOT NULL,
    nombre_completo VARCHAR(200) NOT NULL,
    documento_o_referencia VARCHAR(50) NULL, -- Ej: '48704300' o DNI
    telefono VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 7. Tarifario de Referencia (Base para sugerir importes)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tarifario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NULL,
    categoria_vehiculo ENUM('Auto Std', 'Auto', 'Ejecutivo', 'Van', 'Minibus') NOT NULL DEFAULT 'Auto Std',
    origen_zona VARCHAR(100) NOT NULL, -- Ej: 'TUC ARPT', 'TUC CENTRO'
    destino_zona VARCHAR(100) NOT NULL, -- Ej: 'YERBA BUENA', 'SDE CENTRO'
    tarifa_base DECIMAL(12,2) NOT NULL,
    tarifa_hora_espera DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------

CREATE OR REPLACE VIEW vista_hoja_de_ruta AS
SELECT 
    s.id AS servicio_id,
    s.nro_reserva,
    s.categoria_vehiculo,
    s.fecha_servicio,
    s.hora_servicio,
    GROUP_CONCAT(
        CASE 
            WHEN p.documento_o_referencia IS NOT NULL AND p.documento_o_referencia != '' 
            THEN CONCAT(p.documento_o_referencia, ' - ', p.nombre_completo)
            ELSE p.nombre_completo 
        END 
        SEPARATOR ' / '
    ) AS pasajeros_concatenados,
    s.origen,
    s.destino,
    s.vuelo_observacion,
    s.detalle_espera,
    s.estado_servicio,
    c.nombre AS conductor_nombre,
    v.numero_unidad
FROM servicios s
LEFT JOIN pasajeros p ON s.id = p.servicio_id
LEFT JOIN conductores c ON s.conductor_id = c.id
LEFT JOIN vehiculos v ON s.vehiculo_id = v.id
GROUP BY s.id
ORDER BY s.fecha_servicio ASC, s.hora_servicio ASC;

-- ---------------------------------------------------------------

CREATE OR REPLACE VIEW vista_liquidacion_quincenal AS
SELECT 
    pl.id AS periodo_id,
    CONCAT(pl.anio, '-', LPAD(pl.mes, 2, '0'), ' Q', pl.quincena) AS periodo_nombre,
    COUNT(s.id) AS total_servicios,
    SUM(CASE WHEN s.estado_servicio != 'Cancelado' THEN s.subtotal ELSE 0 END) AS total_subtotal,
    SUM(CASE WHEN s.estado_servicio != 'Cancelado' THEN s.monto_espera ELSE 0 END) AS total_esperas,
    SUM(CASE WHEN s.estado_servicio != 'Cancelado' THEN s.monto_adicionales ELSE 0 END) AS total_adicionales,
    SUM(CASE WHEN s.estado_servicio != 'Cancelado' THEN s.total ELSE 0 END) AS total_general
FROM periodos_liquidacion pl
LEFT JOIN servicios s ON pl.id = s.periodo_id
GROUP BY pl.id
ORDER BY pl.anio DESC, pl.mes DESC, pl.quincena DESC;

-- ---------------------------------------------------------------
-- Cliente por defecto
INSERT INTO clientes (id, nombre, contacto_nombre) 
VALUES (1, 'Logos Travel', 'Operaciones');

-- Conductor y Vehículo
INSERT INTO conductores (id, nombre, apellido) 
VALUES (1, 'Miguel Ángel', 'Albornoz');

INSERT INTO vehiculos (id, conductor_id, numero_unidad, patente, categoria) 
VALUES (1, 1, '430', 'AF123ZZ', 'Auto Std');

-- Período de prueba: 2da Quincena Agosto 2026
INSERT INTO periodos_liquidacion (id, anio, mes, quincena, fecha_inicio, fecha_fin) 
VALUES (1, 2026, 8, 2, '2026-08-16', '2026-08-31');

-- Ejemplo de Servicio
INSERT INTO servicios (
    id, nro_reserva, cliente_id, periodo_id, conductor_id, vehiculo_id,
    fecha_servicio, hora_servicio, categoria_vehiculo, origen, destino,
    vuelo_observacion, subtotal, monto_espera, total, estado_servicio
) VALUES (
    1, '230309', 1, 1, 1, 1,
    '2026-08-18', '14:50:00', 'Auto Std',
    'TUC , (TUC) ARPT, Aeropuerto Internacional Teniente Benjamin Matienzo',
    'TUC , CENTRO, Miguel Lillo 365, Hilton Garden Inn Tucuman',
    'AR 1476', 25417.00, 4000.00, 29417.00, 'Realizado'
);

-- Pasajeros del servicio
INSERT INTO pasajeros (servicio_id, nombre_completo) VALUES 
(1, 'TORRES, DIEGO'),
(1, 'CALCATERRA, PABLO');