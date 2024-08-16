-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 25, 2024 at 07:45 AM
-- Server version: 10.4.27-MariaDB
-- PHP Version: 8.2.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mmfg_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `item_id` int(11) NOT NULL,
  `item_name` varchar(100) NOT NULL,
  `item_type` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL,
  `date_added` datetime NOT NULL,
  `inventory_status` varchar(100) NOT NULL,
  `item_image` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`item_id`, `item_name`, `item_type`, `quantity`, `date_added`, `inventory_status`, `item_image`) VALUES
(1210, 'Bent Bar', 'Accessories', 2, '2024-07-22 21:37:20', 'not complete', 'https://drive.google.com/thumbnail?id=1SYZUQQtEnGl_grChn6EXQXuLg4FGw_XY'),
(7366, 'Row Machine', 'Flexibility Equipment', 1, '2024-07-22 21:28:08', 'complete', 'https://drive.google.com/thumbnail?id=1TLDuu2i2VC53lykJSRJ6taBkXUcYxtva'),
(7899, 'Rope Large', 'Accessories', 2, '2024-07-22 21:25:41', 'complete', 'https://drive.google.com/thumbnail?id=1w1zf24Y73JAVqvF3N1UCRNrIPGeR2_O5'),
(8028, 'Boxing Gloves 1 Pair', 'Strength Equipment', 2, '2024-07-22 17:55:19', 'complete', 'https://drive.google.com/thumbnail?id=1q9HPH4Bo7LtWzqNDgSgIWiTCPTRtmO-e'),
(9512, 'Dumbell 20 LBS', 'Strength Equipment', 3, '2024-07-22 21:23:46', 'complete', 'https://drive.google.com/thumbnail?id=1Nl4agsCxlUPdiCgI-XqzTC78gBPfNt7w');

-- --------------------------------------------------------

--
-- Table structure for table `non_member`
--

CREATE TABLE `non_member` (
  `non_member_id` int(11) NOT NULL,
  `name` varchar(60) NOT NULL,
  `session_date` datetime NOT NULL,
  `transaction_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `non_member`
--

INSERT INTO `non_member` (`non_member_id`, `name`, `session_date`, `transaction_id`) VALUES
(5086, 'Julius Marco', '2024-07-25 00:20:40', 6819),
(8290, 'Ser Gaybin', '2024-07-19 06:31:56', 6031),
(9230, 'Franco Ocean', '2024-07-18 11:55:01', 9266),
(9755, 'Emil John F. Mandia', '2024-07-16 10:00:00', 5219),
(9930, 'Sir Gaybin', '2024-07-17 21:39:54', 6700),
(9949, 'Alice Johnson', '2024-07-18 12:00:38', 6317);

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `transaction_id` int(11) NOT NULL,
  `amount` double NOT NULL,
  `transaction_date` datetime NOT NULL,
  `transaction_type` varchar(60) NOT NULL,
  `transaction_by` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`transaction_id`, `amount`, `transaction_date`, `transaction_type`, `transaction_by`) VALUES
(5219, 60, '2024-07-16 10:00:00', 'Not-Member', ''),
(6031, 50, '2024-07-19 06:31:56', 'Non-Member', ''),
(6317, 50, '2024-07-18 12:00:38', 'Non-Member', ''),
(6700, 50, '2024-07-17 21:39:54', 'Non-Member', ''),
(6819, 50, '2024-07-25 00:20:40', 'Non-Member', 'Julius Marco'),
(9266, 50, '2024-07-18 11:55:01', 'Non-Member', '');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`item_id`);

--
-- Indexes for table `non_member`
--
ALTER TABLE `non_member`
  ADD PRIMARY KEY (`non_member_id`),
  ADD KEY `transaction_id` (`transaction_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`transaction_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9513;

--
-- AUTO_INCREMENT for table `non_member`
--
ALTER TABLE `non_member`
  MODIFY `non_member_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9950;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9753;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `non_member`
--
ALTER TABLE `non_member`
  ADD CONSTRAINT `non_member_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
