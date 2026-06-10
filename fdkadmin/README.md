# FDK Rejestr zgłoszeń

Aplikacja do rejestrowania i pilnowania zgłoszeń od klientów dla Fundacji Firma Dla Każdego.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Baza danych: Vercel Postgres (lub Neon) przez Prisma
- Cron: Vercel Cron (co 5 min)
- Deploy: Vercel

## Deploy na Vercel

### 1. Przygotowanie repozytorium

```bash
git init
git add .
git commit -m "Initial commit"
```

Wypchnij do GitHuba (nowe repo).

### 2. Vercel

1. Zaloguj się na [vercel.com](https://vercel.com) i zaimportuj repozytorium z GitHuba.
2. W ustawieniach projektu dodaj **Environment Variables**:

| Zmienna | Opis |
|---|---|
| `DATABASE_URL` | Connection string do Vercel Postgres lub Neon |
| `TEAM_PASSWORD` | Wspólne hasło zespołowe do logowania |
| `CRON_SECRET` | Losowy string do zabezpieczenia crona |
| `TEAMS_WEBHOOK_URL` | *(opcjonalnie)* URL webhooka Teams |

3. Jeśli używasz Vercel Postgres — dodaj integrację „Postgres" w zakładce „Storage" projektu. `DATABASE_URL` zostanie dodane automatycznie.

### 3. Inicjalizacja bazy danych

Po pierwszym deploy'u uruchom:

```bash
npx prisma db push
npm run db:seed
```

Lub przez Vercel CLI:

```bash
vercel env pull .env.local
npx prisma db push
npm run db:seed
```

### 4. Konfiguracja Teams Webhook

1. Otwórz kanał Teams, na którym chcesz otrzymywać powiadomienia
2. Kliknij `⋯` → **Łączniki** (Connectors) → **Incoming Webhook**
3. Nadaj nazwę (np. "FDK Rejestr"), kliknij **Utwórz**
4. Skopiuj wygenerowany URL
5. Wklej w aplikacji: **Ustawienia** → **Teams Incoming Webhook URL** → **Zapisz**

Lub ustaw jako zmienną środowiskową `TEAMS_WEBHOOK_URL` w Vercel.

## Rozwój lokalny

```bash
npm install
cp .env.example .env
# Uzupełnij .env danymi do lokalnej bazy PostgreSQL
npx prisma db push
npm run db:seed
npm run dev
```

Aplikacja będzie dostępna na `http://localhost:3000`.

## Funkcje

- **Panel** — lista otwartych spraw z żywym odliczaniem do deadline'u
- **Nowe zgłoszenie** — szybki formularz (kanał, beneficjent, temat, dział, deadline)
- **Kontakt wstępny** — otwiera mailto z automatyczną treścią + BCC
- **Przedłużenie +1h** — jednorazowe, z powiadomieniem Teams
- **Zamknięcie sprawy** — z obowiązkowym komentarzem
- **Cron co 5 min** — alerty Teams: 30 min przed deadline'em i po przekroczeniu
- **Eksport CSV** — kompatybilny z Excelem (UTF-8 BOM, separator `;`)
- **Auto-refresh** — lista odświeża się co 30 sekund
