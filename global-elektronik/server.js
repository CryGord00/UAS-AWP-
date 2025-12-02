const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Import database manager
const dbManager = require('./config/database.js');

const app = express();

// ==================== MULTER CONFIGURATION ====================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'images', 'products');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('✅ Created upload directory:', uploadDir);
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = 'product-' + uniqueSuffix + fileExtension;
    console.log('📁 Generated filename:', fileName);
    cb(null, fileName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    console.log('✅ File type accepted:', file.mimetype);
    cb(null, true);
  } else {
    console.log('❌ File type rejected:', file.mimetype);
    cb(new Error('Hanya file gambar JPG, PNG, dan WEBP yang diizinkan.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: fileFilter
});

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.body || req.query);
  next();
});

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// ==================== AUTHENTICATION MIDDLEWARE ====================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token autentikasi tidak ditemukan.' 
    });
  }

  jwt.verify(token, 'secret_key_global_elektronik', (err, user) => {
    if (err) {
      console.log('❌ Token verification failed:', err.message);
      return res.status(403).json({ 
        success: false, 
        message: 'Token tidak valid atau telah kadaluarsa.' 
      });
    }
    req.user = user;
    console.log('✅ Token verified for user:', user.username);
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Akses ditolak. Hanya administrator yang dapat mengakses fitur ini.' 
    });
  }
  next();
}

// ==================== ROUTES ====================

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [result] = await dbManager.executeQuery('SELECT 1 as healthy');
    res.json({
      success: true,
      message: 'Server dan database berjalan dengan baik',
      timestamp: new Date().toISOString(),
      database: 'Connected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection error',
      error: error.message
    });
  }
});

// Debug endpoint untuk melihat user
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await dbManager.executeQuery('SELECT user_id, username, role FROM users');
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Login route
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    console.log('🔐 Login attempt:', { username, role });

    // Validasi input
    if (!username || !password || !role) {
      return res.status(400).json({ 
        success: false,
        message: 'Username, password, dan role harus diisi.' 
      });
    }

    // Cari user di database
    const query = 'SELECT user_id, username, password, role FROM users WHERE username = ?';
    console.log('🔍 Searching user:', username);
    
    const users = await dbManager.executeQuery(query, [username]);

    if (users.length === 0) {
      console.log('❌ User not found:', username);
      return res.status(400).json({ 
        success: false,
        message: 'Username tidak ditemukan.' 
      });
    }

    const user = users[0];
    
    // Verifikasi password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('❌ Invalid password for user:', username);
      return res.status(400).json({ 
        success: false,
        message: 'Password salah.' 
      });
    }

    // Verifikasi role
    if (user.role !== role) {
      console.log('❌ Role mismatch for user:', username, 'Expected:', role, 'Actual:', user.role);
      return res.status(400).json({ 
        success: false,
        message: `Role tidak sesuai. Akun ini terdaftar sebagai ${user.role === 'admin' ? 'Administrator' : 'Staff'}.` 
      });
    }

    // Buat token JWT
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        username: user.username, 
        role: user.role 
      },
      'secret_key_global_elektronik',
      { expiresIn: '24h' }
    );

    console.log('✅ Login SUCCESSFUL for user:', username, 'Role:', user.role);

    res.json({
      success: true,
      message: `Login berhasil! Selamat datang ${user.username}.`,
      token,
      role: user.role,
      username: user.username,
      userId: user.user_id
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Terjadi kesalahan server saat proses login.' 
    });
  }
});

// ==================== FEATURED PRODUCTS ROUTES ====================

// Get featured products untuk slideshow
app.get('/api/products/featured', authenticateToken, async (req, res) => {
  try {
    console.log('⭐ Fetching featured products for slideshow');
    
    const query = `
      SELECT product_id, name, jenis, merk, tipe_model, harga_jual, gambar 
      FROM products 
      WHERE is_featured = TRUE 
      ORDER BY product_id DESC 
      LIMIT 5
    `;
    
    const featuredProducts = await dbManager.executeQuery(query);
    
    console.log(`✅ Retrieved ${featuredProducts.length} featured products`);
    
    res.json({
      success: true,
      message: `Berhasil mengambil ${featuredProducts.length} produk featured.`,
      data: featuredProducts
    });
  } catch (error) {
    console.error('❌ Get featured products error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Terjadi kesalahan saat mengambil produk featured.' 
    });
  }
});

