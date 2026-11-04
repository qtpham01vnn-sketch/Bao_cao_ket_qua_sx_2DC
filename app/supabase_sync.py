import os
import json
import sqlite3
import datetime
try:
    import requests
except ImportError:
    requests = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
TMP_DB = "/tmp/production_data.db"
if os.path.exists(TMP_DB) and os.path.getsize(TMP_DB) > 0:
    DB_PATH = TMP_DB
else:
    DB_PATH = os.path.join(WORKSPACE_DIR, "app_data", "production_data.db")
CONFIG_PATH = os.path.join(WORKSPACE_DIR, "app_data", "supabase_config.json")

TABLES_TO_SYNC = [
    "master_norms_version",
    "master_norms_detail",
    "data_production_summary",
    "data_brand_production",
    "data_material_consumption",
    "data_coal_consumption"
]

def get_supabase_config():
    config = {
        "supabase_url": os.environ.get("SUPABASE_URL", "").strip(),
        "supabase_key": os.environ.get("SUPABASE_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_ANON_KEY", ""))).strip(),
        "auto_sync": False,
        "last_sync_time": None,
        "last_sync_status": None,
        "last_sync_details": None
    }
    
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                saved = json.load(f)
                if not config["supabase_url"]:
                    config["supabase_url"] = saved.get("supabase_url", "").strip()
                if not config["supabase_key"]:
                    config["supabase_key"] = saved.get("supabase_key", "").strip()
                config["auto_sync"] = saved.get("auto_sync", False)
                config["last_sync_time"] = saved.get("last_sync_time")
                config["last_sync_status"] = saved.get("last_sync_status")
                config["last_sync_details"] = saved.get("last_sync_details")
        except Exception as e:
            print("Error loading supabase_config.json:", e)
            
    return config

def save_supabase_config(new_config):
    current = get_supabase_config()
    current.update(new_config)
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(current, f, ensure_ascii=False, indent=2)
        return True, "Đã lưu cấu hình Supabase thành công."
    except Exception as e:
        return False, str(e)

def get_headers(key):
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal,resolution=merge-duplicates"
    }

def test_supabase_connection():
    cfg = get_supabase_config()
    url = cfg.get("supabase_url", "").rstrip("/")
    key = cfg.get("supabase_key", "")
    
    if not url or not key:
        return {
            "configured": False,
            "connected": False,
            "message": "Chưa cấu hình SUPABASE_URL hoặc SUPABASE_KEY. Vui lòng cung cấp khóa API trong bảng cài đặt hoặc file cấu hình."
        }
        
    try:
        test_url = f"{url}/rest/v1/master_norms_version?select=id&limit=1"
        res = requests.get(test_url, headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=8)
        if res.status_code in [200, 206]:
            return {
                "configured": True,
                "connected": True,
                "url": url,
                "message": "✓ Kết nối đám mây Supabase PostgreSQL thành công!"
            }
        else:
            return {
                "configured": True,
                "connected": False,
                "status_code": res.status_code,
                "message": f"Kết nối thất bại (HTTP {res.status_code}): {res.text[:200]}"
            }
    except Exception as e:
        return {
            "configured": True,
            "connected": False,
            "error": str(e),
            "message": f"Không thể kết nối tới Supabase: {str(e)}"
        }

