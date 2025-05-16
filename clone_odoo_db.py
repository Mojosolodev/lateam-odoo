from flask import Flask, request, jsonify
import subprocess
import psycopg2
import json

app = Flask(__name__)

# Update these
PG_USER = "openpg"
PG_PASSWORD = "openpgpwd"
PG_HOST = "localhost"
TEMPLATE_DB = "odoodb"

@app.route("/create_company", methods=["POST"])
def create_company():
    data = request.json
    new_db = data.get("database")
    email = data.get("email")
    password = data.get("password")

    if not new_db or not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    try:
        # Clone DB from template
        subprocess.run(
            ["createdb", "-U", PG_USER, "-O", PG_USER, new_db, "-T", TEMPLATE_DB],
            check=True
        )

        # Connect to new DB and create user
        conn = psycopg2.connect(
            dbname=new_db, user=PG_USER, password=PG_PASSWORD, host=PG_HOST
        )
        cur = conn.cursor()

        # Create user in res_users (simplified)
        cur.execute("""
            INSERT INTO res_users (login, password, name, active, create_date)
            VALUES (%s, %s, %s, true, now())
        """, (email, password, email))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": "Database cloned and user created."})

    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"DB creation failed: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
