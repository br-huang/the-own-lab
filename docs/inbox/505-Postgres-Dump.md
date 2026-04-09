# PostgreSQL Dump & Restore 指南

## 完整流程

### 1. 用舊資料啟動臨時容器

```bash
docker run -d --name pg14-temp \
  -v /path/to/old/pgdata:/var/lib/postgresql/data \
  -p 127.0.0.1:5434:5432 \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  postgres:14-alpine
```

> port 選用未被佔用的 (如 5434)，`POSTGRES_HOST_AUTH_METHOD=trust` 免密碼連線。

### 2. 確認臨時容器可連線

```bash
# 列出所有 databases
docker exec pg14-temp psql -U postgres -l
```

### 3. 執行 Dump

#### 全部 databases

```bash
docker exec pg14-temp pg_dumpall -U postgres > ~/pg_full_dump.sql
```

#### 單一 database

```bash
docker exec pg14-temp pg_dump -U postgres -d <db_name> > ~/db_name_dump.sql
```

#### 只匯出 schema (不含資料)

```bash
docker exec pg14-temp pg_dump -U postgres -d <db_name> --schema-only > ~/db_schema.sql
```

### 4. 驗證 Dump 檔案

```bash
# 檔案大小 (不應為空)
ls -lh ~/pg_full_dump.sql

# 開頭應有 "PostgreSQL database dump"
head -20 ~/pg_full_dump.sql

# 結尾應有 "PostgreSQL database cluster dump complete"
tail -5 ~/pg_full_dump.sql

# 確認包含哪些 databases
grep "^\\\\connect" ~/pg_full_dump.sql

# 統計 tables 和資料
grep -c "^CREATE TABLE" ~/pg_full_dump.sql
grep -c "^COPY" ~/pg_full_dump.sql
```

### 5. 匯入到新容器

```bash
# 全部匯入
docker exec -i infra-postgres psql -U postgres < ~/pg_full_dump.sql

# 單一 database
docker exec -i infra-postgres psql -U postgres -d <db_name> < ~/db_name_dump.sql
```

### 6. 驗證匯入結果

```bash
# 列出 databases
docker exec infra-postgres psql -U postgres -l

# 確認 tables
docker exec infra-postgres psql -U postgres -d <db_name> -c "\dt"

# 確認資料筆數
docker exec infra-postgres psql -U postgres -d <db_name> -c "
  ANALYZE;
  SELECT relname, n_live_tup FROM pg_stat_user_tables
  WHERE n_live_tup > 0 ORDER BY n_live_tup DESC;
"
```

### 7. 修正權限 (重要)

Dump 匯入後 table owner 通常是 `postgres`，需要改為 service user：

```bash
docker exec infra-postgres psql -U postgres -d <db_name> -c "
-- 變更所有 table owner
DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO <service_user>';
  END LOOP;
END\$\$;

-- 變更所有 sequence owner
DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
  LOOP
    EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' OWNER TO <service_user>';
  END LOOP;
END\$\$;

-- 授權 + 設定未來預設權限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO <service_user>;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO <service_user>;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO <service_user>;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO <service_user>;
"
```

### 8. 處理 Dirty Migration

如果 migration 中途失敗導致 dirty state：

```bash
# 查看目前狀態
docker exec infra-postgres psql -U postgres -d <db_name> -c "
  SELECT version, dirty FROM schema_migrations;
"

# 清除 dirty flag
docker exec infra-postgres psql -U postgres -d <db_name> -c "
  UPDATE schema_migrations SET dirty = false WHERE version = <version_number>;
"
```

### 9. 清理

```bash
# 停止並移除臨時容器
docker stop pg14-temp && docker rm pg14-temp

# 刪除 dump 檔案
rm ~/pg_full_dump.sql
```

---

## 常見問題

| 問題 | 原因 | 解法 |
|------|------|------|
| `connection refused` | host/port 設定錯誤 | 確認 Docker port binding |
| `password authentication failed` | 密碼不一致 | 確認 `.env` 與 `docker compose` 密碼 |
| `database does not exist` | DB 名稱不對 | 用 `psql -l` 確認實際名稱 |
| `must be owner of table` | dump 匯入後 owner 是 postgres | 執行上方權限修正步驟 |
| `Dirty database version N` | migration 失敗中斷 | 清除 dirty flag 後重跑 |
| `address already in use` | port 被佔用 | 換一個 port (如 5434) |
