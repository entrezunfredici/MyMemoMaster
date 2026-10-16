graph TD
    %% 1. Client Tier
    subgraph Tier_1 ["1. Client Tier (Internet)"]
        User((Utilisateur / Navigateur))
    end

    %% 2. Edge Tier
    subgraph Tier_2 ["2. Edge Tier (Reverse proxy / Ingress)"]
        Proxy["Traefik (dev, VPS test/prod)<br/>Ingress nginx (Kubernetes preprod/prod)"]
    end

    %% 3. Front Tier
    subgraph Tier_3 ["3. Front Tier (Presentation)"]
        Front["Frontend : Vue.js 3<br/>(build Vite servi par nginx)"]
    end

    %% 4. API Tier
    subgraph Tier_4 ["4. API Tier (Logic & Services)"]
        API_Node["API : Express Node.js<br/>(+ modèle IA embarqué @xenova/transformers)"]
        Worker["Jobs : crons node-cron + worker BullMQ<br/>(rappels, alertes KPI)"]
    end

    %% 5. Data Tier
    subgraph Tier_5 ["5. Data Tier (Persistence)"]
        DB[(PostgreSQL 17)]
        Redis[(Redis 7 — broker BullMQ)]
        S3[(Infomaniak S3 Object Storage<br/>uploads images)]
    end

    %% 6. Services externes
    subgraph Tier_6 ["6. Services externes"]
        Mail["Serveur SMTP<br/>(emails transactionnels)"]
    end

    %% --- FLUX DE COMMUNICATION ---

    %% Du client vers l'Edge
    User -->|Port 80 / 443| Proxy

    %% Routage de l'Edge
    Proxy -->|Requête Web /| Front
    Proxy -->|Appels API /api| API_Node

    %% Interactions au niveau API
    API_Node --- Worker

    %% Accès aux données (Depuis la couche API uniquement)
    API_Node -->|Requêtes SQL — Sequelize| DB
    API_Node -->|Uploads / Sauvegardes Fichiers| S3
    Worker -->|Queue jobs| Redis
    Worker -->|SMTP| Mail

    %% Styles pour la clarté
    style Tier_1 fill:#f9f9f9,stroke:#333,stroke-width:1px
    style Tier_2 fill:#e1f5fe,stroke:#0288d1,stroke-width:1px
    style Tier_3 fill:#e8f5e9,stroke:#388e3c,stroke-width:1px
    style Tier_4 fill:#fff3e0,stroke:#f57c00,stroke-width:1px
    style Tier_5 fill:#ede7f6,stroke:#7b1fa2,stroke-width:1px
    style Tier_6 fill:#fce4ec,stroke:#c2185b,stroke-width:1px
