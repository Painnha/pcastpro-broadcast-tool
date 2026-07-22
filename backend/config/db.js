const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
    try {
        const dbURI = process.env.MONGODB_URI || 'mongodb+srv://PCasthub:Phong113%40@cluster0.5gzj7am.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
        
        if (dbURI.startsWith('mongodb+srv://')) {
            try {
                dns.setServers(['8.8.8.8', '1.1.1.1']);
            } catch (dnsErr) {
                console.warn('Warning: Could not set custom DNS servers:', dnsErr.message);
            }
        }

        const conn = await mongoose.connect(dbURI);
        console.log(`Connected to MongoDB: ${conn.connection.host}`);
        
        // Auto-migrate existing users who don't have the permissions field
        const User = require('../models/User');
        const migrateResult = await User.updateMany(
            { permissions: { $exists: false } },
            { $set: { permissions: [] } }
        );
        if (migrateResult.modifiedCount > 0) {
            console.log(`Database Migration: Set default empty permissions for ${migrateResult.modifiedCount} existing users.`);
        }
    } catch (err) {
        console.error(`MongoDB connection error: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