def get_sync_status():
    cfg = get_supabase_config()
    conn_info = test_supabase_connection()
    
    # Count local SQLite records
    local_counts = {}
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        for t in TABLES_TO_SYNC:
            try:
                cnt = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                local_counts[t] = cnt
            except:
                local_counts[t] = 0
        conn.close()
    except Exception as e:
        local_counts["error"] = str(e)

    # Count cloud records if connected
    cloud_counts = {}
    if conn_info.get("connected"):
        url = cfg.get("supabase_url", "").rstrip("/")
        key = cfg.get("supabase_key", "")
        headers = {"apikey": key, "Authorization": f"Bearer {key}", "Range-Unit": "items", "Range": "0-0", "Prefer": "count=exact"}
        for t in TABLES_TO_SYNC:
            try:
                r = requests.get(f"{url}/rest/v1/{t}?select=id", headers=headers, timeout=5)
                # Parse Content-Range header: e.g. 0-0/567
                cr = r.headers.get("Content-Range", "")
                if "/" in cr:
                    total_str = cr.split("/")[-1]
                    cloud_counts[t] = int(total_str) if total_str.isdigit() else 0
                else:
                    cloud_counts[t] = len(r.json()) if r.status_code == 200 else 0
            except:
                cloud_counts[t] = "Chưa rõ"

    return {
        "config": {
            "supabase_url": cfg.get("supabase_url", ""),
            "has_key": bool(cfg.get("supabase_key")),
            "auto_sync": cfg.get("auto_sync", False),
            "last_sync_time": cfg.get("last_sync_time"),
            "last_sync_status": cfg.get("last_sync_status"),
            "last_sync_details": cfg.get("last_sync_details")
        },
        "connection": conn_info,
        "local_counts": local_counts,
        "cloud_counts": cloud_counts
    }

def sync_sqlite_to_supabase():
    cfg = get_supabase_config()
    url = cfg.get("supabase_url", "").rstrip("/")
    key = cfg.get("supabase_key", "")
    
    if not url or not key:
        return False, "Chưa thiết lập URL hoặc API Key cho Supabase."
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    headers = get_headers(key)
    stats = {}
    
    try:
        for table in TABLES_TO_SYNC:
            rows = [dict(r) for r in cur.execute(f"SELECT * FROM {table}").fetchall()]
            stats[table] = {"local_total": len(rows), "synced": 0}
            
            if not rows:
                continue
                
            # Clean rows: remove sqlite specific fields if any, convert booleans/numerics
            batch_size = 100
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i+batch_size]
                # Upsert into Supabase
                endpoint = f"{url}/rest/v1/{table}"
                res = requests.post(endpoint, headers=headers, json=batch, timeout=15)
                if res.status_code in [200, 201, 204]:
                    stats[table]["synced"] += len(batch)
                else:
                    print(f"Warning syncing {table} batch {i}: {res.status_code} {res.text}")
                    # Try insert one by one or continue
                    stats[table]["error"] = f"HTTP {res.status_code}: {res.text[:100]}"
                    
        conn.close()
        
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        save_supabase_config({
            "last_sync_time": now_str,
            "last_sync_status": "success",
            "last_sync_details": stats
        })
        return True, stats
    except Exception as e:
        conn.close()
        save_supabase_config({
            "last_sync_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "last_sync_status": "error",
            "last_sync_details": str(e)
        })
        return False, str(e)

def sync_supabase_to_sqlite():
    cfg = get_supabase_config()
    url = cfg.get("supabase_url", "").rstrip("/")
    key = cfg.get("supabase_key", "")
    
    if not url or not key:
        return False, "Chưa thiết lập URL hoặc API Key cho Supabase."
        
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    stats = {}
    
    try:
        for table in TABLES_TO_SYNC:
            endpoint = f"{url}/rest/v1/{table}?select=*&limit=5000"
            res = requests.get(endpoint, headers=headers, timeout=15)
            if res.status_code != 200:
                stats[table] = {"error": f"HTTP {res.status_code}"}
                continue
                
            data = res.json()
            stats[table] = {"fetched": len(data), "imported": 0}
            
            if not data:
                continue
                
            columns = list(data[0].keys())
            placeholders = ", ".join(["?"] * len(columns))
            cols_str = ", ".join([f'"{c}"' for c in columns])
            
            # Use INSERT OR REPLACE
            sql = f"INSERT OR REPLACE INTO {table} ({cols_str}) VALUES ({placeholders})"
            for item in data:
                vals = [item[c] for c in columns]
                cur.execute(sql, vals)
                stats[table]["imported"] += 1
                
        conn.commit()
        conn.close()
        
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        save_supabase_config({
            "last_sync_time": now_str,
            "last_sync_status": "success_pull",
            "last_sync_details": stats
        })
        return True, stats
    except Exception as e:
        conn.rollback()
        conn.close()
        return False, str(e)
