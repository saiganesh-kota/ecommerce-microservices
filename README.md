# ShopWave E-Commerce Platform

Full-stack e-commerce application built with React, Node.js/Express, MongoDB, and Python/FastAPI.

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 18, React Router 6, Axios, Stripe |
| Backend    | Node.js 20, Express 4, JWT Auth         |
| Database   | MongoDB 7 + Mongoose ODM                |
| ML Service | Python 3.11, FastAPI, NumPy             |
| Cache      | Redis 7                                 |
| DevOps     | Docker, Docker Compose                  |

---

## Project Structure

```
shopwave/
├── backend/
│   ├── server.js              # Express entry point
│   ├── models/
│   │   ├── User.js            # User schema (bcrypt, JWT, OAuth)
│   │   ├── Product.js         # Product schema (reviews, variants, SEO)
│   │   ├── Order.js           # Order schema (status history, tracking)
│   │   └── Cart.js            # Cart schema (promo codes, subtotal virtual)
│   ├── routes/
│   │   ├── auth.js            # Register, login, refresh, forgot/reset password
│   │   ├── products.js        # CRUD, search, filter, sort, reviews
│   │   ├── orders.js          # Create, pay, status update, history
│   │   ├── cart.js            # Add/update/remove items, promo codes
│   │   ├── users.js           # Profile, wishlist, addresses
│   │   └── admin.js           # Dashboard analytics, user management
│   ├── middleware/
│   │   └── auth.js            # JWT protect, admin guard, optionalAuth
│   ├── config/
│   │   └── seed.js            # Database seeder (12 products, 3 users)
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   └── src/
│       ├── App.js             # Router, lazy loading, route guards
│       ├── services/
│       │   └── api.js         # Axios instance, all API methods, auto-refresh
│       ├── context/
│       │   ├── AuthContext.js # Auth state, login/register/logout
│       │   └── CartContext.js # Cart state, add/remove/update
│       ├── hooks/
│       │   └── index.js       # useProducts, useOrders, useWishlist, useDebounce, useToast
│       └── pages/
│           ├── Home.js        # Hero, featured products, categories
│           ├── Shop.js        # Products grid, filters, search, sort, pagination
│           ├── Product.js     # Detail page, reviews, also-bought
│           ├── Cart.js        # Cart items, promo, order summary
│           ├── Checkout.js    # 3-step checkout (shipping → payment → review)
│           ├── Orders.js      # Order history list
│           ├── OrderDetail.js # Order tracking, status timeline
│           ├── Wishlist.js    # Saved products
│           ├── Profile.js     # Personal info, addresses, security, preferences
│           ├── Login.js       # Login form + OAuth buttons
│           ├── Register.js    # Registration form
│           ├── Admin.js       # Dashboard, products, orders, users
│           └── NotFound.js    # 404 page
│
├── python/
│   ├── main.py                # FastAPI ML service
│   ├── requirements.txt
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Quick Start (Docker)

```bash
# 1. Clone and enter project
git clone https://github.com/yourname/shopwave.git
cd shopwave

# 2. Set environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your secrets

# 3. Start all services
docker-compose up -d

# 4. Seed the database
docker exec shopwave_backend node config/seed.js

# 5. Open browser
# Frontend:   http://localhost:3000
# API:        http://localhost:5000/api
# ML Service: http://localhost:8000/docs
```

---

## Manual Setup (Development)

### 1. MongoDB
```bash
# macOS
brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community