// Toggle featured status (admin only)
app.put('/api/products/:id/featured', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const { is_featured } = req.body;

    console.log('⭐ Toggle featured request - Product ID:', productId, 'Status:', is_featured);

    if (typeof is_featured !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Status featured harus boolean (true/false).'
      });
    }

    const existingProducts = await dbManager.executeQuery('SELECT * FROM products WHERE product_id = ?', [productId]);
    if (existingProducts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan.'
      });
    }

    const query = 'UPDATE products SET is_featured = ? WHERE product_id = ?';
    await dbManager.executeQuery(query, [is_featured, productId]);

    console.log('✅ Featured status updated successfully');

    res.json({
      success: true,
      message: `Produk berhasil ${is_featured ? 'ditambahkan ke' : 'dihapus dari'} slideshow featured.`,
      is_featured: is_featured
    });

  } catch (error) {
    console.error('❌ Update featured status error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengubah status featured produk.'
    });
  }
});

// ==================== USER MANAGEMENT ROUTES ====================

// Get all users
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('👥 Fetching users list by admin:', req.user.username);
    
    const query = `
      SELECT 
        user_id, 
        username, 
        role,
        created_at, 
        updated_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    
    const users = await dbManager.executeQuery(query);
    
    console.log(`✅ Retrieved ${users.length} users`);
    
    res.json({
      success: true,
      message: `Berhasil mengambil ${users.length} pengguna dari database.`,
      data: users
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Terjadi kesalahan database saat mengambil data pengguna.',
      error: error.message 
    });
  }
});

// Get user by ID
app.get('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID user tidak valid.'
      });
    }

    console.log('👤 Fetching user ID:', userId);

    const query = `
      SELECT 
        user_id, 
        username, 
        role
      FROM users 
      WHERE user_id = ?`;
    
    const users = await dbManager.executeQuery(query, [userId]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan.'
      });
    }

    res.json({
      success: true,
      message: 'Data user berhasil diambil.',
      data: users[0]
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengambil data user.'
    });
  }
});

// Add new user
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    console.log('👤 Add user request by admin:', req.user.username);

    // Validasi input
    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Semua field wajib diisi (username, password, role).'
      });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Username harus antara 3 hingga 50 karakter.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password harus minimal 6 karakter.'
      });
    }

    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role harus admin atau staff.'
      });
    }

    // Cek duplikasi username
    const existingUsers = await dbManager.executeQuery('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Username "${username}" sudah digunakan.`
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user baru
    const insertQuery = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
    
    const result = await dbManager.executeQuery(insertQuery, [
      username, 
      hashedPassword, 
      role
    ]);

    console.log('✅ User created successfully, ID:', result.insertId);

    res.status(201).json({
      success: true,
      message: `Pengguna "${username}" berhasil ditambahkan sebagai ${role}.`,
      userId: result.insertId
    });

  } catch (error) {
    console.error('❌ Add user error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Username sudah digunakan.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat menambahkan pengguna.',
      error: error.message
    });
  }
});

