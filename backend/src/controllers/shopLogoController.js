const pool = require('../db');
const fs = require('fs');
const path = require('path');

/**
 * POST /api/shops/:shopId/logo
 * Requires: Seller Auth middleware
 */
async function uploadLogo(req, res, next) {
  try {
    const { shopId } = req.params;
    const sellerId = req.user?.id || req.seller?.id; // Adjust based on your auth middleware!

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // 1. Verify the shop belongs to this seller
    // CHANGE 'owner_id' below if your schema uses 'user_id' or 'seller_id'
    const { rows } = await pool.query(
      'SELECT id, logo_url FROM shops WHERE id = $1 AND owner_id = $2',
      [shopId, sellerId]
    );

    if (rows.length === 0) {
      // Clean up the uploaded file since the request is invalid
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Shop not found or you do not have permission' });
    }

    const oldLogoUrl = rows[0].logo_url;

    // 2. The new URL path (relative to the domain)
    const newLogoUrl = `/uploads/shops/logos/${req.file.filename}`;

    // 3. Update the database
    await pool.query(
      'UPDATE shops SET logo_url = $1, updated_at = NOW() WHERE id = $2',
      [newLogoUrl, shopId]
    );

    // 4. Delete the old logo file from disk
    if (oldLogoUrl && oldLogoUrl.includes('/uploads/shops/logos/')) {
      const oldFilePath = path.join(__dirname, '..', '..', oldLogoUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    res.json({
      message: 'Logo uploaded successfully',
      logo_url: newLogoUrl,
    });

  } catch (error) {
    // Clean up the uploaded file if the DB update fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}

/**
 * DELETE /api/shops/:shopId/logo
 */
async function removeLogo(req, res, next) {
  try {
    const { shopId } = req.params;
    const sellerId = req.user?.id || req.seller?.id; // Adjust based on your auth middleware!

    const { rows } = await pool.query(
      'SELECT id, logo_url FROM shops WHERE id = $1 AND owner_id = $2',
      [shopId, sellerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found or you do not have permission' });
    }

    const oldLogoUrl = rows[0].logo_url;

    await pool.query(
      'UPDATE shops SET logo_url = NULL, updated_at = NOW() WHERE id = $1',
      [shopId]
    );

    if (oldLogoUrl && oldLogoUrl.includes('/uploads/shops/logos/')) {
      const oldFilePath = path.join(__dirname, '..', '..', oldLogoUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    res.json({ message: 'Logo removed successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadLogo, removeLogo };