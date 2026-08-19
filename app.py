from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, TEXT
from pymongo.errors import OperationFailure, DuplicateKeyError
from bson import ObjectId
from dotenv import load_dotenv
from rapidfuzz import process
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, timezone
from functools import wraps
import os
import re
import requests
import jwt

load_dotenv()

app = Flask(__name__)
CORS(app)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)

try:
    client.admin.command("ping")
    print("✅ MongoDB connected successfully")
except Exception as e:
    print("❌ MongoDB connection error:", e)

db = client["mycalinan_db"]

COLLECTIONS = [
    "community",
    "documents",
    "education",
    "finance_services",
    "food_dining",
    "health",
    "history",
    "hot_spots",
    "hotlines",
    "lifestyle",
    "shopping_store",
    "transport_utilities",
]

STRONG_FIELDS = [
    "name",
    "tag",
    "category",
    "keywords",
    "page",

    "title_en",
    "title_cebuano",

    "description_en",
    "description_cebuano"
]

STOP_WORDS = [
    "tell","me","about","show","give","what","is","are","the","a","an","of",
    "in","on","to","for","where","can","i","find","please","information","info",
    "aha","asa","dapit","duol","naa","bay","ba","ko","kog","pwede","puwede",
    "mu","mo","og","ug","sa","diri","lang","dapita","bai","baii","ang","mga",
    "how","get","apply","applying","process","kuha","kuhaon","pagkuha",
    "makakuha","unsaon","paano","need","do","you","know","your","yo",
]

# =========================================================
# TEXT INDEX SETUP
# =========================================================

def ensure_text_indexes():
    weights = {
    "name": 10,
    "tag": 6,
    "category": 5,
    "keywords": 4,
    "page": 2,

    "title_en": 8,
    "title_cebuano": 8,

    "description_en": 6,
    "description_cebuano": 6
}
    for name in COLLECTIONS:
        try:
            existing = db[name].index_information()
            has_text_index = any(idx.get("textIndexVersion") for idx in existing.values())
            if has_text_index:
                continue
            db[name].create_index(
                [(field, TEXT) for field in weights.keys()],
                weights=weights,
                name=f"{name}_text_idx",
            )
            print(f"✅ Created text index on '{name}'")
        except OperationFailure as e:
            print(f"⚠️ Could not create text index on '{name}':", e)


SPECIAL_COLLECTIONS = {
    "history": ["history"], "modern": ["history"],
    "barangaycertification": ["documents"], "brgycertification": ["documents"],
    "barangayclearance": ["documents"], "brgyclearance": ["documents"],
    "policeclearance": ["documents"], "cedula": ["documents"],
    "postalid": ["documents"], "documents": ["documents"],
    "requirements": ["documents"], "certification": ["documents"],
    "clearance": ["documents"], "motor": ["shopping_store"],
    "convenience": ["shopping_store"], "grocery": ["shopping_store", "hot_spots"],
    "trading": ["shopping_store"], "hardware": ["shopping_store"],
    "clinic": ["health"], "hotspot": ["hot_spots"], "community": ["community"],
    "lifestyle": ["lifestyle"], "finance": ["finance_services"],
    "elementary": ["education"], "highschool": ["education"],
    "seniorhigh": ["education"], "college": ["education"],
    "education": ["education"], "food": ["food_dining"],
    "bakeshop": ["food_dining"], "transport": ["transport_utilities"],
    "shop": ["shopping_store"], "store": ["shopping_store"],
    "optic": ["health"], "cemetery": ["community"],
    "police": ["hotlines", "community"], "emergency": ["hotlines"],
    "church": ["community"],
}

PRIORITY = [
    "brgycertification","brgyclearance","barangaycertification","barangayclearance",
    "policeclearance","cedula","postalid","documents","requirements","certification",
    "clearance","emergency","police","church","cemetery","motor","convenience",
    "grocery","trading","hardware","optic","clinic","hotspot","community","lifestyle",
    "finance","elementary","highschool","seniorhigh","college","education","bakeshop",
    "food","transport","shop","store",
]


