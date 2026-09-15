CREATE DATABASE IF NOT EXISTS tcc;
USE tcc;

CREATE TABLE IF NOT EXISTS estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item VARCHAR(255),
    descricao VARCHAR(255),
    quantidade INT,
    imagem VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS historico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item VARCHAR(255),
    quantidade INT,
    pessoa VARCHAR(255),
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS administrador (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(180) NOT NULL,
    senha VARCHAR(250)
);

INSERT INTO administrador (usuario, senha)
VALUES (
    'roger',
    '$2b$12$4traD3hZntpE1sjyW1HDr.y0GDOdmaKha23.5/mwo6N/PsDnjuC12'
);

CREATE TABLE IF NOT EXISTS usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(180) NOT NULL,
    senha VARCHAR(255)
);