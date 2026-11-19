# SmartPlan AI backend

Первый этап: Java 21, Maven Wrapper, Spring Boot 4.1.2, Spring Web, Security,
Validation, JPA и драйвер PostgreSQL. Maven отдельно устанавливать не нужно.
Spring Initializr сейчас предлагает стабильную ветку 4.x вместо 3.x.

## Первый запуск (PowerShell)

После установки Java полностью перезапустите VS Code, затем:

```powershell
cd 'C:\Users\zhyol\Desktop\Git Katerina\SPAI\backend'
java -version
.\mvnw.cmd verify
.\mvnw.cmd spring-boot:run
```

При первом запуске Maven скачает зависимости из интернета.
В другом терминале:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/api/health
```

Ответ: `{"status":"UP","service":"SmartPlan AI backend"}`.
Остановка сервера: Ctrl+C. По умолчанию сервер доступен только на этом компьютере.

## Профили базы данных

По умолчанию используется профиль `local`: временная H2 в памяти, чтобы проверить
запуск без установки PostgreSQL. Данные исчезают после остановки приложения.
Проверка `/api/health` подтверждает работу HTTP-сервера, а не готовность PostgreSQL.

Для уже созданной базы PostgreSQL задайте параметры в текущем терминале:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'postgres'
$env:DB_URL = 'jdbc:postgresql://localhost:5432/smartplan'
$env:DB_USER = 'smartplan'
# Установите DB_PASSWORD в окружении перед запуском; не сохраняйте пароль в Git.
.\mvnw.cmd spring-boot:run
```

Приложение не загружает корневой `.env` автоматически. PostgreSQL пока не настроен
и подключение к нему не проверено. Перед созданием постоянных таблиц нужно добавить
миграции; профиль `postgres` использует `ddl-auto=validate`.

## Что дальше

Сейчас реализован только `GET /api/health`. Остальные маршруты закрыты (403).
Регистрация, JWT, пользователи, задачи, расписание и AI ещё не реализованы.
Следующий этап: согласовать поля задач с frontend, подключить PostgreSQL, добавить
миграции пользователей и задач, затем регистрацию и авторизацию.
