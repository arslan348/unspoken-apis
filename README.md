# Ecommerce Store - Node.js & MongoDB

A full-stack ecommerce application built with Node.js, Express, and MongoDB. Features user authentication, product management, and more.

## Features

- **User Authentication**: Register and login with JWT tokens
- **Product Management**: Add, edit, delete, and view products
- **Role-based Access**: User and admin roles with different permissions
- **MongoDB Integration**: NoSQL database for data persistence

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance like MongoDB Atlas)
- npm or yarn

## Installation

1. **Clone or download the project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file** (copy from `.env.example`)
   ```bash
   cp .env.example .env
   ```

4. **Update `.env` with your configuration**
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ecommerce
   JWT_SECRET=your_secret_key_here
   NODE_ENV=development
   ```

## Running the Project

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (protected)
- `PUT /api/products/:id` - Update product (protected)
- `DELETE /api/products/:id` - Delete product (protected)

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/         # MongoDB models
├── routes/         # API routes
└── index.js        # Main app file
```

## Technologies Used

- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## Next Steps

1. Set up MongoDB (local or MongoDB Atlas)
2. Configure environment variables
3. Run the project
4. Test API endpoints using Postman or similar tool

## Notes

- All password-protected routes require a valid JWT token in the Authorization header
- Tokens expire after 7 days
- Only admins can update/delete products created by other users
