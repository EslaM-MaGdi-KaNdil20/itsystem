# 🗄️ IT System - Database Setup Guide

## معلومات الاتصال

| المتغير | القيمة |
|---------|--------|
| Host | `localhost` |
| Port | `5432` |
| Database Name | `itsys` |
| Username | `postgres` |
| Password | *(كلمة السر بتاعتك لـ postgres)* |

---

## 🚀 إنشاء الداتابيز من الصفر

### الخطوة 1: تشغيل PostgreSQL
تأكد إن PostgreSQL شغال على جهازك.

### الخطوة 2: إنشاء الداتابيز
```bash
psql -U postgres -c "CREATE DATABASE itsys;"
```

أو في PowerShell:
```powershell
$env:PGPASSWORD = 'YOUR_PASSWORD'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE itsys;"
```

### الخطوة 3: تطبيق الـ Schema
```powershell
$env:PGPASSWORD = 'YOUR_PASSWORD'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d itsys -f "database_schema.sql"
```

### الخطوة 4: تشغيل الـ Backend (لإنشاء المستخدمين الافتراضيين)
```bash
cd backend
node server.js
```

---

## 👤 المستخدمين الافتراضيين

| الدور | الإيميل | الباسورد |
|-------|---------|---------|
| Super Admin | `super@itsystem.com` | `Super@123` |
| Admin | `admin@itsystem.com` | `admin123` |

---

## 📋 الجداول الموجودة

| الجدول | الوصف |
|--------|-------|
| `users` | مستخدمي النظام (admin, super_admin, support, user) |
| `employees` | بيانات الموظفين |
| `departments` | الأقسام |
| `devices` | الأجهزة |
| `device_assignments` | تعيين الأجهزة للموظفين |
| `device_types` | أنواع الأجهزة |
| `accessories` | الإكسسوارات والمستلزمات |
| `accessory_assignments` | تعيين الإكسسوارات للموظفين |
| `accessory_stock_movements` | حركات المخزون |
| `assignment_accessories` | الإكسسوارات المرتبطة بالتعيينات |
| `stock_movements` | حركات المخزون العامة |
| `tickets` | تذاكر الدعم الفني |
| `ticket_comments` | تعليقات التذاكر |
| `sla_policies` | سياسات مستوى الخدمة |
| `sla_breaches` | انتهاكات الـ SLA |
| `tasks` | المهام |
| `task_comments` | تعليقات المهام |
| `categories` | تصنيفات التذاكر |
| `maintenance_records` | سجلات الصيانة |
| `maintenance_schedules` | جداول الصيانة الدورية |
| `licenses` | التراخيص البرمجية |
| `license_assignments` | تعيين التراخيص |
| `subscriptions` | الاشتراكات |
| `inventory` | المخزون |
| `products` | المنتجات |
| `servers` | السيرفرات |
| `network_ips` | عناوين IP في الشبكة |
| `email_accounts` | حسابات البريد الإلكتروني |
| `email_broadcasts` | رسائل البريد الجماعية |
| `password_vault` | خزنة الباسوردات |
| `hosting_config` | إعدادات الاستضافة |
| `hosting_sync_logs` | سجلات مزامنة الاستضافة |
| `voip_extensions` | تحويلات VoIP |
| `voip_config` | إعدادات VoIP |
| `voip_sync_logs` | سجلات مزامنة VoIP |
| `user_guides` | أدلة المستخدم |
| `guide_steps` | خطوات الأدلة |
| `ad_users` | مستخدمو Active Directory |
| `ad_computers` | أجهزة Active Directory |
| `ad_computers_cache` | كاش أجهزة AD |
| `ad_config` | إعدادات AD |
| `ad_groups_ous` | مجموعات وـ OUs الخاصة بـ AD |
| `ad_sync_logs` | سجلات مزامنة AD |
| `attendance_records` | سجلات الحضور والانصراف |
| `zk_devices` | أجهزة ZKTeco للحضور |
| `zk_employee_map` | ربط الموظفين بأجهزة ZKTeco |
| `notifications` | الإشعارات |
| `activity_logs` | سجل النشاطات |
| `agent_keys` | مفاتيح الـ Agent |
| `it_access_logs` | سجل وصول IT |
| `user_permissions` | صلاحيات المستخدمين |

---

## 🔗 العلاقات الأساسية

```
employees ──────────────┬── device_assignments ── devices
                        ├── accessory_assignments ── accessories
                        ├── attendance_records
                        ├── voip_extensions
                        └── zk_employee_map ── zk_devices

tickets ────────────────┬── ticket_comments
                        ├── sla_policies
                        └── sla_breaches

tasks ──────────────────── task_comments

users ──────────────────── user_permissions

licenses ───────────────── license_assignments

user_guides ────────────── guide_steps

accessories ────────────── accessory_stock_movements
                        └── stock_movements
```

---

## 🔄 تحديث هذا الملف

لما تضيف جدول جديد أو علاقة جديدة، شغل السكريبت دا:

```powershell
cd "e:\ITsystem\it-system\it-system"
.\scripts\update_schema_docs.ps1
```

---

## 📁 الملفات المهمة

| الملف | الوصف |
|-------|-------|
| `database_schema.sql` | ملف الـ Schema الكامل (SQL) |
| `backend/.env` | إعدادات الاتصال بالداتابيز |
| `backend/config/initDb.js` | إنشاء الجداول الأساسية |
| `backend/config/initInventory.js` | جداول المخزون |
| `backend/config/initHosting.js` | جداول الاستضافة |
| `backend/config/initAD.js` | جداول Active Directory |
| `backend/config/initAttendance.js` | جداول الحضور |
| `backend/config/initVoIP.js` | جداول VoIP |
| `backend/config/initGuides.js` | جداول الأدلة |
| `backend/config/initSLA.js` | جداول SLA |
| `backend/config/initTasks.js` | جداول المهام |
| `backend/config/initLicenses.js` | جداول التراخيص |
| `backend/config/initNotifications.js` | جداول الإشعارات |
| `backend/config/initActivityLog.js` | جدول سجل النشاطات |
| `backend/config/initEmailBroadcast.js` | جداول البريد الجماعي |
| `backend/config/initMaintenanceSchedules.js` | جداول الصيانة |

---

*آخر تحديث: تم توليد هذا الملف أوتوماتيك*