// Update user
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, password, role } = req.body;

    console.log('✏️ Update user request - ID:', userId, 'User:', req.user.username);

    if (!username || !role) {
      return res.status(400).json({
        success: false,
        message: 'Semua field wajib diisi.'
      });
    }

    const existingUsers = await dbManager.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan.'
      });
    }

    const duplicateUsers = await dbManager.executeQuery('SELECT * FROM users WHERE username = ? AND user_id != ?', [username, userId]);
    if (duplicateUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Username "${username}" sudah digunakan oleh user lain.`
      });
    }

    let updateQuery = 'UPDATE users SET username = ?, role = ?';
    let queryParams = [username, role];

    // Update password jika diisi
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password harus minimal 6 karakter.'
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      queryParams.push(hashedPassword);
    }

    updateQuery += ' WHERE user_id = ?';
    queryParams.push(userId);

    await dbManager.executeQuery(updateQuery, queryParams);

    console.log('✅ User updated successfully');

    res.json({
      success: true,
      message: `User "${username}" berhasil diperbarui.`
    });

  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengupdate user.'
    });
  }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('🗑️ Delete user request - ID:', userId, 'User:', req.user.username);

    const users = await dbManager.executeQuery('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan.'
      });
    }

    const user = users[0];

    // Cegah penghapusan diri sendiri
    if (parseInt(userId) === parseInt(req.user.userId)) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus akun sendiri.'
      });
    }

    const query = 'DELETE FROM users WHERE user_id = ?';
    await dbManager.executeQuery(query, [userId]);

    console.log('✅ User deleted successfully:', user.username);

    res.json({
      success: true,
      message: `User "${user.username}" berhasil dihapus.`
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat menghapus user.'
    });
  }
});

// ==================== PRODUCT MANAGEMENT ROUTES ====================

// Get all products dengan filtering dan pagination (VERSI PERBAIKAN)
app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        const {
            search,
            jenis,
            merk,
            page = 1,
            limit = 50,
            featured
        } = req.query;

        // 1. Buat klausa WHERE dan parameternya SATU KALI SAJA
        let whereClauses = [];
        let filterParams = [];

        if (search) {
            whereClauses.push('(name LIKE ? OR tipe_model LIKE ?)');
            const searchTerm = `%${search}%`;
            filterParams.push(searchTerm, searchTerm);
        }

        if (jenis) {
            whereClauses.push('jenis = ?');
            filterParams.push(jenis);
        }

        if (merk) {
            whereClauses.push('merk = ?');
            filterParams.push(merk);
        }

        if (featured !== undefined) {
            whereClauses.push('is_featured = ?');
            filterParams.push(featured === 'true');
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 2. Gunakan klausa WHERE yang sama untuk MENGHITUNG total produk
        const countQuery = `SELECT COUNT(*) as total FROM products ${whereString}`;
        const [countResult] = await dbManager.executeQuery(countQuery, filterParams);
        const total = countResult.total;

        // 3. Gunakan klausa WHERE yang sama untuk MENGAMBIL data produk
        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT product_id, name, jenis, merk, tipe_model, stok, 
                   harga_beli, harga_jual, gambar, is_featured,
                   created_at, updated_at
            FROM products
            ${whereString}
            ORDER BY name ASC
            LIMIT ? OFFSET ?
        `;
        
        // Gabungkan parameter filter dengan parameter pagination
        const dataParams = [...filterParams, parseInt(limit), offset];
        const products = await dbManager.executeQuery(dataQuery, dataParams);
        
        res.json({
            success: true,
            message: `Berhasil mengambil ${products.length} produk.`,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('❌ Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server saat mengambil data produk.'
        });
    }
});

// Get product by ID
app.get('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;
    
    if (!productId || isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'ID produk tidak valid.'
      });
    }

    console.log('📦 Fetching product ID:', productId);

    const query = 'SELECT * FROM products WHERE product_id = ?';
    const products = await dbManager.executeQuery(query, [productId]);

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan.'
      });
    }

    res.json({
      success: true,
      message: 'Data produk berhasil diambil.',
      data: products[0]
    });

  } catch (error) {
    console.error('❌ Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengambil data produk.'
    });
  }
});