def normalize_question(question):
    q = str(question or "").lower()
    replacements = {
        "barangay certification":"brgycertification","barangay cert":"brgycertification",
        "brgy certification":"brgycertification","brgy cert":"brgycertification",
        "baranggay certification":"brgycertification","certificate of residency":"brgycertification",
        "proof of residency":"brgycertification","katibayan":"brgycertification",
        "barangay clearance":"brgyclearance","brgy clearance":"brgyclearance",
        "baranggay clearance":"brgyclearance","police clearance":"policeclearance",
        "pnp clearance":"policeclearance","community tax certificate":"cedula","ctc":"cedula",
        "postal id":"postalid","postal identification":"postalid","postal-id":"postalid",
        "barangay document":"documents","barangay documents":"documents",
        "baranggay document":"documents","baranggay documents":"documents",
        "legal document":"documents","legal documents":"documents",
        "government document":"documents","government documents":"documents",
        "modern history":"modern","recent history":"modern","current history":"modern",
        "present history":"modern","bag-o":"modern","bago":"modern",
        "karong panahon":"modern","today":"modern","now":"modern",
        "currently":"modern","present day":"modern","nowadays":"modern",
        "karon":"modern","old history":"history","kasaysayan":"history",
        "motor store":"motor","motor shop":"motor","motor parts":"motor",
        "motor vehicle":"motor","vehicle parts":"motor","auto parts":"motor",
        "motorcycle":"motor","convenience store":"convenience",
        "convenience stores":"convenience","mini mart":"convenience","minimart":"convenience",
        "groceryhan":"grocery","grocery store":"grocery","groceries":"grocery",
        "grosery":"grocery","grocerry":"grocery","groseri":"grocery","groceri":"grocery",
        "supermarket":"grocery","palengke":"grocery","merkado":"grocery",
        "public market":"grocery","wet market":"grocery","marketplace":"grocery",
        "market":"grocery","talipapa":"grocery","trading store":"trading",
        "hardware store":"hardware","construction supply":"hardware",
        "building supply":"hardware","optic clinic":"optic","optical clinic":"optic",
        "eye clinic":"optic","eyecare":"optic","vision clinic":"optic",
        "optometrist":"optic","klinika":"clinic","clinics":"clinic",
        "health center":"clinic","medical":"clinic","hotspots":"hotspot",
        "tourist spot":"hotspot","tourist spots":"hotspot","pasyalan":"hotspot",
        "laagan":"hotspot","laaganan":"hotspot","suroyan":"hotspot",
        "barangay":"community","komunidad":"community","simbahan":"church",
        "chapel":"church","parish":"church","kapilya":"church",
        "hotline":"emergency","hotlines":"emergency","tabang":"emergency",
        "rescue":"emergency","ambulance":"emergency","bumbero":"emergency",
        "fire":"emergency","krimen":"police","police station":"police",
        "pnp":"police","precinct":"police","polis":"police","pulis":"police",
        "lubnganan":"cemetery","sementeryo":"cemetery","cementeryo":"cemetery",
        "cemeteryo":"cemetery","memorial park":"cemetery","spa":"lifestyle",
        "gym":"lifestyle","fitness":"lifestyle","salon":"lifestyle","barber":"lifestyle",
        "finance services":"finance","financial":"finance","remittance":"finance",
        "pawnshop":"finance","bangko":"finance","banko":"finance","bank":"finance",
        "withdraw":"finance","withdrawal":"finance","atm":"finance",
        "elementary school":"elementary","senior highschool":"seniorhigh",
        "senior high":"seniorhigh","shs":"seniorhigh","highschool":"highschool",
        "high school":"highschool","secondary":"highschool","university":"college",
        "tertiary":"college","school":"education","schools":"education",
        "academy":"education","food dining":"food","foods":"food","dining":"food",
        "restaurant":"food","restaurants":"food","cafe":"food","coffee":"food",
        "eatery":"food","carinderia":"food","kan-anan":"food","kananan":"food",
        "kaon":"food","pagkaon":"food","bakery":"bakeshop","bread":"bakeshop",
        "cake":"bakeshop","pastry":"bakeshop","pastries":"bakeshop","pan":"bakeshop",
        "pandesal":"bakeshop","transportation":"transport","terminal":"transport",
        "terminalan":"transport","jeepney":"transport","bus":"transport",
        "tricycle":"transport","pedicab":"transport","sakyanan":"transport",
        "sakay":"transport","sakyan":"transport","sakayanan":"transport",
        "sakayan":"transport","masakyanan":"transport","masakyan":"transport",
        "commute":"transport","commuter":"transport","byahe":"transport",
        "biyahe":"transport","tambal":"medicine","botika":"pharmacy",
        "gamot":"medicine","doktor":"doctor","shops":"shop","shopping":"shop",
        "tindahan":"store",
    }
    for old, new in sorted(replacements.items(), key=lambda kv: len(kv[0]), reverse=True):
        q = q.replace(old, new)
    return q


