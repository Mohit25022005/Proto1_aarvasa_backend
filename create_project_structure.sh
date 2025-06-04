#!/bin/bash

set -e

echo "Creating project directory structure..."

# Services
mkdir -p services/user-service/src/{controllers,models,middleware,services,routes,config}
mkdir -p services/listing-service/src/{controllers,models,middleware,services,routes,config}
mkdir -p services/search-service/src/{controllers,services,routes,config}
mkdir -p services/recommendation-service/src/{controllers,models,services,routes,config}
mkdir -p services/notification-service/src/{controllers,services,routes,config}
mkdir -p services/analytics-service/src/{controllers,services,routes,config}

# API Gateway
mkdir -p api-gateway/src/{routes,middleware,config}

# Shared utilities
mkdir -p shared/utils
mkdir -p shared/constants

# Scripts
mkdir -p scripts

echo "Creating placeholder files..."

# user-service files
touch services/user-service/src/controllers/{authController.js,userController.js}
touch services/user-service/src/models/{userModel.js,roleModel.js}
touch services/user-service/src/middleware/{authMiddleware.js,roleMiddleware.js}
touch services/user-service/src/services/{kycService.js,sessionService.js}
touch services/user-service/src/routes/{authRoutes.js,userRoutes.js}
touch services/user-service/src/config/{db.js,redis.js,env.js}
touch services/user-service/src/{app.js,package.json,Dockerfile,.env}

# listing-service files
touch services/listing-service/src/controllers/{listingController.js,moderationController.js}
touch services/listing-service/src/models/{listingModel.js,verificationModel.js}
touch services/listing-service/src/middleware/authMiddleware.js
touch services/listing-service/src/services/{geoService.js,fraudDetection.js,imageService.js}
touch services/listing-service/src/routes/listingRoutes.js
touch services/listing-service/src/config/{db.js,elasticsearch.js,kafka.js}
touch services/listing-service/src/{app.js,package.json,Dockerfile,.env}

# search-service files
touch services/search-service/src/controllers/searchController.js
touch services/search-service/src/services/{searchEngine.js,filterService.js}
touch services/search-service/src/routes/searchRoutes.js
touch services/search-service/src/config/{elasticsearch.js,redis.js}
touch services/search-service/src/{app.js,package.json,Dockerfile,.env}

# recommendation-service files
touch services/recommendation-service/src/controllers/recommendationController.js
touch services/recommendation-service/src/models/preferenceModel.js
touch services/recommendation-service/src/services/{recommendationEngine.js,trendService.js}
touch services/recommendation-service/src/routes/recommendationRoutes.js
touch services/recommendation-service/src/config/{db.js,redis.js}
touch services/recommendation-service/src/{app.js,package.json,Dockerfile,.env}

# notification-service files
touch services/notification-service/src/controllers/{notificationController.js,realtimeController.js}
touch services/notification-service/src/services/{notificationService.js,websocketService.js}
touch services/notification-service/src/routes/notificationRoutes.js
touch services/notification-service/src/config/{kafka.js,websocket.js}
touch services/notification-service/src/{app.js,package.json,Dockerfile,.env}

# analytics-service files
touch services/analytics-service/src/controllers/analyticsController.js
touch services/analytics-service/src/services/{analyticsEngine.js,priceEstimation.js}
touch services/analytics-service/src/routes/analyticsRoutes.js
touch services/analytics-service/src/config/{db.js,kafka.js}
touch services/analytics-service/src/{app.js,package.json,Dockerfile,.env}

# API Gateway files
touch api-gateway/src/routes/proxyRoutes.js
touch api-gateway/src/middleware/{rateLimiter.js,authMiddleware.js}
touch api-gateway/src/config/env.js
touch api-gateway/src/{app.js,package.json,Dockerfile,.env}

# Shared utilities
touch shared/utils/{logger.js,errorHandler.js,textSimilarity.js,imageHash.js}
touch shared/constants/{roles.js,errorCodes.js}
touch shared/package.json

# Scripts
touch scripts/{deploy.sh,seedDb.js}

# Root files
touch docker-compose.yml .gitignore README.md package.json

echo "Directory structure and placeholder files created successfully!"