# Ubuntu
sudo apt install mongodb && sudo systemctl start mongod
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env        # Fill in your values
npm run seed                # Seed database
npm run dev                 # Start with nodemon on :5000
```

### 3. Frontend
```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local
npm start                   # React dev server on :3000
```

### 4. Python ML Service
```bash
cd python
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# OpenAPI docs: http://localhost:8000/docs
```

---

## API Reference

### Auth
| Method | Endpoint                         | Description               |
|--------|----------------------------------|---------------------------|
| POST   | /api/auth/register               | Create account            |
| POST   | /api/auth/login                  | Login (returns JWT)       |
| POST   | /api/auth/refresh                | Refresh access token      |
| POST   | /api/auth/logout                 | Invalidate refresh token  |
| POST   | /api/auth/forgot-password        | Send reset email          |
| PUT    | /api/auth/reset-password/:token  | Reset with token          |
| GET    | /api/auth/me                     | Get current user          |

### Products
| Method | Endpoint                    | Description                          |
|--------|-----------------------------|--------------------------------------|
| GET    | /api/products               | List (filter, search, sort, paginate)|
| GET    | /api/products/categories    | All categories                       |
| GET    | /api/products/:id           | Single product                       |
| POST   | /api/products               | Create (admin)                       |
| PUT    | /api/products/:id           | Update (admin)                       |
| DELETE | /api/products/:id           | Soft-delete (admin)                  |
| POST   | /api/products/:id/reviews   | Add review (auth)                    |

### Orders
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| POST   | /api/orders            | Place order              |
| GET    | /api/orders/my         | User's order history     |
| GET    | /api/orders/:id        | Order detail             |
| PUT    | /api/orders/:id/pay    | Mark paid + payment result|
| PUT    | /api/orders/:id/status | Update status (admin)    |
| GET    | /api/orders            | All orders (admin)       |

### Cart
| Method | Endpoint           | Description            |
|--------|--------------------|------------------------|
| GET    | /api/cart          | Get user's cart        |
| POST   | /api/cart          | Add item               |
| PUT    | /api/cart/:itemId  | Update quantity        |
| DELETE | /api/cart/:itemId  | Remove item            |
| POST   | /api/cart/promo    | Apply promo code       |
| DELETE | /api/cart          | Clear cart             |

### ML Service (Python :8000)
| Method | Endpoint                    | Description                           |
|--------|-----------------------------|---------------------------------------|
| POST   | /track                      | Track user event (view/cart/purchase) |
| GET    | /recommendations/:userId    | Collaborative filtering recs          |
| GET    | /also-bought/:productId     | Frequently bought together            |
| POST   | /search/rank                | TF-IDF search ranking                 |
| POST   | /sentiment                  | Review sentiment analysis             |
| POST   | /pricing/suggest            | Dynamic pricing suggestions           |
| GET    | /analytics/summary          | Event analytics summary               |

---

## Default Credentials (after seeding)

| Role  | Email                   | Password  |
|-------|-------------------------|-----------|
| Admin | admin@shopwave.com      | admin123  |
| User  | alex@example.com        | user123   |
| User  | sarah@example.com       | user123   |

---

## Promo Codes

| Code       | Discount |
|------------|----------|
| WELCOME10  | 10% off  |
| SAVE20     | 20% off  |
| SUMMER15   | 15% off  |

---

## Features

- JWT authentication with refresh token rotation
- Bcrypt password hashing (salt rounds: 12)
- Role-based access control (user / admin)
- Product search with text indexes + ML re-ranking
- Cart persisted in MongoDB per user
- Multi-step checkout with promo code support
- Order status history timeline
- Wishlist (toggled per product)
- Admin dashboard with revenue/order analytics
- Python ML: collaborative filtering recommendations
- Python ML: "also bought together" co-purchase engine
- Python ML: review sentiment analysis (negation-aware)
- Python ML: dynamic pricing suggestions
- Rate limiting (100 req/15min per IP)
- Helmet.js security headers
- Docker Compose for one-command deployment

---

## Environment Variables

See `backend/.env.example` for all variables. Critical ones:

```
MONGO_URI          - MongoDB connection string
JWT_SECRET         - Random 32+ char string
JWT_REFRESH_SECRET - Different random 32+ char string
STRIPE_SECRET_KEY  - From stripe.com dashboard
CLOUDINARY_*       - From cloudinary.com (product images)
```