def clean_question(question):
    normalized = normalize_question(question)
    words = re.findall(r"[a-zA-Z0-9\-]+", normalized)
    return [word for word in words if word not in STOP_WORDS]


def clean_search_words(question):
    q = str(question or "").lower()
    words = re.findall(r"[a-zA-Z0-9\-]+", q)
    return [word for word in words if word not in STOP_WORDS]


def get_special_type(words):
    if "modern" in words:
        return "modern"
    if "history" in words:
        return "history"
    for key in PRIORITY:
        if key in words:
            return key
    return None


def get_search_collections(special_type):
    if special_type and special_type in SPECIAL_COLLECTIONS:
        return SPECIAL_COLLECTIONS[special_type]
    return COLLECTIONS


_known_terms_cache = None


def get_known_terms():
    global _known_terms_cache
    if _known_terms_cache is not None:
        return _known_terms_cache
    terms = set()
    for name in COLLECTIONS:
        try:
            for item in db[name].find({}, {"_id": 0}):
                for field in STRONG_FIELDS:
                    value = item.get(field, "")
                    if isinstance(value, dict):
                        value = " ".join(str(v) for v in value.values())
                    else:
                        value = str(value or "")
                    for word in re.findall(r"[a-zA-Z\-]+", value.lower()):
                        if len(word) > 2:
                            terms.add(word)
        except Exception:
            continue
    _known_terms_cache = list(terms)
    return _known_terms_cache


def correct_typos(words):
    known_terms = get_known_terms()
    if not known_terms:
        return words
    corrected = []
    for word in words:
        match = process.extractOne(word, known_terms, score_cutoff=82)
        corrected.append(match[0] if match else word)
    return corrected


def score_history_item(item, modern=False):
    name = str(item.get("name", "")).lower()
    tag = str(item.get("tag", "")).lower()
    category = str(item.get("category", "")).lower()
    keywords = str(item.get("keywords", "")).lower()
    full_text = f"{name} {tag} {category} {keywords}"

    if modern:
        score = 0
        if category == "modern history": score += 1000
        if tag == "modern history": score += 900
        if "modern history" in keywords: score += 800
        if any(t in keywords for t in ["recent calinan","present calinan","current calinan"]): score += 700
        if "modern history" in name: score += 500
        return score

    bad_words = ["school","college","employee","office","staff","worker","clearance","hotline","store","mall","building","buildings","modern"]
    if any(bad in full_text for bad in bad_words):
        return 0

    score = 0
    if category == "old history": score += 1000
    if tag == "old history": score += 900
    if tag == "calinan history": score += 800
    if "old history" in keywords: score += 700
    if "old calinan" in keywords: score += 600
    if "calinan poblacion history" in keywords: score += 600
    if "calinan poblacion history" in name: score += 500
    if "calinan" in name: score += 200
    return score


def run_text_search(collection_name, words, limit=50):
    if not words:
        return []
    search_string = " ".join(words)

    def query(search_terms):
        try:
            return list(
                db[collection_name]
                .find({"$text": {"$search": search_terms}}, {"_id": 0, "score": {"$meta": "textScore"}})
                .sort([("score", {"$meta": "textScore"})])
                .limit(limit)
            )
        except OperationFailure:
            print(f"⚠️ '{collection_name}' has no text index.")
            return []

    results = query(search_string)
    print("COLLECTION:", collection_name)
    print("SEARCH STRING:", search_string)
    print("FOUND:", len(results))
    if not results:
        corrected_words = correct_typos(words)
        if corrected_words != words:
            results = query(" ".join(corrected_words))
    return results


# =========================================================
# SEARCH
# =========================================================

