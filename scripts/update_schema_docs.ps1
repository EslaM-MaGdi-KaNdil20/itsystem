# update_schema_docs.ps1
# شغل السكريبت دا لما تضيف جدول جديد أو تغير في الداتابيز

$PG_PATH = "C:\Program Files\PostgreSQL\18\bin"
$DB_HOST = "localhost"
$DB_USER = "postgres"
$DB_NAME = "itsys"
$SCHEMA_FILE = "$PSScriptRoot\..\database_schema.sql"
$SETUP_FILE = "$PSScriptRoot\..\DATABASE_SETUP.md"

Write-Host "🔄 جاري تحديث ملفات الداتابيز..." -ForegroundColor Cyan

# اطلب كلمة السر
$securePass = Read-Host "ادخل باسورد postgres" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
$env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# تحديث ملف الـ SQL Schema
Write-Host "📄 تحديث database_schema.sql..." -ForegroundColor Yellow
& "$PG_PATH\pg_dump.exe" -h $DB_HOST -U $DB_USER -d $DB_NAME --schema-only -f $SCHEMA_FILE
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ database_schema.sql اتحدث بنجاح" -ForegroundColor Green
} else {
    Write-Host "❌ فشل تحديث database_schema.sql" -ForegroundColor Red
    exit 1
}

# جلب أسماء الجداول الحالية
Write-Host "📋 جلب قائمة الجداول..." -ForegroundColor Yellow
$tables = & "$PG_PATH\psql.exe" -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"

$tableCount = ($tables | Measure-Object -Line).Lines
Write-Host "✅ تم جلب $tableCount جدول" -ForegroundColor Green

# جلب العلاقات
$relations = & "$PG_PATH\psql.exe" -h $DB_HOST -U $DB_USER -d $DB_NAME -t -A -c "SELECT tc.table_name || ' --> ' || ccu.table_name || ' (عبر ' || kcu.column_name || ')' FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' ORDER BY tc.table_name;"

# تحديث DATABASE_SETUP.md - قسم الجداول والعلاقات
$date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# بناء قسم الجداول
$tablesSection = "## 📋 الجداول الموجودة (محدث أوتوماتيك)`n`n| الجدول |`n|--------|`n"
foreach ($table in $tables) {
    if ($table.Trim() -ne "") {
        $tablesSection += "| ``$($table.Trim())`` |`n"
    }
}

# بناء قسم العلاقات
$relationsSection = "## 🔗 العلاقات (Foreign Keys) - محدث أوتوماتيك`n`n"
foreach ($rel in $relations) {
    if ($rel.Trim() -ne "") {
        $relationsSection += "- $($rel.Trim())`n"
    }
}

# قراءة محتوى الملف الحالي وتحديث تاريخ آخر تحديث
$content = Get-Content $SETUP_FILE -Raw -Encoding UTF8
$content = $content -replace "\*آخر تحديث:.*\*", "*آخر تحديث: $date*"
Set-Content $SETUP_FILE $content -Encoding UTF8

Write-Host "✅ DATABASE_SETUP.md اتحدث بنجاح" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 تم! الملفات اللي اتحدثت:" -ForegroundColor Cyan
Write-Host "   - database_schema.sql" -ForegroundColor White
Write-Host "   - DATABASE_SETUP.md" -ForegroundColor White
Write-Host ""
Write-Host "💡 لا تنسى تعمل git commit بعد كدا:" -ForegroundColor Yellow
Write-Host '   git add database_schema.sql DATABASE_SETUP.md' -ForegroundColor White
Write-Host '   git commit -m "Update database schema"' -ForegroundColor White
Write-Host '   git push' -ForegroundColor White
