#!/bin/bash
set -e

echo "========================================="
echo "  FDK Rejestr v2 — Skrypt wdrożeniowy"
echo "========================================="
echo ""

# 1. Instalacja zależności
echo "▶ [1/6] Instalacja nowych paczek..."
npm install
echo "✓ Paczki zainstalowane"
echo ""

# 2. Przypomnienie o JWT_SECRET
echo "▶ [2/6] Sprawdź zmienne środowiskowe"
echo ""
echo "  Dodaj do .env.local (lokalnie) i do Vercel (produkcja):"
echo "    JWT_SECRET=\"$(openssl rand -hex 32)\""
echo ""
echo "  Vercel → Settings → Environment Variables → dodaj JWT_SECRET"
echo ""
read -p "  Naciśnij ENTER gdy JWT_SECRET jest ustawiony..."
echo ""

# 3. Migracja SQL
echo "▶ [3/6] Migracja SQL bazy danych..."
echo ""
echo "  Skopiuj zawartość pliku prisma/migration_v2.sql"
echo "  i wykonaj w panelu Vercel Postgres (zakładka Query)"
echo "  lub przez psql:"
echo ""
echo "    psql \"\$DATABASE_URL\" -f prisma/migration_v2.sql"
echo ""
read -p "  Naciśnij ENTER gdy SQL został wykonany..."
echo ""

# 4. Prisma push
echo "▶ [4/6] Synchronizacja schematu Prisma..."
npx prisma db push
echo "✓ Schemat zsynchronizowany"
echo ""

# 5. Migracja danych (Workers → Users)
echo "▶ [5/6] Migracja danych: tworzenie kont użytkowników..."
npm run db:migrate-v2
echo "✓ Użytkownicy utworzeni"
echo ""

# 6. Commit i push
echo "▶ [6/6] Git commit i push..."
git add -A
git commit -m "feat: FDK Rejestr v2 — RBAC, JWT auth, deadlines, multilingual messages

Major rewrite:
- Individual user accounts with bcrypt passwords + JWT sessions
- Role-based access: ADMIN / SUPERVISOR / EMPLOYEE (dept-scoped)
- New case flow: accept without deadline → owner sets deadline
- First contact & extension: separate open-template / mark-sent steps
- Multilingual messages (PL/EN/RU) with salutation and sender gender
- Named signature block in generated messages
- Owner change with permission checks + history logging
- Cron: alert if no deadline set after 30 min
- New departments: Księgowość, B2B, Opłaty; HR_ENG → HR
- CSV export: added Forma + Język columns
- Admin panel: full user management + profile page

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"

git push origin master
echo ""
echo "✓ Wypchnięto na origin/master"
echo ""

echo "========================================="
echo "  ✅ WDROŻENIE ZAKOŃCZONE"
echo "========================================="
echo ""
echo "  Vercel zbuduje aplikację automatycznie."
echo ""
echo "  Po wdrożeniu zaloguj się:"
echo "    Login:  grzegorz"
echo "    Hasło:  zmien_haslo_123"
echo ""
echo "  ⚠ ZMIEŃ HASŁA WSZYSTKIM UŻYTKOWNIKOM!"
echo "    Panel → Ustawienia → przy każdym: Reset hasła"
echo ""