@app.route("/api/search")
def search():
    question = request.args.get("q", "")

    broad_queries = ["calinan","about calinan","tell me about calinan","information about calinan","what is calinan","calinan?","where is calinan"]
    if question.lower().strip() in broad_queries:
        return jsonify([{"clarify": True, "message": "I can help you with Calinan. What specific information are you looking for?\n\n🏞 Tourist Spots\n🏫 Schools\n🏥 Hospitals or Clinics\n🍴 Restaurants and Cafes\n🛒 Public Market and Stores\n🚌 Transportation\n📄 Barangay Documents\n⛪ Churches\n📞 Emergency Hotlines\n📜 History of Calinan"}])

    routing_words = clean_question(question)
    special_type = get_special_type(routing_words)
    search_collections = get_search_collections(special_type)
    search_words = clean_search_words(question) or routing_words
    print("QUESTION:", question)
    print("ROUTING WORDS:", routing_words)
    print("SEARCH WORDS:", search_words)
    print("SPECIAL TYPE:", special_type)
    print("SEARCH COLLECTIONS:", search_collections)
    results = []

    for collection_name in search_collections:
        found = run_text_search(collection_name, search_words)
        for item in found:
            if special_type == "history":
                item["score"] = score_history_item(item, modern=False)
            elif special_type == "modern":
                item["score"] = score_history_item(item, modern=True)
            else:
                name = str(item.get("name", "")).lower()
                item["_exact_match"] = bool(search_words) and all(w in name for w in search_words)
                if item["_exact_match"]:
                    item["score"] = item.get("score", 0) + 1000
            name = str(item.get("name", "")).strip().lower()
            if item.get("score", 0) > 0 and name not in ("", "unnamed", "n/a", "none"):
                item["collection"] = collection_name
                results.append(item)

    results = sorted(results, key=lambda x: x.get("score", 0), reverse=True)
    if any(item.get("_exact_match") for item in results):
        results = [item for item in results if item.get("_exact_match")]

    for item in results:
        item.pop("score", None)
        item.pop("_exact_match", None)
        if item.get("collection") == "history":
            item.pop("location", None)
            item.pop("mapLink", None)

    limit = 5 if special_type in ("history", "modern") else 20
    return jsonify(results[:limit])


# =========================================================
# GENERAL ROUTES
# =========================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "MyCalinan API is running", "database": "mycalinan_db", "collections": db.list_collection_names()})


@app.route("/api/test", methods=["GET"])
def test_database():
    info = {}
    for name in COLLECTIONS:
        try:
            info[name] = db[name].count_documents({})
        except Exception:
            info[name] = 0
    return jsonify(info)


@app.route("/api/places", methods=["GET"])
def get_all_places():
    all_data = []
    for name in COLLECTIONS:
        try:
            data = list(db[name].find({}, {"_id": 0}))
            for item in data:
                item["collection"] = name
                all_data.append(item)
        except Exception as e:
            print(f"Error loading {name}:", e)
    return jsonify(all_data)


# =========================================================
# TRANSLATION
# =========================================================

translation_cache = {}

def google_translate(value, target):
    url = "https://translate.googleapis.com/translate_a/single"
    params = {"client": "gtx", "sl": "auto", "tl": target, "dt": "t", "q": value}
    response = requests.get(url, params=params, timeout=4)
    response.raise_for_status()
    data = response.json()
    return "".join(part[0] for part in data[0] if part[0])


def translate_one(value, target="ceb"):
    value = str(value or "").strip()
    if value == "":
        return ""
    if target == "cebuano":
        target = "ceb"
    if target not in ["ceb", "tl", "en"]:
        target = "ceb"
    if target == "en":
        return value
    key = f"{target}:{value}"
    if key in translation_cache:
        return translation_cache[key]
    try:
        translated = google_translate(value, target)
        translation_cache[key] = translated
        return translated
    except Exception:
        return value


@app.route("/api/translate", methods=["POST"])
def translate_text():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    texts = data.get("texts", [])
    target = data.get("target", "ceb")
    if isinstance(text, str) and text.strip():
        return jsonify({"translated": translate_one(text, target)})
    if isinstance(texts, list) and len(texts) > 0:
        return jsonify({"translated": [translate_one(item, target) for item in texts]})
    return jsonify({"translated": ""})


# =========================================================
# ADMIN AUTH
# =========================================================

admin_db = client["mycalinan_admin_db"]
admins_collection = admin_db["admins"]

try:
    admins_collection.create_index("username", unique=True)
except OperationFailure as e:
    print("⚠️ Could not create unique index on admins.username:", e)

JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 12
ROLE_RANK = {"admin": 1, "superadmin": 2}

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "Calinan_Admin_2026!"
DEFAULT_SUPERADMIN_USERNAME = "superadmin"
DEFAULT_SUPERADMIN_PASSWORD = "Calinan_SuperAdmin_2026!"