// Add new product
app.post('/api/products', authenticateToken, requireAdmin, upload.single('gambar'), async (req, res) => {
  try {
    console.log('🆕 Add product request from:', req.user.username);
    console.log('📦 Product data:', req.body);
    console.log('📁 Uploaded file:', req.file);

    const { name, jenis, merk, tipe_model, stok, harga_beli, harga_jual } = req.body;

    // Validasi input
    const errors = [];
    
    if (!name || name.trim().length < 2) {
      errors.push('Nama produk harus diisi (minimal 2 karakter)');
    }
    
    if (!jenis) {
      errors.push('Jenis produk harus dipilih');
    }
    
    if (!merk) {
      errors.push('Merk produk harus dipilih');
    }
    
    if (!tipe_model || tipe_model.trim().length === 0) {
      errors.push('Tipe/model produk harus diisi');
    }
    
    const numericStok = parseInt(stok);
    if (isNaN(numericStok) || numericStok < 0) {
      errors.push('Stok harus berupa angka positif');
    }
    
    const numericHargaBeli = parseFloat(harga_beli.replace(/\D/g, ''));
    const numericHargaJual = parseFloat(harga_jual.replace(/\D/g, ''));
    
    if (isNaN(numericHargaBeli) || numericHargaBeli < 0) {
      errors.push('Harga beli harus berupa angka positif');
    }
    
    if (isNaN(numericHargaJual) || numericHargaJual < 0) {
      errors.push('Harga jual harus berupa angka positif');
    }
    
    if (numericHargaJual < numericHargaBeli) {
      errors.push('Harga jual tidak boleh kurang dari harga beli');
    }
    
    if (errors.length > 0) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Deleted uploaded file due to validation error');
      }
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: errors
      });
    }

    let gambarPath = '/images/products/default.jpg';
    if (req.file) {
      gambarPath = `/images/products/${req.file.filename}`;
      console.log('🖼️ Image path saved:', gambarPath);
    }

    console.log('💰 Prices - Beli:', numericHargaBeli, 'Jual:', numericHargaJual);

    const insertQuery = `
      INSERT INTO products (name, jenis, merk, tipe_model, stok, harga_beli, harga_jual, gambar, is_featured) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)
    `;
    
    console.log('🗃️ Executing database insert...');

    const result = await dbManager.executeQuery(insertQuery, [
      name.trim(), 
      jenis, 
      merk, 
      tipe_model.trim(), 
      numericStok, 
      numericHargaBeli, 
      numericHargaJual, 
      gambarPath
    ]);

    console.log('✅ Database insert successful, ID:', result.insertId);

    const newProduct = await dbManager.executeQuery('SELECT * FROM products WHERE product_id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: `Produk "${name}" berhasil ditambahkan.`,
      productId: result.insertId,
      data: newProduct[0]
    });

  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
      console.log('🗑️ Deleted uploaded file due to server error');
    }
    
    console.error('❌ Add product error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Produk dengan nama atau tipe yang sama sudah ada.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat menambahkan produk.'
    });
  }
});

