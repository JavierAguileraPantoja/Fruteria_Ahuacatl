// src/utils/testConnections.js
const mongoose = require('mongoose');
const sqlite = require('sqlite3').verbose();
const { performance } = require('perf_hooks');

async function testMongoConnection(uri, name) {
    const start = performance.now();
    try {
        const conn = await mongoose.createConnection(uri, {
            serverSelectionTimeoutMS: 3000,
        }).asPromise();

        const ms = Math.round(performance.now() - start);
        conn.close();

        return { name, ok: true, time: ms };
    } catch (err) {
        const ms = Math.round(performance.now() - start);
        return { name, ok: false, time: ms, error: err.message };
    }
}

async function testSQLite(path) {
    const start = performance.now();

    return new Promise(resolve => {
        const db = new sqlite.Database(path, sqlite.OPEN_READWRITE, err => {
            const ms = Math.round(performance.now() - start);
            if (err) return resolve({ name: 'SQLite', ok: false, time: ms, error: err.message });

            db.close();
            resolve({ name: 'SQLite', ok: true, time: ms });
        });
    });
}

async function runTests() {
    const atlas = await testMongoConnection(process.env.MONGO_ATLAS_URI, 'MongoDB Atlas');
    const local = await testMongoConnection(process.env.MONGO_LOCAL_URI, 'MongoDB Local');
    const sqlite = await testSQLite(process.env.SQLITE_PATH);

    return { atlas, local, sqlite };
}

module.exports = runTests;