def ensure_default_admins():
    defaults = [
        {"username": DEFAULT_ADMIN_USERNAME, "password": DEFAULT_ADMIN_PASSWORD, "role": "admin", "full_name": "Default Admin"},
        {"username": DEFAULT_SUPERADMIN_USERNAME, "password": DEFAULT_SUPERADMIN_PASSWORD, "role": "superadmin", "full_name": "Default Super Admin"},
    ]
    for acc in defaults:
        existing = admins_collection.find_one({"username": acc["username"]})
        if existing:
            admins_collection.update_one(
                {"username": acc["username"]},
                {"$set": {"password_hash": generate_password_hash(acc["password"]), "role": acc["role"], "full_name": acc["full_name"], "must_change_password": False}},
            )
            print(f"🔄 Synced '{acc['role']}' account -> username: '{acc['username']}'")
        else:
            try:
                admins_collection.insert_one({
                    "username": acc["username"],
                    "password_hash": generate_password_hash(acc["password"]),
                    "role": acc["role"],
                    "full_name": acc["full_name"],
                    "created_at": datetime.now(timezone.utc),
                    "must_change_password": False,
                })
                print(f"✅ Created '{acc['role']}' account -> username: '{acc['username']}'")
            except DuplicateKeyError:
                pass


def generate_token(admin):
    payload = {
        "sub": admin["username"],
        "role": admin["role"],
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def admin_required(min_role=None):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid Authorization header"}), 401
            token = auth_header.split(" ", 1)[1].strip()
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Session expired, please log in again"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401
            if min_role and ROLE_RANK.get(payload.get("role"), 0) < ROLE_RANK.get(min_role, 0):
                return jsonify({"error": "Insufficient permissions"}), 403
            request.admin = payload
            return f(*args, **kwargs)
        return wrapped
    return decorator


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    admin = admins_collection.find_one({"username": username})
    if not admin or not check_password_hash(admin["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401
    token = generate_token(admin)
    return jsonify({"token": token, "username": admin["username"], "role": admin["role"], "full_name": admin.get("full_name", ""), "must_change_password": admin.get("must_change_password", False)})


@app.route("/api/admin/me", methods=["GET"])
@admin_required()
def admin_me():
    admin = admins_collection.find_one({"username": request.admin["sub"]}, {"_id": 0, "password_hash": 0})
    if not admin:
        return jsonify({"error": "Account not found"}), 404
    return jsonify(admin)


@app.route("/api/admin/change-password", methods=["POST"])
@admin_required()
def admin_change_password():
    data = request.get_json(silent=True) or {}
    current_password = str(data.get("current_password", ""))
    new_password = str(data.get("new_password", ""))
    if not new_password or len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400
    admin = admins_collection.find_one({"username": request.admin["sub"]})
    if not admin or not check_password_hash(admin["password_hash"], current_password):
        return jsonify({"error": "Current password is incorrect"}), 401
    admins_collection.update_one(
        {"username": admin["username"]},
        {"$set": {"password_hash": generate_password_hash(new_password), "must_change_password": False}},
    )
    return jsonify({"message": "Password updated successfully"})


@app.route("/api/admin/create", methods=["POST"])
@admin_required(min_role="superadmin")
def admin_create():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    role = data.get("role", "admin")
    full_name = data.get("full_name", "")
    if role not in ROLE_RANK:
        return jsonify({"error": "Role must be 'admin' or 'superadmin'"}), 400
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if admins_collection.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 409
    admins_collection.insert_one({
        "username": username,
        "password_hash": generate_password_hash(password),
        "role": role,
        "full_name": full_name,
        "created_at": datetime.now(timezone.utc),
        "must_change_password": True,
        "created_by": request.admin["sub"],
    })
    return jsonify({"message": f"Account '{username}' created successfully"}), 201


@app.route("/api/admin/list", methods=["GET"])
@admin_required(min_role="superadmin")
def admin_list():
    accounts = list(admins_collection.find({}, {"_id": 0, "password_hash": 0}))
    return jsonify(accounts)


# =========================================================
# ANNOUNCEMENTS  (public GET, protected POST/PUT/DELETE)
# =========================================================

def serialize_announcement(doc):
    """Convert a MongoDB doc to a JSON-safe dict."""
    doc["_id"] = str(doc["_id"])
    return doc


@app.route("/api/announcements", methods=["GET"])
def get_announcements():
    """Public — no auth needed. Returns newest-first."""
    try:
        announcements = list(
            db["announcements"].find().sort("_id", -1)
        )
        return jsonify([serialize_announcement(a) for a in announcements])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/announcements", methods=["POST"])
@admin_required()
def create_announcement():
    """Protected — any logged-in admin can create."""
    try:
        data = request.get_json(silent=True) or {}
        if not data.get("title") or not data.get("description"):
            return jsonify({"error": "Title and description are required"}), 400

        announcement = {
            "title":       data.get("title", "").strip(),
            "description": data.get("description", "").strip(),
            "category":    data.get("category", "General").strip(),
            "date":        data.get("date", ""),
            "image":       data.get("image", ""),
            "created_at":  datetime.now(timezone.utc),
            "created_by":  request.admin["sub"],
        }
        result = db["announcements"].insert_one(announcement)
        return jsonify({"message": "Announcement created successfully", "id": str(result.inserted_id)}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/announcements/<announcement_id>", methods=["PUT"])
@admin_required()
def update_announcement(announcement_id):
    """Protected — update an existing announcement."""
    try:
        data = request.get_json(silent=True) or {}
        updates = {k: v for k, v in {
            "title":       data.get("title"),
            "description": data.get("description"),
            "category":    data.get("category"),
            "date":        data.get("date"),
            "image":       data.get("image"),
        }.items() if v is not None}

        if not updates:
            return jsonify({"error": "No fields to update"}), 400

        updates["updated_at"] = datetime.now(timezone.utc)
        updates["updated_by"] = request.admin["sub"]

        result = db["announcements"].update_one(
            {"_id": ObjectId(announcement_id)}, {"$set": updates}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Announcement not found"}), 404
        return jsonify({"message": "Announcement updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/announcements/<announcement_id>", methods=["DELETE"])
@admin_required()
def delete_announcement(announcement_id):
    """Protected — delete an announcement."""
    try:
        result = db["announcements"].delete_one({"_id": ObjectId(announcement_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Announcement not found"}), 404
        return jsonify({"message": "Announcement deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================================================
# EVENTS & FESTIVALS  (public GET, protected POST/PUT/DELETE)
# =========================================================

def serialize_event(doc):
    """Convert a MongoDB event doc to a JSON-safe dict."""
    doc["_id"] = str(doc["_id"])
    return doc


@app.route("/api/events", methods=["GET"])
def get_events():
    """Public — returns all events, newest first."""
    try:
        events = list(db["events"].find().sort("_id", -1))
        return jsonify([serialize_event(e) for e in events])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/events", methods=["POST"])
@admin_required()
def create_event():
    """Protected — create a new event."""
    try:
        data = request.get_json(silent=True) or {}
        if not data.get("name") or not data.get("date"):
            return jsonify({"error": "Event name and date are required"}), 400

        event = {
            "name":        data.get("name", "").strip(),
            "date":        data.get("date", ""),
            "location":    data.get("location", "").strip(),
            "category":    data.get("category", "Festival").strip(),
            "description": data.get("description", "").strip(),
            "image":       data.get("image", ""),
            "created_at":  datetime.now(timezone.utc),
            "created_by":  request.admin["sub"],
        }
        result = db["events"].insert_one(event)
        return jsonify({"message": "Event created successfully", "id": str(result.inserted_id)}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/events/<event_id>", methods=["PUT"])
@admin_required()
def update_event(event_id):
    """Protected — update an existing event."""
    try:
        data = request.get_json(silent=True) or {}
        updates = {k: v for k, v in {
            "name":        data.get("name"),
            "date":        data.get("date"),
            "location":    data.get("location"),
            "category":    data.get("category"),
            "description": data.get("description"),
            "image":       data.get("image"),
        }.items() if v is not None}

        if not updates:
            return jsonify({"error": "No fields to update"}), 400

        updates["updated_at"] = datetime.now(timezone.utc)
        updates["updated_by"] = request.admin["sub"]

        result = db["events"].update_one(
            {"_id": ObjectId(event_id)}, {"$set": updates}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Event not found"}), 404
        return jsonify({"message": "Event updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/events/<event_id>", methods=["DELETE"])
@admin_required()
def delete_event(event_id):
    """Protected — delete an event."""
    try:
        result = db["events"].delete_one({"_id": ObjectId(event_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Event not found"}), 404
        return jsonify({"message": "Event deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================================================
# STARTUP
# =========================================================

if __name__ == "__main__":
    print("Collections:", db.list_collection_names())
    ensure_text_indexes()
    ensure_default_admins()
    app.run(debug=True, port=5000)