// Update product
app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const { 
      name, 
      jenis, 
      merk, 
      tipe_model, 
      stok, 
      harga_beli, 
      harga_jual 
    } = req.body;
    
    console.log('✏️ Update product request - ID:', productId, 'User:', req.user.username);
    
    // Validation
    const errors = [];
    
    if (!name || name.trim().length < 2) {
      errors.push('Nama produk harus diisi (minimal 2 karakter)');
    }
    
    if (!jenis) {
      errors.push('Jenis produk harus dipilih');
    }
    
    if (!merk) {
      errors.push('Merk produk harus dipilih');
    }
    
    if (!tipe_model || tipe_model.trim().length === 0) {
      errors.push('Tipe/model produk harus diisi');
    }
    
    const numericStok = parseInt(stok);
    if (isNaN(numericStok) || numericStok < 0) {
      errors.push('Stok harus berupa angka positif');
    }
    
    const numericHargaBeli = parseFloat(harga_beli);
    const numericHargaJual = parseFloat(harga_jual);
    
    if (isNaN(numericHargaBeli) || numericHargaBeli < 0) {
      errors.push('Harga beli harus berupa angka positif');
    }
    
    if (isNaN(numericHargaJual) || numericHargaJual < 0) {
      errors.push('Harga jual harus berupa angka positif');
    }
    
    if (numericHargaJual < numericHargaBeli) {
      errors.push('Harga jual tidak boleh lebih rendah dari harga beli');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: errors
      });
    }
    
    // Check if product exists
    const existingProducts = await dbManager.executeQuery(
      'SELECT * FROM products WHERE product_id = ?', 
      [productId]
    );
    
    if (existingProducts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan.'
      });
    }
    
    // Check for duplicate name (excluding current product)
    const duplicateProducts = await dbManager.executeQuery(
      'SELECT * FROM products WHERE name = ? AND product_id != ?',
      [name.trim(), productId]
    );
    
    if (duplicateProducts.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Produk dengan nama "${name}" sudah ada.`
      });
    }
    
    // Update product
    const query = `
      UPDATE products 
      SET name = ?, jenis = ?, merk = ?, tipe_model = ?, 
          stok = ?, harga_beli = ?, harga_jual = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ?
    `;
    
    await dbManager.executeQuery(query, [
      name.trim(), 
      jenis, 
      merk, 
      tipe_model.trim(), 
      numericStok, 
      numericHargaBeli, 
      numericHargaJual, 
      productId
    ]);
    
    // Get updated product
    const updatedProducts = await dbManager.executeQuery(
      'SELECT * FROM products WHERE product_id = ?', 
      [productId]
    );
    
    console.log('✅ Product updated successfully');
    
    res.json({
      success: true,
      message: `Produk "${name}" berhasil diperbarui.`,
      data: updatedProducts[0]
    });
    
  } catch (error) {
    console.error('❌ Update product error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Produk dengan nama atau tipe yang sama sudah ada.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengupdate produk.'
    });
  }
});

// Delete product
app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('🗑️ Delete product request - ID:', productId, 'User:', req.user.username);

    if (!productId || isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'ID produk tidak valid.'
      });
    }

    const products = await dbManager.executeQuery('SELECT * FROM products WHERE product_id = ?', [productId]);
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan.'
      });
    }

    const product = products[0];

    if (product.gambar && 
        product.gambar !== '/images/products/default.jpg' && 
        product.gambar !== 'default.jpg') {
      const imagePath = path.join(__dirname, 'public', product.gambar);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('🗑️ Deleted product image:', imagePath);
      }
    }

    const query = 'DELETE FROM products WHERE product_id = ?';
    await dbManager.executeQuery(query, [productId]);

    console.log('✅ Product deleted successfully:', product.name);

    res.json({
      success: true,
      message: `Produk "${product.name}" berhasil dihapus.`,
      deletedProduct: {
        id: product.product_id,
        name: product.name,
        jenis: product.jenis,
        merk: product.merk
      }
    });

  } catch (error) {
    console.error('❌ Delete product error:', error);
    
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus produk karena masih terkait dengan data transaksi lainnya.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat menghapus produk.'
    });
  }
});

// ==================== STATIC FILE ROUTES ====================

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route untuk halaman admin dengan authentication
app.get('/admin/*', authenticateToken, requireAdmin, (req, res) => {
  const filePath = path.join(__dirname, 'public', req.path);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Halaman tidak ditemukan.');
  }
});

// Route untuk halaman staff dengan authentication
app.get('/staff/*', authenticateToken, (req, res) => {
  const filePath = path.join(__dirname, 'public', req.path);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Halaman tidak ditemukan.');
  }
});

// ==================== ERROR HANDLING ====================

// Multer error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File terlalu besar. Ukuran maksimum file adalah 2MB.'
      });
    }
  }
  
  if (error) {
    console.error('❌ Multer error:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat upload file.'
    });
  }
  
  next();
});

// 404 handler untuk API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint API tidak ditemukan.'
  });
});

// 404 handler untuk halaman
app.use('*', (req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Halaman Tidak Ditemukan - Global Elektronik</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 flex items-center justify-center min-h-screen">
        <div class="text-center">
            <h1 class="text-6xl font-bold text-gray-800 mb-4">404</h1>
            <h2 class="text-2xl font-semibold text-gray-600 mb-4">Halaman Tidak Ditemukan</h2>
            <p class="text-gray-500 mb-8">Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
            <a href="/" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                Kembali ke Beranda
            </a>
        </div>
    </body>
    </html>
  `);
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('🔥 Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal server.'
  });
});

// ==================== SERVER INITIALIZATION ====================

async function startServer() {
  try {
    console.log('🚀 Starting server...');
    
    // Tunggu database manager siap
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const isConnected = await dbManager.testConnection();
    if (!isConnected) {
      console.log('❌ Server cannot start without database connection');
      process.exit(1);
    }

    // Tunggu sedikit sebelum initialize database
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await dbManager.initializeDatabase();
    console.log('✅ Database initialized successfully');

    const MYSQLPORT= process.env.MYSQLPORT || 3000;
    app.listen(MYSQLPORT, () => {
      console.log(`🎉 Server berjalan di port ${MYSQLPORT}`);
      console.log(`📱 Akses aplikasi: http://localhost:${MYSQLPORT}`);
      console.log(`🔍 Health check: http://localhost:${MYSQLPORT}/api/health`);
      console.log(`👥 Debug users: http://localhost:${MYSQLPORT}/api/debug/users`);
      console.log(`⭐ Featured products: http://localhost:${MYSQLPORT}/api/products/featured`);
      console.log(`🔐 Login default:`);
      console.log(`   👑 Admin: username: admin, password: admin123`);
      console.log(`   👨‍💼 Staff: username: staff, password: staff123`);
      console.log('\n📊 Server ready to handle requests!');
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;