#!/bin/bash

# 1. ตั้งชื่อไฟล์ด้วยวันที่และเวลา
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
FILE_NAME="db_backup_$TIMESTAMP.sql"

# 2. สร้างโฟลเดอร์เก็บ Backup ถ้ายังไม่มี
mkdir -p $BACKUP_DIR

# 3. สั่ง Docker ให้ Dump ข้อมูลออกมา (ใช้รหัสผ่านจาก .env หรือใส่ตรงนี้เพื่อเทสก่อน)
# หมายเหตุ: drink_sales_pg คือชื่อ container ใน docker-compose ของเต้
docker exec drink_sales_pg pg_dump -U postgres postgres > $BACKUP_DIR/$FILE_NAME

echo "✅ Backup สำเร็จ: $BACKUP_DIR/$FILE_NAME"