#!/bin/bash

# ododocs Infrastructure Management Script
# Usage: ./manage.sh [command]
# If no command is provided, an interactive menu is shown.

set -e

# Configuration
# Resolve the directory where the script is located
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="ododocs"
VOLUMES_DIR="$HOME/volumes/$APP_NAME"
ENV_FILE="$BASE_DIR/.env"
INFRA_FILE="$BASE_DIR/infra.prod.yaml"
PROD_FILE="$BASE_DIR/prod.yaml"
SECRETS_DIR="$BASE_DIR/secrets"
CLOUDFLARE_INI="$SECRETS_DIR/cloudflare.ini"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo
logo() {
    echo -e "${BLUE}"
    echo "   ___  ___  ___  ___  ___  ___ ___ "
    echo "  / _ \/ _ \/ _ \/ _ \/ _ \/ __/ __|"
    echo " | (_) | (_) | (_) | (_) | (_) | (__\__ \\"
    echo "  \___/ \___/ \___/ \___/ \___/ \___|___/"
    echo -e "${NC}"
    echo -e "      ${GREEN}Infrastructure Manager v2.0${NC}"
    echo ""
}

log() { echo -e "${GREEN}[$APP_NAME]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# --- Checks ---

check_root() {
    if [ "$EUID" -ne 0 ]; then
        warn "Some operations (apt install, certbot) require root privileges."
        warn "If this script fails, try running with 'sudo'."
    fi
}

check_env_vars() {
    local missing_vars=()
    local required_vars=(
        "POSTGRES_USER"
        "POSTGRES_PASSWORD"
        "POSTGRES_DB"
        "POSTGRES_PORT"
        "REDIS_PORT"
        "MINIO_PORT_API"
        "MINIO_PORT_CONSOLE"
        "OBJECT_STORAGE_ACCESS_KEY"
        "OBJECT_STORAGE_SECRET_KEY"
        "CLOUDFLARE_EMAIL"
        "CLOUDFLARE_API_TOKEN"
    )

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        error "The following required environment variables are missing or empty in .env:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        error "Please edit your .env file and set these values."
        exit 1
    fi
}

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        error ".env file missing. Run 'Init' first."
        exit 1
    fi
    source "$ENV_FILE"
    check_env_vars
    log ".env file is valid."
}

# --- Functions ---

init() {
    log "Initializing infrastructure..."

    # 1. Create Directories
    log "Creating directories..."
    mkdir -p "$VOLUMES_DIR/postgres"
    mkdir -p "$VOLUMES_DIR/redis"
    mkdir -p "$VOLUMES_DIR/minio"
    mkdir -p "$VOLUMES_DIR/nginx_logs"
    mkdir -p "$SECRETS_DIR"

    # 2. Env File
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f ".env.prod.example" ]; then
            cp .env.prod.example .env
            warn "Created .env from .env.prod.example. PLEASE EDIT IT with your actual secrets!"
        else
            warn ".env.prod.example not found. Creating empty .env..."
            touch .env
        fi
    else
        log ".env already exists."
    fi

    # 3. Install Dependencies (Debian/Ubuntu)
    if command -v apt-get &> /dev/null; then
        info "Detected apt-get. Checking dependencies..."
        
        # Check Certbot
        if ! command -v certbot &> /dev/null; then
            warn "Certbot not found. Installing..."
            sudo apt-get update
            sudo apt-get install -y certbot python3-certbot-dns-cloudflare
        else
            log "Certbot is installed."
        fi
    else
        warn "Not a Debian/Ubuntu system or cannot install packages automatically."
        warn "Please ensure 'certbot' and 'python3-certbot-dns-cloudflare' are installed manually."
    fi

    # 4. Setup Cloudflare Credentials
    generate_cloudflare_ini
    
    log "Initialization complete."
}

generate_cloudflare_ini() {
    check_env
    
    # Try to get from env if not set
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        warn "CLOUDFLARE_API_TOKEN is not set in .env."
        read -p "Enter Cloudflare API Token (input will be saved to .env): " INPUT_TOKEN
        
        # Trim input
        INPUT_TOKEN=$(echo "$INPUT_TOKEN" | xargs)
        
        if [ -n "$INPUT_TOKEN" ]; then
            # Append to .env if not exists, or replace? Simple append for now if missing
            if grep -q "CLOUDFLARE_API_TOKEN=" "$ENV_FILE"; then
                sed -i "s|CLOUDFLARE_API_TOKEN=.*|CLOUDFLARE_API_TOKEN=$INPUT_TOKEN|" "$ENV_FILE"
            else
                echo "" >> "$ENV_FILE"
                echo "CLOUDFLARE_API_TOKEN=$INPUT_TOKEN" >> "$ENV_FILE"
            fi
            CLOUDFLARE_API_TOKEN="$INPUT_TOKEN"
        else
            error "No token provided."
            return 1
        fi
    fi

    # Trim token from env
    local TRIMMED_TOKEN=$(echo "$CLOUDFLARE_API_TOKEN" | xargs)

    if [ -n "$TRIMMED_TOKEN" ]; then
        echo "dns_cloudflare_api_token = $TRIMMED_TOKEN" > "$CLOUDFLARE_INI"
        chmod 600 "$CLOUDFLARE_INI"
        log "Regenerated $CLOUDFLARE_INI (token: ${TRIMMED_TOKEN:0:4}...)"
    else
        error "CLOUDFLARE_API_TOKEN is empty."
        exit 1
    fi
}

