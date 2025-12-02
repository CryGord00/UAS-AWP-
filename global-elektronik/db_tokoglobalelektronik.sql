-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 19 Okt 2025 pada 02.00
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_tokoglobalelektronik`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `jenis` varchar(100) NOT NULL,
  `merk` varchar(100) NOT NULL,
  `tipe_model` varchar(100) DEFAULT NULL,
  `stok` int(11) NOT NULL DEFAULT 0,
  `harga_beli` decimal(15,2) NOT NULL,
  `harga_jual` decimal(15,2) NOT NULL,
  `gambar` varchar(255) DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `products`
--

INSERT INTO `products` (`product_id`, `name`, `jenis`, `merk`, `tipe_model`, `stok`, `harga_beli`, `harga_jual`, `gambar`, `is_featured`, `created_at`, `updated_at`) VALUES
(1, 'Blender Miyako 101PL', 'blender', 'miyako', '101PL', 10, 350000.00, 450000.00, '../images/101PL.jpg', 1, '2025-10-18 19:00:00', '2025-10-18 19:00:00'),
(2, 'Setrika Philips 1173', 'setrika', 'philips', '1173', 20, 250000.00, 320000.00, '../images/1172.jpeg', 1, '2025-10-18 19:00:00', '2025-10-18 19:00:00'),
(3, 'Magic Com Cosmos CRJ-322', 'magic_com', 'cosmos', 'CRJ-322', 15, 420000.00, 550000.00, '../images/sjx165.jpeg', 1, '2025-10-18 19:00:00', '2025-10-18 19:00:00'),
(4, 'Kipas Angin Miyako KAD-06', 'kipas_angin', 'miyako', 'KAD-06', 36, 280000.00, 350000.00, '../images/1618B.jpeg', 0, '2025-10-18 19:00:00', '2025-10-18 19:00:00'),
(5, 'Kulkas Sharp 2 Pintu', 'kulkas', 'sharp', 'SJ-320', 5, 2500000.00, 3250000.00, NULL, 0, '2025-10-18 19:00:00', '2025-10-18 19:00:00'),
(6, 'TV LED Polytron 32 Inch', 'tv', 'polytron', 'PLD 32A20', 8, 1800000.00, 2340000.00, NULL, 1, '2025-10-18 19:00:00', '2025-10-18 19:00:00');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(100) NOT NULL,
  `role` enum('admin','staff') DEFAULT 'staff',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`user_id`, `username`, `password`, `role`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '2025-10-18 19:00:00', '2025-10-18 19:00:00'),
(2, 'staff', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff', '2025-10-18 19:00:00', '2025-10-18 19:00:00');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `idx_jenis` (`jenis`),
  ADD KEY `idx_merk` (`merk`),
  ADD KEY `idx_stok` (`stok`),
  ADD KEY `idx_featured` (`is_featured`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;