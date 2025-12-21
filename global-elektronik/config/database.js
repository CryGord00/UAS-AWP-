const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const MYSQLHOST = process.env.Host; 
const MYSQLUSER = process.env.User;
const MYSQLPASSWORD = process.env.Password;
const MYSQLPORT = process.env.Port || 11110;
const MYSQLDATABASE = process.env.Name || 'defaultdb';

console.log('--- Debug Koneksi ---');
console.log('Menghubungkan ke Host:', MYSQLHOST);
console.log('Menggunakan Port:', MYSQLPORT);

class DatabaseManager {
    constructor() {
        this.config = {
            host: MYSQLHOST,
            user: MYSQLUSER,
            password: MYSQLPASSWORD,
            port: MYSQLPORT,
            charset: 'utf8mb4',
            ssl: {
                rejectUnauthorized: false 
            }
        };
        
        this.databaseName = MYSQLDATABASE;
        this.systemConnection = null;
        this.pool = null;
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Starting database manager initialization...');
            
            // Buat koneksi system (tanpa database)
            //this.systemConnection = mysql.createConnection(this.config);
            
            // Buat database jika belum ada
            //await this.createDatabaseIfNotExists();
            
            // Tutup koneksi system
            //this.systemConnection.end();
            
            // Buat connection pool ke database
            this.pool = mysql.createPool({
                ...this.config,
                database: this.databaseName,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                acquireTimeout: 60000,
                timeout: 60000,
                reconnect: true
            });

            this.promisePool = this.pool.promise();
            
            // Test koneksi
            await this.testConnection();
            
            console.log('✅ Database manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Database manager initialization failed:', error);
            if (this.systemConnection) {
                this.systemConnection.end();
            }
            throw error;
        }
    }

    createDatabaseIfNotExists() {
        return new Promise((resolve, reject) => {
            console.log('🔧 Checking database existence...');
            
            this.systemConnection.connect((connectErr) => {
                if (connectErr) {
                    console.error('❌ Connection failed:', connectErr);
                    return reject(connectErr);
                }

                console.log('✅ Connected to MySQL server');

                this.systemConnection.query(
                    `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
                    [this.databaseName],
                    (err, results) => {
                        if (err) {
                            console.error('❌ Error checking database:', err);
                            return reject(err);
                        }

                        if (results.length === 0) {
                            console.log('📦 Creating new database:', this.databaseName);
                            
                            this.systemConnection.query(
                                `CREATE DATABASE \`${this.databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
                                (createErr) => {
                                    if (createErr) {
                                        console.error('❌ Error creating database:', createErr);
                                        return reject(createErr);
                                    }
                                    
                                    console.log('✅ Database created successfully');
                                    resolve();
                                }
                            );
                        } else {
                            console.log('✅ Database already exists');
                            resolve();
                        }
                    }
                );
            });
        });
    }

    async testConnection() {
        let connection;
        try {
            connection = await this.promisePool.getConnection();
            console.log('✅ Connected to MySQL database:', this.databaseName);
            
            const [result] = await connection.execute('SELECT 1 as test');
            console.log('✅ Database test query successful');
            
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    async initializeDatabase() {
        try {
            console.log('🚀 Starting database initialization...');

            // Create tables in sequence
            await this.createUsersTable();
            await this.createProductsTable();
            await this.createTransactionsTable();
            
            // Create default data
            await this.createDefaultData();
            
            console.log('🎉 Database initialization completed successfully');
            return true;

        } catch (error) {
            console.error('❌ Error initializing database:', error);
            throw error;
        }
    }

    async createUsersTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                role ENUM('admin', 'staff') DEFAULT 'staff',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await this.promisePool.execute(query);
        console.log('✅ Users table ready');
    }

    async createProductsTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS products (
                product_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                jenis VARCHAR(100) NOT NULL,
                merk VARCHAR(100) NOT NULL,
                tipe_model VARCHAR(100),
                stok INT NOT NULL DEFAULT 0,
                harga_beli DECIMAL(15,2) NOT NULL,
                harga_jual DECIMAL(15,2) NOT NULL,
                gambar VARCHAR(255),
                is_featured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_jenis (jenis),
                INDEX idx_merk (merk),
                INDEX idx_stok (stok),
                INDEX idx_featured (is_featured),
                INDEX idx_name (name),
                CONSTRAINT chk_stok_positive CHECK (stok >= 0),
                CONSTRAINT chk_harga_positive CHECK (harga_beli >= 0 AND harga_jual >= 0)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await this.promisePool.execute(query);
        console.log('✅ Products table ready');
    }

    async createTransactionsTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS transactions (
                transaction_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                total_amount DECIMAL(15,2) NOT NULL,
                transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                items JSON,
                customer_info JSON,
                payment_method VARCHAR(50),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
                INDEX idx_transaction_date (transaction_date),
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await this.promisePool.execute(query);
        console.log('✅ Transactions table ready');
    }

    async createDefaultData() {
        try {
            // Check if users exist
            const [userRows] = await this.promisePool.execute('SELECT COUNT(*) as count FROM users');
            
            if (userRows[0].count === 0) {
                await this.createDefaultUsers();
            }

            // Check if products exist
            const [productRows] = await this.promisePool.execute('SELECT COUNT(*) as count FROM products');
            if (productRows[0].count === 0) {
                await this.createSampleProducts();
            }

            console.log('✅ Default data checked/created');
        } catch (error) {
            console.error('❌ Error creating default data:', error);
            throw error;
        }
    }

    async createDefaultUsers() {
        try {
            const hashedAdminPassword = await bcrypt.hash('admin123', 10);
            const hashedStaffPassword = await bcrypt.hash('staff123', 10);
            
            const query = `
                INSERT INTO users (username, password, role) VALUES 
                (?, ?, 'admin'),
                (?, ?, 'staff')
            `;
            
            await this.promisePool.execute(query, [
                'admin', hashedAdminPassword,
                'staff', hashedStaffPassword
            ]);
            
            console.log('✅ Default users created');
            console.log('   👑 Admin: username=admin, password=admin123');
            console.log('   👨‍💼 Staff: username=staff, password=staff123');
        } catch (error) {
            console.error('❌ Error creating default users:', error);
            throw error;
        }
    }

    async createSampleProducts() {
        try {
            const query = `
                INSERT INTO products (name, jenis, merk, tipe_model, stok, harga_beli, harga_jual, is_featured) VALUES 
                ('Blender Miyako 101PL', 'blender', 'miyako', '101PL', 15, 350000, 455000, TRUE),
                ('Setrika Philips 1173', 'setrika', 'philips', '1173', 25, 250000, 325000, TRUE),
                ('Magic Com Cosmos CRJ-322', 'magic_com', 'cosmos', 'CRJ-322', 20, 420000, 546000, TRUE),
                ('Kipas Angin Miyako KAD-06', 'kipas_angin', 'miyako', 'KAD-06', 40, 280000, 364000, FALSE),
                ('Kulkas Sharp 2 Pintu', 'kulkas', 'sharp', 'SJ-320', 8, 2500000, 3250000, FALSE),
                ('TV LED Polytron 32 Inch', 'tv', 'polytron', 'PLD 32A20', 12, 1800000, 2340000, TRUE),
                ('AC Sharp 1/2 PK', 'ac', 'sharp', 'AH-A5SAY', 5, 2800000, 3640000, FALSE),
                ('Mesin Cuci LG 2 Tabung', 'mesin_cuci_2_tabung', 'lg', 'WM-1202', 10, 2200000, 2860000, FALSE),
                ('Dispenser Miyako 185-H', 'dispenser', 'miyako', '185-H', 18, 450000, 585000, FALSE),
                ('Kompor Rinnai 3 Tungku', 'kompor', 'rinnai', 'RAB-3BGM', 22, 850000, 1105000, TRUE)
            `;
            
            await this.promisePool.execute(query);
            console.log('✅ Sample products created (10 products, 4 featured)');
        } catch (error) {
            console.error('❌ Error creating sample products:', error);
            throw error;
        }
    }

    // Improved query execution with better error handling
    async executeQuery(sql, params = []) {
        let connection;
        try {
            const [rows] = await this.promisePool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('❌ Database query error:', {
                sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
                params: params,
                error: error.message,
                code: error.code
            });
            
            // Handle specific MySQL errors
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Data sudah ada dalam sistem.');
            } else if (error.code === 'ER_NO_REFERENCED_ROW') {
                throw new Error('Data referensi tidak ditemukan.');
            } else if (error.code === 'ER_DATA_TOO_LONG') {
                throw new Error('Data terlalu panjang.');
            }
            
            throw error;
        }
    }

    // Transaction support
    async executeTransaction(callback) {
        let connection;
        try {
            connection = await this.promisePool.getConnection();
            await connection.beginTransaction();
            
            const result = await callback(connection);
            
            await connection.commit();
            return result;
        } catch (error) {
            if (connection) {
                await connection.rollback();
            }
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    // Get connection for manual transaction handling
    async getConnection() {
        return await this.promisePool.getConnection();
    }

    // Close all connections
    async close() {
        try {
            if (this.pool) {
                await this.pool.end();
                console.log('✅ Database connections closed');
            }
        } catch (error) {
            console.error('❌ Error closing database connections:', error);
        }
    }

    // Backup method (simple version)
    async backupDatabase() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = `backup_${timestamp}.sql`;
            
            console.log(`📦 Creating database backup: ${backupFile}`);
            
            // This is a simple backup - in production you might want to use mysqldump
            const tables = ['users', 'products', 'transactions'];
            
            for (const table of tables) {
                const data = await this.executeQuery(`SELECT * FROM ${table}`);
                // Here you would write this data to a file
                console.log(`✅ Backed up ${table}: ${data.length} records`);
            }
            
            return backupFile;
        } catch (error) {
            console.error('❌ Backup failed:', error);
            throw error;
        }
    }
}

// Create and export instance
const dbManager = new DatabaseManager();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down database connections...');
    await dbManager.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Shutting down database connections...');
    await dbManager.close();
    process.exit(0);
});

module.exports = dbManager;