cert_issue() {
    check_env
    generate_cloudflare_ini # Ensure INI is fresh from ENV
    
    log "Issuing Certificate for *.ododocs.com..."

    if [ ! -f "$CLOUDFLARE_INI" ]; then
        error "Cloudflare credentials check failed."
        exit 1
    fi

    sudo certbot certonly \
        --dns-cloudflare \
        --dns-cloudflare-credentials "$CLOUDFLARE_INI" \
        --dns-cloudflare-propagation-seconds 10 \
        --email "$CLOUDFLARE_EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "ododocs.com" \
        -d "*.ododocs.com" \
        --server https://acme-v02.api.letsencrypt.org/directory
    
    log "Certificate issued."
}

cert_renew() {
    log "Attempting Certificate Renewal (Dry Run)..."
    sudo certbot renew --dry-run
    log "Dry run complete. To renew for real, run 'sudo certbot renew'."
}

setup_cron() {
    log "Setting up Cron for auto-renewal..."
    # Add a cron job to renew certs and reload nginx
    CRON_CMD="0 3 * * * certbot renew --quiet --deploy-hook 'docker exec ododocs-nginx nginx -s reload'"
    
    # Check if already exists
    if crontab -l 2>/dev/null | grep -q "certbot renew"; then
        log "Cron job already exists."
    else
        (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
        log "Cron job added: $CRON_CMD"
    fi
}

deploy() {
    check_env
    log "Deploying Services..."
    
    # 1. Start Infrastructure
    log "Starting Infrastructure (Postgres, Redis, Minio)..."
    docker compose --env-file "$ENV_FILE" -f "$INFRA_FILE" up -d
    
    log "Waiting for infrastructure to be ready..."
    sleep 5
    
    # 2. Start Application
    log "Starting Applications (Frontend, Backend, Nginx)..."
    docker compose --env-file "$ENV_FILE" -f "$PROD_FILE" up -d
    
    log "Deployment Complete."
    docker ps | grep ododocs
}

down() {
    log "Stopping Services..."
    
    # Stop App first
    docker compose --env-file "$ENV_FILE" -f "$PROD_FILE" down
    
    # Stop Infra
    docker compose --env-file "$ENV_FILE" -f "$INFRA_FILE" down
    
    log "All services stopped."
}

logs() {
    log "Streaming Logs (Ctrl+C to exit)..."
    
    trap 'kill $PID_INFRA $PID_PROD; exit' SIGINT SIGTERM
    
    docker compose --env-file "$ENV_FILE" -f "$INFRA_FILE" logs -f &
    PID_INFRA=$!
    docker compose --env-file "$ENV_FILE" -f "$PROD_FILE" logs -f &
    PID_PROD=$!
    
    wait
}

reload_nginx() {
    log "Reloading Nginx..."
    docker exec ododocs-nginx nginx -s reload
    log "Nginx Reloaded."
}

# --- Interactive Menu ---

menu() {
    while true; do
        clear
        logo
        echo "1. Initialize (Install dependencies, create dirs)"
        echo "2. Issue Certificate (Certbot)"
        echo "3. Setup Auto-Renewal (Cron)"
        echo "4. Deploy All/Update"
        echo "5. Stop All"
        echo "6. View Logs"
        echo "7. Reload Nginx"
        echo "8. Exit"
        echo ""
        read -p "Select an option [1-8]: " choice

        case $choice in
            1) init ;;
            2) cert_issue ;;
            3) setup_cron ;;
            4) deploy ;;
            5) down ;;
            6) logs ;;
            7) reload_nginx ;;
            8) exit 0 ;;
            *) echo "Invalid option." ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# --- Main Switch ---

if [ -z "$1" ]; then
    menu
else
    case "$1" in
        init) init ;;
        cert-issue) cert_issue ;;
        cert-renew) cert_renew ;;
        setup-cron) setup_cron ;;
        deploy) deploy ;;
        down) down ;;
        logs) logs ;;
        reload-nginx) reload_nginx ;;
        *)
            echo "Usage: ./manage.sh [command]"
            echo "Commands: init, cert-issue, cert-renew, setup-cron, deploy, down, logs, reload-nginx"
            exit 1
            ;;
    esac
fi
