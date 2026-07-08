const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const dbURI = process.env.MONGODB_URI || 'mongodb+srv://PCasthub:Phong113%40@cluster0.5gzj7am.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
        const conn = await mongoose.connect(dbURI);
        console.log(`Connected to MongoDB: ${conn.connection.host}`);
    } catch (err) {
        console.error(`MongoDB connection error: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
