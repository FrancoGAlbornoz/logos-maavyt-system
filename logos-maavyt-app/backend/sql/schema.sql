-- ==========================================================
-- Base de Datos: maavyt_db
-- Cumplimiento de Normalización: 1FN, 2FN y 3FN
-- Motor: MySQL 8.0+
-- ==========================================================

CREATE DATABASE IF NOT EXISTS maavyt_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE maavyt_db;

-- ----------------------------------------------------------
-- 0. Tabla de Usuarios y Seguridad (Fase 2)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('ADMIN', 'OPERADOR') DEFAULT 'ADMIN',
    activo BOOLEAN DEFAULT TRUE,
    ultimo_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_usuario_email (email)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 1. Tabla de Clientes / Agencias (1FN, 2FN, 3FN)
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
-- 2. Tabla de Conductores (1FN, 2FN, 3FN)
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
-- 3. Tabla de Vehículos / Unidades (1FN, 2FN, 3FN)
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
-- 4. Períodos de Liquidación Quincenales (1FN, 2FN, 3FN)
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
-- 5. Tabla Principal de Servicios / Traslados (1FN, 2FN, 3FN + Soft Delete)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nro_reserva VARCHAR(50) NOT NULL,
    cliente_id INT NULL,
    periodo_id INT NULL,
    conductor_id INT NULL,
    vehiculo_id INT NULL,
    
    -- Tiempos y Fechas Atómicas (1FN)
    fecha_servicio DATE NOT NULL,
    hora_servicio TIME NOT NULL,
    
    -- Atributos del Viaje
    categoria_vehiculo ENUM('Auto Std', 'Auto', 'Ejecutivo', 'Van', 'Minibus') NOT NULL DEFAULT 'Auto Std',
    origen VARCHAR(255) NOT NULL,
    destino VARCHAR(255) NOT NULL,
    vuelo_observacion VARCHAR(255) NULL,
    
    -- Estados Operativos
    estado_servicio ENUM('Pendiente', 'Confirmado', 'Realizado', 'No Show', 'Cancelado') DEFAULT 'Confirmado',
    
    -- Aspectos Financieros
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    minutos_espera INT DEFAULT 0,
    detalle_espera VARCHAR(100) NULL,
    monto_espera DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    monto_adicionales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Estado de Conciliación y Borrado Lógico (Soft Delete)
    liquidado BOOLEAN DEFAULT FALSE,
    observaciones_internas TEXT NULL,
    deleted_at DATETIME NULL DEFAULT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_fecha_servicio (fecha_servicio),
    INDEX idx_nro_reserva (nro_reserva),
    INDEX idx_estado_servicio (estado_servicio),
    INDEX idx_deleted_at (deleted_at),
    
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    FOREIGN KEY (periodo_id) REFERENCES periodos_liquidacion(id) ON DELETE SET NULL,
    FOREIGN KEY (conductor_id) REFERENCES conductores(id) ON DELETE SET NULL,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 6. Tabla de Pasajeros por Servicio (Normalización 1FN: Sin listas en celdas)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pasajeros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    servicio_id INT NOT NULL,
    nombre_completo VARCHAR(200) NOT NULL,
    documento_o_referencia VARCHAR(50) NULL,
    telefono VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 7. Tarifario de Referencia (3FN)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tarifario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NULL,
    categoria_vehiculo ENUM('Auto Std', 'Auto', 'Ejecutivo', 'Van', 'Minibus') NOT NULL DEFAULT 'Auto Std',
    origen_zona VARCHAR(100) NOT NULL,
    destino_zona VARCHAR(100) NOT NULL,
    tarifa_base DECIMAL(12,2) NOT NULL,
    tarifa_hora_espera DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- Vistas Operativas (Excluyen servicios borrados lógicamente por defecto)
-- ----------------------------------------------------------

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
WHERE s.deleted_at IS NULL
GROUP BY s.id
ORDER BY s.fecha_servicio ASC, s.hora_servicio ASC;

-- ---------------------------------------------------------------

CREATE OR REPLACE VIEW vista_liquidacion_quincenal AS
SELECT 
    pl.id AS periodo_id,
    CONCAT(pl.anio, '-', LPAD(pl.mes, 2, '0'), ' Q', pl.quincena) AS periodo_nombre,
    COUNT(CASE WHEN s.deleted_at IS NULL THEN s.id END) AS total_servicios,
    SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.subtotal ELSE 0 END) AS total_subtotal,
    SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.monto_espera ELSE 0 END) AS total_esperas,
    SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.monto_adicionales ELSE 0 END) AS total_adicionales,
    SUM(CASE WHEN s.deleted_at IS NULL AND s.estado_servicio != 'Cancelado' THEN s.total ELSE 0 END) AS total_general
FROM periodos_liquidacion pl
LEFT JOIN servicios s ON pl.id = s.periodo_id
GROUP BY pl.id
ORDER BY pl.anio DESC, pl.mes DESC, pl.quincena DESC;

-- ---------------------------------------------------------------
-- Datos Semilla (Seeds)
-- ---------------------------------------------------------------

INSERT IGNORE INTO clientes (id, nombre, contacto_nombre) 
VALUES (1, 'Logos Travel', 'Operaciones');

INSERT IGNORE INTO conductores (id, nombre, apellido) 
VALUES (1, 'Miguel Ángel', 'Albornoz');

INSERT IGNORE INTO vehiculos (id, conductor_id, numero_unidad, patente, categoria) 
VALUES (1, 1, '430', 'AF123ZZ', 'Auto Std');

INSERT IGNORE INTO periodos_liquidacion (id, anio, mes, quincena, fecha_inicio, fecha_fin) 
VALUES (1, 2026, 9, 1, '2026-09-01', '2026-09-15');

INSERT IGNORE INTO usuarios (id, nombre, email, password_hash, rol) 
VALUES (1, 'Administrador MAAVYT', 'admin@maavyt.com', '$2b$10$K0B5NbLhW/3nnFbYQFKRsu6OdDDSZgzhU1X0VGvvGBwrVEIQf2YcC', 'ADMIN');
