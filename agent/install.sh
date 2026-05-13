#!/bin/bash
# Script d'installation de l'Agent XIBAAR AI
# Usage : curl -sSL https://xibaar.local/install.sh | bash

echo "=================================="
echo "  🛡️  Installation Agent XIBAAR AI"
echo "=================================="

# 1. Vérifier Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 non trouvé. Installation..."
    apt-get update && apt-get install -y python3 python3-pip
fi

# 2. Installer les dépendances
echo "📦 Installation des dépendances..."
pip3 install tailer requests psutil --quiet

# 3. Télécharger l'agent
echo "⬇️  Téléchargement de l'agent..."
curl -sSL http://localhost:8000/agent/download -o /opt/xibaar-agent.py

# 4. Créer le service systemd
cat > /etc/systemd/system/xibaar-agent.service << EOF
[Unit]
Description=XIBAAR AI Security Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/xibaar-agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 5. Démarrer le service
systemctl daemon-reload
systemctl enable xibaar-agent
systemctl start xibaar-agent

echo ""
echo "✅ Agent XIBAAR installé et démarré !"
echo "   Statut : systemctl status xibaar-agent"
