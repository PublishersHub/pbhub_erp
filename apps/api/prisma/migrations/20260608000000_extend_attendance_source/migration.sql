-- AlterEnum: add RFID, PIN, BIOMETRIC values to AttendanceLogSource
ALTER TYPE "AttendanceLogSource" ADD VALUE IF NOT EXISTS 'RFID';
ALTER TYPE "AttendanceLogSource" ADD VALUE IF NOT EXISTS 'PIN';
ALTER TYPE "AttendanceLogSource" ADD VALUE IF NOT EXISTS 'BIOMETRIC';
